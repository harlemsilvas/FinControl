import { randomUUID } from 'node:crypto';
import type { Database, QueryExecutor } from '../../infrastructure/database/database.js';
import { ApplicationError } from '../../common/errors/application-error.js';
import { buildInvoiceArchive, sha256, snapshot, type InvoiceRow, type InvoiceSnapshot } from './invoice-archive.js';

export interface InvoiceFilters { from: string; to: string; companyId?: string; search?: string; ids?: string[] }
export interface InvoiceScope { id: string; companyIds: string[] }
export interface InvoiceLimits { maxNotes: number; maxBytes: number; retentionHours: number }
interface PackageRow extends Record<string, unknown> {
  id: string; created_by: string; status: string; expires_at: Date; created_at: Date;
  filters: InvoiceFilters; snapshot: InvoiceSnapshot[]; company_ids: string[];
  total_count: number; included_count: number; unavailable_count: number; source_bytes: string;
  archive_bytes: number | null; archive_sha256: string | null; archive_data?: Buffer | null;
  failure_code: string | null;
}
const fromSql = `FROM financeiro.xml_imports x JOIN cadastros.companies c ON c.id=x.company_id
 WHERE x.deleted_at IS NULL AND x.import_source='MANUAL' AND c.deleted_at IS NULL AND c.is_active
 AND x.issue_date BETWEEN $1::date AND $2::date AND ($3::uuid IS NULL OR x.company_id=$3)
 AND x.company_id=ANY($4::uuid[]) AND ($5::text IS NULL OR
 (x.document_number ILIKE $5 OR x.document_series ILIKE $5 OR x.supplier_legal_name ILIKE $5
 OR x.supplier_document_number ILIKE $5 OR x.access_key ILIKE $5))
 AND ($6::uuid[] IS NULL OR x.id=ANY($6::uuid[]))`;
const columns = `x.id,x.company_id "companyId",c.legal_name "companyName",c.document_number "companyDocument",
 x.document_number "documentNumber",x.document_series "documentSeries",x.issue_date::text "issueDate",
 x.supplier_legal_name "supplierName",x.supplier_document_number "supplierDocument",x.access_key "accessKey",
 x.invoice_total_amount::text "invoiceAmount",COALESCE(octet_length(x.raw_xml),0) "sourceBytes",
 encode(sha256(convert_to(x.raw_xml,'UTF8')),'hex') "sourceHash",
 (x.raw_xml IS NOT NULL AND btrim(x.raw_xml)<>'') "xmlAvailable"`;
function fail(code: string, message: string, statusCode = 400): never { throw new ApplicationError({ code, message, statusCode }); }
export class ImportedInvoicesService {
  constructor(private readonly database: Database, private readonly limits: InvoiceLimits) {}

  private values(filters: InvoiceFilters, scope: InvoiceScope): unknown[] {
    if (filters.companyId && !scope.companyIds.includes(filters.companyId)) fail('FORBIDDEN', 'Empresa não autorizada.', 403);
    return [filters.from, filters.to, filters.companyId ?? null, scope.companyIds, filters.search ? `%${filters.search}%` : null, filters.ids ?? null];
  }
  private async rows(tx: QueryExecutor, filters: InvoiceFilters, scope: InvoiceScope, raw = false): Promise<InvoiceRow[]> {
    const values = this.values(filters, scope);
    // Bound metadata first, before fetching XML payloads into memory.
    const result = await tx.query<InvoiceRow>(`SELECT ${columns} ${fromSql} ORDER BY x.issue_date,x.id LIMIT $7`, [...values, this.limits.maxNotes + 1]);
    if (result.rows.length > this.limits.maxNotes) fail('XML_EXPORT_LIMIT', `Limite de ${this.limits.maxNotes} notas por pacote. Reduza o período.`);
    if (raw && result.rows.reduce((sum, row) => sum + row.sourceBytes, 0) > this.limits.maxBytes) fail('XML_EXPORT_LIMIT', 'O volume de XMLs excede o limite do pacote. Reduza o período.');
    if (filters.ids && (new Set(filters.ids).size !== filters.ids.length || result.rows.length !== filters.ids.length)) fail('INVALID_SELECTION', 'Seleção indisponível, fora dos filtros ou não autorizada.', 409);
    if (!raw || !result.rows.length) return result.rows;
    const payloads = await tx.query<{ id: string; raw_xml: string | null } & Record<string, unknown>>(`SELECT id,raw_xml FROM financeiro.xml_imports WHERE id=ANY($1::uuid[]) FOR SHARE`, [result.rows.map(row => row.id)]);
    return result.rows.map(row => {
      const rawXml = payloads.rows.find(item => item.id === row.id)?.raw_xml;
      if ((rawXml == null ? null : sha256(rawXml)) !== row.sourceHash) fail('PREVIEW_CHANGED', 'As notas mudaram. Gere uma nova prévia.', 409);
      return { ...row, rawXml };
    });
  }
  async report(filters: InvoiceFilters, scope: InvoiceScope, page: number, pageSize: number): Promise<object> {
    return this.database.transaction(async tx => {
      await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ, READ ONLY');
      const values = this.values(filters, scope);
      const summary = await tx.query(`SELECT count(*)::int "noteCount",count(*) FILTER (WHERE x.invoice_total_amount IS NULL)::int "missingAmountCount",COALESCE(sum(x.invoice_total_amount),0)::text "invoiceAmount",
        count(DISTINCT x.company_id)::int "companyCount",count(*) FILTER (WHERE x.raw_xml IS NOT NULL AND btrim(x.raw_xml)<>'')::int "availableCount" ${fromSql}`, values);
      const groups = await tx.query(`SELECT x.company_id "companyId",c.legal_name "companyName",count(*)::int "noteCount",COALESCE(sum(x.invoice_total_amount),0)::text "invoiceAmount"
        ${fromSql} GROUP BY x.company_id,c.legal_name ORDER BY c.legal_name,x.company_id`, values);
      const rows = await tx.query<InvoiceRow>(`SELECT ${columns} ${fromSql} ORDER BY x.issue_date DESC,x.id LIMIT $7 OFFSET $8`, [...values, pageSize, (page - 1) * pageSize]);
      return { summary: summary.rows[0], byCompany: groups.rows, data: rows.rows, page, pageSize, limits: this.limits };
    });
  }
  async exportData(filters: InvoiceFilters, scope: InvoiceScope): Promise<object> {
    return this.database.transaction(async tx => {
      await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const data = await this.rows(tx, filters, scope);
      await this.audit(tx, randomUUID(), scope.id, 'REPORT_EXPORTED', { count: data.length, from: filters.from, to: filters.to });
      const summary = await tx.query(`SELECT count(*)::int "noteCount",count(*) FILTER (WHERE x.invoice_total_amount IS NULL)::int "missingAmountCount",COALESCE(sum(x.invoice_total_amount),0)::text "invoiceAmount",count(DISTINCT x.company_id)::int "companyCount",count(*) FILTER (WHERE x.raw_xml IS NOT NULL AND btrim(x.raw_xml)<>'')::int "availableCount" ${fromSql}`, this.values(filters, scope));
      const groups = await tx.query(`SELECT x.company_id "companyId",c.legal_name "companyName",count(*)::int "noteCount",COALESCE(sum(x.invoice_total_amount),0)::text "invoiceAmount" ${fromSql} GROUP BY x.company_id,c.legal_name ORDER BY c.legal_name,x.company_id`, this.values(filters, scope));
      return { data, summary: summary.rows[0], byCompany: groups.rows };
    });
  }
  async cleanup(): Promise<void> {
    await this.database.query(`UPDATE financeiro.xml_export_packages SET status='EXPIRED',archive_data=NULL,snapshot='[]'::jsonb
      WHERE id IN (SELECT id FROM financeiro.xml_export_packages WHERE expires_at<=CURRENT_TIMESTAMP AND status<>'EXPIRED' ORDER BY expires_at LIMIT 100)`);
  }
  async preview(filters: InvoiceFilters, scope: InvoiceScope): Promise<object> {
    return this.database.transaction(async tx => {
      await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const count = await tx.query<{ total: number } & Record<string, unknown>>(`SELECT count(*)::int total FROM financeiro.xml_export_packages WHERE created_by=$1 AND expires_at>CURRENT_TIMESTAMP AND status IN ('PREVIEW','READY')`, [scope.id]);
      if ((count.rows[0]?.total ?? 0) >= 20) fail('XML_EXPORT_LIMIT', 'Limite de 20 pacotes ativos. Aguarde a expiração dos pacotes anteriores.');
      const rows = await this.rows(tx, filters, scope, true);
      if (!rows.length) fail('EMPTY_EXPORT', 'Nenhuma nota encontrada para exportação.');
      const captured = snapshot(rows);
      const included = captured.filter(item => item.available).length;
      const id = randomUUID();
      const result = await tx.query<PackageRow>(`INSERT INTO financeiro.xml_export_packages
        (id,created_by,expires_at,filters,snapshot,company_ids,total_count,included_count,unavailable_count,source_bytes)
        VALUES($1,$2,CURRENT_TIMESTAMP+($3::int*interval '1 hour'),$4::jsonb,$5::jsonb,$6,$7,$8,$9,$10) RETURNING *`,
      [id, scope.id, this.limits.retentionHours, JSON.stringify(filters), JSON.stringify(captured), [...new Set(rows.map(row => row.companyId))], rows.length, included, rows.length - included, rows.reduce((sum, row) => sum + row.sourceBytes, 0)]);
      await this.audit(tx, id, scope.id, 'PREVIEW_CREATED', { count: rows.length, included });
      return { ...this.publicPackage(result.rows[0]!), unavailable: captured.filter(item => !item.available).map(item => ({ id: item.id, documentNumber: rows.find(row => row.id === item.id)?.documentNumber, reason: item.reason })) };
    });
  }
  private async getPackage(tx: QueryExecutor, id: string, scope: InvoiceScope, lock = false, payload = false): Promise<PackageRow> {
    const result = await tx.query<PackageRow>(`SELECT id,created_by,created_at,expires_at,status,filters,snapshot,company_ids,total_count,included_count,unavailable_count,source_bytes,archive_bytes,archive_sha256,failure_code${payload ? ',archive_data' : ''}
      FROM financeiro.xml_export_packages WHERE id=$1 AND created_by=$2 ${lock ? 'FOR UPDATE' : ''}`, [id, scope.id]);
    const row = result.rows[0];
    if (!row) fail('RESOURCE_NOT_FOUND', 'Pacote não encontrado.', 404);
    if (row.company_ids.some(company => !scope.companyIds.includes(company))) fail('FORBIDDEN', 'Acesso às empresas do pacote não autorizado.', 403);
    if (row.expires_at.getTime() <= Date.now() || row.status === 'EXPIRED') fail('XML_EXPORT_EXPIRED', 'Pacote expirado. Gere uma nova prévia.', 410);
    return row;
  }
  async generate(id: string, scope: InvoiceScope, allowPartial: boolean): Promise<object> {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try { return await this.generateOnce(id, scope, allowPartial); }
      catch (error) {
        const retryable = typeof error === 'object' && error !== null && 'code' in error && (error.code === '40001' || error.code === '40P01');
        if (!retryable || attempt === 2) throw error;
      }
    }
    throw new Error('Unreachable generation state');
  }
  private async generateOnce(id: string, scope: InvoiceScope, allowPartial: boolean): Promise<object> {
    const result = await this.database.transaction(async tx => {
      await tx.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ');
      const row = await this.getPackage(tx, id, scope, true);
      if (row.status === 'READY') return this.publicPackage(row);
      if (row.status !== 'PREVIEW') fail('XML_EXPORT_FAILED', 'Pacote inválido. Gere uma nova prévia.', 409);
      if (!row.included_count) fail('EMPTY_EXPORT', 'Não há XMLs disponíveis neste pacote.');
      if (row.unavailable_count && !allowPartial) fail('PARTIAL_EXPORT_CONFIRMATION', 'Confirme a exportação somente dos XMLs disponíveis.', 409);
      const lock = await tx.query<{ acquired: boolean } & Record<string, unknown>>('SELECT pg_try_advisory_xact_lock(20770020,1) acquired');
      if (!lock.rows[0]?.acquired) fail('XML_EXPORT_BUSY', 'Outro pacote está sendo gerado. Tente novamente em instantes.', 409);
      try {
        const rows = await this.rows(tx, { ...row.filters, ids: row.snapshot.map(item => item.id) }, scope, true);
        if (snapshot(rows).some((item, index) => { const previous = row.snapshot[index]; return !previous || item.id !== previous.id || item.fingerprint !== previous.fingerprint || item.available !== previous.available || item.reason !== previous.reason; }) || rows.length !== row.snapshot.length) fail('PREVIEW_CHANGED', 'As notas mudaram. Gere uma nova prévia.', 409);
        const availableIds = new Set(row.snapshot.filter(item => item.available).map(item => item.id));
        const archive = await buildInvoiceArchive(id, rows.filter(item => availableIds.has(item.id)), row.filters, row.snapshot.filter(item => !item.available));
        const saved = await tx.query<PackageRow>(`UPDATE financeiro.xml_export_packages SET status='READY',archive_data=$2,archive_sha256=$3,archive_bytes=$4,generated_at=CURRENT_TIMESTAMP WHERE id=$1 RETURNING *`, [id, archive.bytes, archive.hash, archive.bytes.length]);
        await this.audit(tx, id, scope.id, 'GENERATED', { count: row.included_count, bytes: archive.bytes.length, sha256: archive.hash, partial: row.unavailable_count > 0 });
        return this.publicPackage(saved.rows[0]!);
      } catch (error) {
        // No raw XML or provider details are stored in failure messages.
        if (!(error instanceof ApplicationError) && typeof error === 'object' && error !== null && 'code' in error) throw error;
        const code = error instanceof ApplicationError ? error.code : 'XML_EXPORT_GENERATION_FAILED';
        await tx.query(`UPDATE financeiro.xml_export_packages SET status='FAILED',failure_code=$2 WHERE id=$1`, [id, code]);
        await this.audit(tx, id, scope.id, 'FAILED', { code });
        return { failure: code };
      }
    });
    if ('failure' in result) fail(String(result.failure), 'O pacote não pôde ser gerado. Gere uma nova prévia.', 409);
    return result;
  }
  async discard(id: string, scope: InvoiceScope): Promise<void> {
    await this.database.transaction(async tx => {
      await this.getPackage(tx, id, scope, true);
      await tx.query(`UPDATE financeiro.xml_export_packages SET status='EXPIRED',archive_data=NULL,snapshot='[]'::jsonb WHERE id=$1`, [id]);
      await this.audit(tx, id, scope.id, 'DISCARDED', {});
    });
  }
  async history(scope: InvoiceScope, page: number): Promise<object> {
    const values = [scope.id, scope.companyIds];
    const where = 'WHERE created_by=$1 AND company_ids <@ $2::uuid[]';
    const count = await this.database.query<{ total: number } & Record<string, unknown>>(`SELECT count(*)::int total FROM financeiro.xml_export_packages ${where}`, values);
    const rows = await this.database.query<PackageRow>(`SELECT id,created_by,created_at,expires_at,status,filters,company_ids,total_count,included_count,unavailable_count,source_bytes,archive_bytes,archive_sha256,failure_code FROM financeiro.xml_export_packages ${where} ORDER BY created_at DESC,id DESC LIMIT 20 OFFSET $3`, [...values, (page - 1) * 20]);
    return { data: rows.rows.map(row => this.publicPackage(row)), total: count.rows[0]?.total ?? 0, page, pageSize: 20 };
  }
  async download(id: string, scope: InvoiceScope): Promise<Buffer> {
    return this.database.transaction(async tx => {
      const row = await this.getPackage(tx, id, scope, true, true);
      if (row.status !== 'READY' || !row.archive_data) fail('XML_EXPORT_NOT_READY', 'Pacote não disponível para download.', 409);
      if (sha256(row.archive_data) !== row.archive_sha256) fail('XML_EXPORT_INTEGRITY', 'Integridade do pacote não confirmada. Gere outro pacote.', 409);
      await this.audit(tx, id, scope.id, 'DOWNLOAD_REQUESTED', { bytes: row.archive_bytes });
      return row.archive_data;
    });
  }
  private publicPackage(row: PackageRow): Record<string, unknown> {
    return { id: row.id, createdAt: row.created_at, expiresAt: row.expires_at, status: row.expires_at.getTime() <= Date.now() ? 'EXPIRED' : row.status, filters: row.filters,
      companyIds: row.company_ids, totalCount: row.total_count, includedCount: row.included_count, unavailableCount: row.unavailable_count,
      sourceBytes: Number(row.source_bytes), archiveBytes: row.archive_bytes, sha256: row.archive_sha256, failureCode: row.failure_code };
  }
  private async audit(tx: QueryExecutor, id: string, userId: string, action: string, metadata: object): Promise<void> {
    await tx.query(`INSERT INTO administracao.audit_events(domain_code,entity_name,entity_id,action_code,user_id,source_code,new_data)
      VALUES('DOM-005','XML_EXPORT_PACKAGE',$1,$2,$3,'API',$4::jsonb)`, [id, action, userId, JSON.stringify(metadata)]);
  }
}
