import { ApplicationError } from '../../common/errors/application-error.js';
import type { QueryExecutor } from '../../infrastructure/database/database.js';
import type { PayablesRepository } from '../payables/payables-repository.js';
import { DfeApiError, type DfeApiClient, type DfeEntry } from './dfe-api-client.js';
import { NfeXmlError, parseNfeXml } from './nfe-xml-parser.js';

type Outcome = 'imported' | 'duplicate' | 'skipped' | 'invalid';
export interface DfeSyncLogger { info(obj: object, msg: string): void; warn(obj: object, msg: string): void; error(obj: object, msg: string): void }
export interface DfeSyncDeps {
  database: QueryExecutor;
  importer: Pick<PayablesRepository, 'createXmlImport'>;
  client: Pick<DfeApiClient, 'listCompanies' | 'listEntries' | 'downloadXml' | 'confirm'>;
  userId: string;
  pageSize: number;
  maxPagesPerCompany?: number;
  logger: DfeSyncLogger;
}
export interface DfeSyncSummary { companies: number; imported: number; duplicates: number; skipped: number; invalid: number; failedCompanies: number }

// Traz as NF-e de entrada (procNFe) da API do DFe para financeiro.xml_imports, por empresa e em ordem de NSU.
// Idempotente (duplicata por chave = ok), serializado e sem gerar conta a pagar: a nota entra como RECEIVED para revisao.
export class DfeSyncService {
  private running = false;

  constructor(private readonly deps: DfeSyncDeps) {}

  async runOnce(): Promise<DfeSyncSummary | null> {
    if (this.running) return null;
    this.running = true;
    const summary: DfeSyncSummary = { companies: 0, imported: 0, duplicates: 0, skipped: 0, invalid: 0, failedCompanies: 0 };
    try {
      for (const cnpj of await this.registeredCompanies()) {
        summary.companies += 1;
        if (!await this.syncCompany(cnpj, summary)) summary.failedCompanies += 1;
      }
      return summary;
    } finally {
      this.running = false;
    }
  }

  private async registeredCompanies(): Promise<string[]> {
    const authorized = (await this.deps.client.listCompanies()).filter((cnpj) => /^\d{14}$/.test(cnpj));
    if (!authorized.length) return [];
    const result = await this.deps.database.query<{ document_number: string }>(
      `SELECT document_number FROM cadastros.companies WHERE document_number = ANY($1::text[]) AND is_active AND deleted_at IS NULL ORDER BY document_number`,
      [authorized],
    );
    return result.rows.map((row) => row.document_number);
  }

  private async syncCompany(cnpj: string, summary: DfeSyncSummary): Promise<boolean> {
    const { database, client, logger } = this.deps;
    await database.query(`INSERT INTO integracoes.dfe_sync_cursors (company_document_number) VALUES ($1) ON CONFLICT DO NOTHING`, [cnpj]);
    await database.query(`UPDATE integracoes.dfe_sync_cursors SET last_run_at=CURRENT_TIMESTAMP WHERE company_document_number=$1`, [cnpj]);
    let cursor = (await database.query<{ last_nsu: string }>(`SELECT last_nsu FROM integracoes.dfe_sync_cursors WHERE company_document_number=$1`, [cnpj])).rows[0]!.last_nsu;
    let invalid = 0;
    try {
      for (let page = 0; page < (this.deps.maxPagesPerCompany ?? 20); page += 1) {
        const batch = await client.listEntries(cnpj, cursor, this.deps.pageSize);
        for (const entry of batch.items) {
          const outcome = await this.importEntry(cnpj, entry);
          if (outcome === 'imported') summary.imported += 1;
          else if (outcome === 'duplicate') summary.duplicates += 1;
          else if (outcome === 'skipped') summary.skipped += 1;
          else { summary.invalid += 1; invalid += 1; }
          // O cursor so avanca depois de a nota ser tratada; falha de rede/banco interrompe sem pular nada.
          await database.query(
            `UPDATE integracoes.dfe_sync_cursors SET last_nsu=$2, imported_count=imported_count+$3, updated_at=CURRENT_TIMESTAMP WHERE company_document_number=$1`,
            [cnpj, entry.nsu, outcome === 'imported' ? 1 : 0],
          );
          cursor = entry.nsu;
        }
        if (batch.items.length) await client.confirm(cnpj, cursor).catch((error: unknown) => logger.warn({ cnpj, err: this.safeMessage(error) }, 'DFe sync: confirmacao de NSU falhou'));
        if (!batch.tem_mais || !batch.items.length) break;
      }
      await database.query(
        `UPDATE integracoes.dfe_sync_cursors SET last_success_at=CURRENT_TIMESTAMP, last_error=$2 WHERE company_document_number=$1`,
        [cnpj, invalid ? `${invalid} documento(s) invalido(s) ignorado(s); veja o log da API` : null],
      );
      return true;
    } catch (error) {
      const message = this.safeMessage(error);
      logger.error({ cnpj, nsu: cursor, err: message }, 'DFe sync: empresa interrompida; retoma do ultimo NSU tratado');
      await database.query(`UPDATE integracoes.dfe_sync_cursors SET last_error=$2 WHERE company_document_number=$1`, [cnpj, message.slice(0, 500)]);
      return false;
    }
  }

  private async importEntry(cnpj: string, entry: DfeEntry): Promise<Outcome> {
    const { logger } = this.deps;
    // Falha ao obter o XML (404/5xx/rede) propaga: o cursor nao passa por uma nota que ainda pode ficar disponivel.
    // 404: o DFe pode listar o procNFe antes de o portal liberar o XML completo; aguarda e tenta de novo na proxima rodada.
    const xml = await this.deps.client.downloadXml(cnpj, entry.chave).catch((error: unknown) => {
      if (error instanceof DfeApiError && error.status === 404) throw new DfeApiError(404, `XML ainda indisponivel no DFe (NSU ${entry.nsu}); aguardando nova tentativa`);
      throw error;
    });
    let input;
    try {
      input = parseNfeXml(xml);
    } catch (error) {
      if (!(error instanceof NfeXmlError)) throw error;
      logger.error({ cnpj, nsu: entry.nsu, chave: entry.chave, err: error.message }, 'DFe sync: XML invalido ignorado');
      return 'invalid';
    }
    if (input.accessKey !== entry.chave) {
      logger.error({ cnpj, nsu: entry.nsu, chave: entry.chave }, 'DFe sync: chave do XML diverge da listagem; ignorado');
      return 'invalid';
    }
    if (input.recipientDocumentNumber !== cnpj) return 'skipped'; // empresa nao e a destinataria (ex.: transportadora)
    try {
      await this.deps.importer.createXmlImport(input, this.deps.userId, { importSource: 'DFE_API' });
      return 'imported';
    } catch (error) {
      if (error instanceof ApplicationError && error.code === 'XML_IMPORT_DUPLICATE') return 'duplicate';
      if (error instanceof ApplicationError && error.code === 'XML_IMPORT_COMPANY_REQUIRED') return 'skipped';
      throw error;
    }
  }

  // Mensagens de erro nunca carregam corpo de resposta, XML nem credenciais.
  private safeMessage(error: unknown): string {
    if (error instanceof DfeApiError || error instanceof ApplicationError || error instanceof NfeXmlError) return error.message;
    return error instanceof Error ? error.name : 'erro desconhecido';
  }
}
