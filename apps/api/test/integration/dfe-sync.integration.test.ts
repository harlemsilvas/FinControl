import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { DfeSyncService } from '../../src/domains/integrations/dfe-sync-service.js';
import { PayablesRepository } from '../../src/domains/payables/payables-repository.js';
import type { DatabaseHealth, QueryExecutor, Database } from '../../src/infrastructure/database/database.js';

const suite = process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;
const randomCnpj = (): string => (BigInt('0x' + randomUUID().replaceAll('-', '').slice(0, 11)) % 100000000000000n).toString().padStart(14, '0');

suite('DFe sync with real PostgreSQL', () => {
  let pool: Pool;
  let database: Database;
  const userId = randomUUID(), companyId = randomUUID(), otherCompanyId = randomUUID();
  const companyDoc = randomCnpj(), otherDoc = randomCnpj(), supplierDoc = randomCnpj();
  const key = (n: number): string => `${'3526'}${supplierDoc}${'55001'}${String(n).padStart(9, '0')}${'1'}${'00000000'}`.slice(0, 44).padEnd(44, '0');
  const xml = (chave: string, dest: string): string => `<nfeProc><NFe><infNFe Id="NFe${chave}"><ide><mod>55</mod><serie>1</serie><nNF>${chave.slice(30, 36)}</nNF><dhEmi>2026-10-08T10:00:00-03:00</dhEmi></ide>
<emit><CNPJ>${supplierDoc}</CNPJ><xNome>Fornecedor DFe Teste</xNome></emit><dest><CNPJ>${dest}</CNPJ><xNome>Destino</xNome></dest>
<total><ICMSTot><vProd>10.00</vProd><vNF>10.00</vNF></ICMSTot></total><cobr><dup><nDup>1</nDup><dVenc>2026-11-08</dVenc><vDup>10.00</vDup></dup></cobr></infNFe></NFe></nfeProc>`;

  beforeAll(async () => {
    pool = new Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, max: 4, options: '-c timezone=America/Sao_Paulo' });
    const exec = async <Row extends Record<string, unknown>>(client: Pool | { query: Pool['query'] }, sql: string, values: readonly unknown[]): Promise<{ rows: Row[]; rowCount: number }> => {
      const result = await client.query<Row>(sql, [...values]); return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    };
    database = {
      query: <Row extends Record<string, unknown>>(sql: string, values: readonly unknown[] = []): Promise<{ rows: Row[]; rowCount: number }> => exec<Row>(pool, sql, values),
      transaction: async <T>(work: (tx: QueryExecutor) => Promise<T>): Promise<T> => {
        const client = await pool.connect();
        try { await client.query('BEGIN'); const result = await work({ query: <Row extends Record<string, unknown>>(sql: string, values: readonly unknown[] = []) => exec<Row>(client, sql, values) }); await client.query('COMMIT'); return result; }
        catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
      },
      checkHealth: (): Promise<DatabaseHealth> => Promise.resolve({ database: 'test', latencyMs: 0, serverTime: new Date().toISOString() }), close: (): Promise<void> => Promise.resolve(),
    };
    await pool.query(`INSERT INTO administracao.users(id,full_name,email,password_hash,is_master) VALUES($1,'DFe sync integration',$2,'test-only',true)`, [userId, `${userId}@test.local`]);
    for (const [id, doc] of [[companyId, companyDoc], [otherCompanyId, otherDoc]]) {
      await pool.query(`INSERT INTO cadastros.companies(id,company_type,legal_name,document_number) VALUES($1,'MAIN','DFe sync test',$2)`, [id, doc]);
    }
  });

  afterAll(async () => {
    if (!pool) return;
    const ids = (await pool.query<{ id: string }>(`SELECT id FROM financeiro.xml_imports WHERE company_id=ANY($1)`, [[companyId, otherCompanyId]])).rows.map((row) => row.id);
    await pool.query(`DELETE FROM administracao.audit_events WHERE entity_name='XML_IMPORT' AND entity_id=ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM financeiro.xml_import_installments WHERE xml_import_id=ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM financeiro.xml_imports WHERE id=ANY($1::uuid[])`, [ids]);
    await pool.query(`DELETE FROM cadastros.suppliers WHERE document_number=$1`, [supplierDoc]);
    await pool.query(`DELETE FROM integracoes.dfe_sync_cursors WHERE company_document_number=ANY($1)`, [[companyDoc, otherDoc]]);
    await pool.end();
  });

  it('importa como DFE_API, e idempotente, mantem cursor e nao altera a origem MANUAL', async () => {
    const entries = [1, 2].map((n) => ({ chave: key(n), nsu: String(n).padStart(15, '0'), emitente_cnpj: supplierDoc, data_emissao: null }));
    const client = {
      listCompanies: vi.fn(() => Promise.resolve([companyDoc, otherDoc])),
      listEntries: vi.fn((_cnpj: string, after: string) => Promise.resolve({ items: entries.filter((entry) => entry.nsu > after), proximo_nsu: '0', tem_mais: false })),
      downloadXml: vi.fn((_cnpj: string, chave: string) => Promise.resolve(xml(chave, companyDoc))),
      confirm: vi.fn(() => Promise.resolve()),
    };
    const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
    const repository = new PayablesRepository(database);
    const service = new DfeSyncService({ database, importer: repository, client: client, userId, pageSize: 100, logger });

    const first = await service.runOnce();
    expect(first).toMatchObject({ companies: 2, imported: 2, duplicates: 0, failedCompanies: 0 });
    const rows = await pool.query<{ import_source: string; generated_title_id: string | null }>(`SELECT import_source,generated_title_id FROM financeiro.xml_imports WHERE company_id=$1 ORDER BY access_key`, [companyId]);
    expect(rows.rows.map((row) => [row.import_source, row.generated_title_id])).toEqual([['DFE_API', null], ['DFE_API', null]]);
    const cursor = await pool.query<{ last_nsu: string; imported_count: number; last_error: string | null }>(`SELECT last_nsu,imported_count::int imported_count,last_error FROM integracoes.dfe_sync_cursors WHERE company_document_number=$1`, [companyDoc]);
    expect(cursor.rows[0]).toEqual({ last_nsu: '000000000000002', imported_count: 2, last_error: null });
    expect(client.confirm).toHaveBeenCalledWith(companyDoc, '000000000000002');

    // 2a rodada: parte do cursor, nada novo. Zerar o cursor reapresenta as notas: duplicata por chave nao duplica.
    expect(await service.runOnce()).toMatchObject({ imported: 0, duplicates: 0 });
    await pool.query(`UPDATE integracoes.dfe_sync_cursors SET last_nsu='000000000000000' WHERE company_document_number=$1`, [companyDoc]);
    expect(await service.runOnce()).toMatchObject({ imported: 0, duplicates: 2, failedCompanies: 0 });
    expect((await pool.query<{ total: number }>(`SELECT count(*)::int total FROM financeiro.xml_imports WHERE company_id=$1`, [companyId])).rows[0]!.total).toBe(2);

    // Importacao manual (sem opcoes) continua gravando MANUAL.
    await repository.createXmlImport({ ...{ rawXml: xml(key(3), companyDoc), accessKey: key(3), recipientDocumentNumber: companyDoc, supplierDocumentNumber: supplierDoc, supplierLegalName: 'Fornecedor DFe Teste' } }, userId);
    expect((await pool.query<{ import_source: string }>(`SELECT import_source FROM financeiro.xml_imports WHERE access_key=$1`, [key(3)])).rows[0]!.import_source).toBe('MANUAL');
  });

  it('isolamento por empresa: nota destinada a outra empresa nao entra na empresa errada', async () => {
    const chave = key(9);
    const client = {
      listCompanies: vi.fn(() => Promise.resolve([companyDoc])),
      listEntries: vi.fn((_cnpj: string, after: string) => Promise.resolve({ items: after < '000000000000009' ? [{ chave, nsu: '000000000000009', emitente_cnpj: supplierDoc, data_emissao: null }] : [], proximo_nsu: '0', tem_mais: false })),
      downloadXml: vi.fn(() => Promise.resolve(xml(chave, otherDoc))),
      confirm: vi.fn(() => Promise.resolve()),
    };
    const service = new DfeSyncService({ database, importer: new PayablesRepository(database), client: client, userId, pageSize: 100, logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } });
    expect(await service.runOnce()).toMatchObject({ imported: 0, skipped: 1 });
    expect((await pool.query<{ total: number }>(`SELECT count(*)::int total FROM financeiro.xml_imports WHERE access_key=$1`, [chave])).rows[0]!.total).toBe(0);
  });
});
