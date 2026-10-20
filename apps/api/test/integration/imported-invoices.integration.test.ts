import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import JSZip from 'jszip';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { ImportedInvoicesService, type InvoiceScope } from '../../src/domains/intelligence/imported-invoices-service.js';
import { buildApp } from '../../src/presentation/http/build-app.js';
import { loadEnvironment } from '../../src/config/environment.js';
import { TokenService } from '../../src/domains/auth/token-service.js';
import type { DatabaseHealth, QueryExecutor, Database } from '../../src/infrastructure/database/database.js';

const suite = process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;
suite('Imported invoices with real PostgreSQL', () => {
  let pool: Pool;
  let service: ImportedInvoicesService;
  let database: Database;
  const userId = randomUUID(), companyA = randomUUID(), companyB = randomUUID();
  const noteA = randomUUID(), missing = randomUUID(), noteB = randomUUID(), october = randomUUID();
  const scope: InvoiceScope = { id: userId, companyIds: [companyA] };
  const filters = { from: '2026-09-01', to: '2026-09-30' };
  const raw = '<?xml version="1.0" encoding="UTF-8"?><nfeProc><NFe><nome>Teste &amp; ação</nome></NFe></nfeProc>';
  beforeAll(async () => {
    pool = new Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD, max: 4, options: '-c timezone=America/Sao_Paulo' });
    database = {
      query: async <Row extends Record<string, unknown>>(sql: string, values: readonly unknown[] = []): Promise<{ rows: Row[]; rowCount: number }> => { const result = await pool.query<Row>(sql, [...values]); return { rows: result.rows, rowCount: result.rowCount ?? 0 }; },
      transaction: async <T>(work: (tx: QueryExecutor) => Promise<T>): Promise<T> => { const client = await pool.connect(); try { await client.query('BEGIN'); const result = await work({ query: async <Row extends Record<string, unknown>>(sql: string, values: readonly unknown[] = []): Promise<{ rows: Row[]; rowCount: number }> => { const queried = await client.query<Row>(sql, [...values]); return { rows: queried.rows, rowCount: queried.rowCount ?? 0 }; } }); await client.query('COMMIT'); return result; } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); } },
      checkHealth: (): Promise<DatabaseHealth> => Promise.resolve({ database: 'test', latencyMs: 0, serverTime: new Date().toISOString() }), close: (): Promise<void> => Promise.resolve(),
    };
    service = new ImportedInvoicesService(database, { maxNotes: 500, maxBytes: 20971520, retentionHours: 48 });
    await pool.query(`INSERT INTO administracao.users(id,full_name,email,password_hash,is_master) VALUES($1,'Invoice integration',$2,'test-only',true)`, [userId, `${userId}@test.local`]);
    for (const [id, name] of [[companyA, 'Invoice A'], [companyB, 'Invoice B']]) {
      const document = (BigInt('0x' + randomUUID().replaceAll('-', '').slice(0, 11)) % 100000000000000n).toString().padStart(14, '0');
      await pool.query(`INSERT INTO cadastros.companies(id,company_type,legal_name,document_number) VALUES($1,'MAIN',$2,$3)`, [id, name, document]);
    }
    for (const [id, company, issued, xml] of [[noteA, companyA, '2026-09-29', raw], [missing, companyA, '2026-09-30', ''], [noteB, companyB, '2026-09-29', raw], [october, companyA, '2026-10-01', raw]]) {
      await pool.query(`INSERT INTO financeiro.xml_imports(id,company_id,status_id,imported_by,raw_xml,issue_date,imported_at,document_number,invoice_total_amount)
        VALUES($1,$2,(SELECT id FROM financeiro.xml_import_statuses WHERE code='RECEIVED'),$3,$4,$5,'2026-10-01T00:24:00Z',$6,12.34)`, [id, company, userId, xml, issued, id]);
    }
  });
  afterAll(async () => {
    if (!pool) return;
    await pool.query(`DELETE FROM financeiro.xml_export_packages WHERE created_by=$1`, [userId]);
    await pool.query(`DELETE FROM administracao.audit_events WHERE user_id=$1`, [userId]);
    await pool.query(`DELETE FROM financeiro.xml_imports WHERE imported_by=$1`, [userId]);
    await pool.query(`DELETE FROM cadastros.companies WHERE id=ANY($1::uuid[])`, [[companyA, companyB]]);
    await pool.query(`DELETE FROM administracao.auth_sessions WHERE user_id=$1`, [userId]);
    await pool.query(`DELETE FROM administracao.users WHERE id=$1`, [userId]);
    await pool.end();
  });
  it('uses invoice date, authorized companies and full-result totals independently of pagination', async () => {
    const result = await service.report(filters, scope, 1, 1) as { summary: { noteCount: number; invoiceAmount: string; companyCount: number }; data: { companyId: string }[] };
    expect(result.summary).toMatchObject({ noteCount: 2, invoiceAmount: '24.68', companyCount: 1 });
    expect(result.data).toHaveLength(1);
    expect(result.data[0]?.companyId).toBe(companyA);
    await expect(service.report({ ...filters, companyId: companyB }, scope, 1, 20)).rejects.toMatchObject({ statusCode: 403 });
    await expect(service.preview({ ...filters, ids: [noteB] }, scope)).rejects.toMatchObject({ code: 'INVALID_SELECTION' });
    const empty = await service.report(filters, { ...scope, companyIds: [] }, 1, 20) as { summary: { noteCount: number } };
    expect(empty.summary.noteCount).toBe(0);
  });
  it('requires partial confirmation, verifies ZIP contents and makes concurrent generation idempotent', async () => {
    const preview = await service.preview(filters, scope) as { id: string; includedCount: number; unavailableCount: number };
    expect(preview).toMatchObject({ includedCount: 1, unavailableCount: 1 });
    await expect(service.generate(preview.id, scope, false)).rejects.toMatchObject({ code: 'PARTIAL_EXPORT_CONFIRMATION' });
    await Promise.all([service.generate(preview.id, scope, true), service.generate(preview.id, scope, true)]);
    const first = await service.download(preview.id, scope);
    const zip = await JSZip.loadAsync(first, { checkCRC32: true });
    const xmlPaths = Object.keys(zip.files).filter(path => path.endsWith('.xml'));
    expect(xmlPaths).toHaveLength(1);
    expect(await zip.file(xmlPaths[0]!)!.async('string')).toBe(raw);
    const manifest = JSON.parse(await zip.file('manifesto.json')!.async('string')) as { includedCount: number; omitted: unknown[] };
    expect(manifest.includedCount).toBe(1); expect(manifest.omitted).toHaveLength(1);
    await Promise.all([service.generate(preview.id, scope, true), service.generate(preview.id, scope, true)]);
    expect(await service.download(preview.id, scope)).toEqual(first);
    const events = await pool.query(`SELECT count(*)::int total FROM administracao.audit_events WHERE entity_id=$1 AND action_code='GENERATED'`, [preview.id]);
    expect(events.rows[0]).toMatchObject({ total: 1 });
    await expect(service.download(preview.id, { ...scope, companyIds: [] })).rejects.toMatchObject({ statusCode: 403 });
  });
  it('invalidates a preview when a note changes and does not make a partial artifact available', async () => {
    const preview = await service.preview({ ...filters, ids: [noteA] }, scope) as { id: string };
    await pool.query(`UPDATE financeiro.xml_imports SET invoice_total_amount=99 WHERE id=$1`, [noteA]);
    await expect(service.generate(preview.id, scope, false)).rejects.toMatchObject({ code: 'PREVIEW_CHANGED' });
    await expect(service.download(preview.id, scope)).rejects.toMatchObject({ code: 'XML_EXPORT_NOT_READY' });
    const row = await pool.query(`SELECT status,archive_data FROM financeiro.xml_export_packages WHERE id=$1`, [preview.id]);
    expect(row.rows[0]).toMatchObject({ status: 'FAILED', archive_data: null });
  });
  it('enforces count and byte limits before creating packages', async () => {
    const small = new ImportedInvoicesService(database, { maxNotes: 1, maxBytes: 20971520, retentionHours: 48 });
    await expect(small.preview(filters, scope)).rejects.toMatchObject({ code: 'XML_EXPORT_LIMIT' });
    const tiny = new ImportedInvoicesService(database, { maxNotes: 500, maxBytes: 1, retentionHours: 48 });
    await expect(tiny.preview({ ...filters, ids: [noteA] }, scope)).rejects.toMatchObject({ code: 'XML_EXPORT_LIMIT' });
  });
  it('protects real HTTP routes, exposes no-store ZIP downloads and applies current permissions', async () => {
    const environment = loadEnvironment({ ...process.env, TZ: 'America/Sao_Paulo', SMTP_ENABLED: 'false', AUTH_ACCESS_TOKEN_SECRET: 'integration-secret-with-at-least-32-characters' });
    const app = buildApp({ database, environment, logger: false });
    const sessionId = randomUUID();
    await pool.query(`INSERT INTO administracao.auth_sessions(id,user_id,refresh_token_hash,expires_at) VALUES($1,$2,$3,CURRENT_TIMESTAMP+interval '1 hour')`, [sessionId, userId, randomUUID()]);
    const headers = { authorization: `Bearer ${new TokenService(environment).createAccessToken(userId, sessionId)}` };
    try {
      expect((await app.inject({ url: '/api/v1/reports/imported-invoices?from=2026-09-01&to=2026-09-30' })).statusCode).toBe(401);
      const report = await app.inject({ url: `/api/v1/reports/imported-invoices?from=2026-09-01&to=2026-09-30&companyId=${companyA}`, headers });
      expect(report.statusCode).toBe(200);
      expect(report.json<{ summary: { noteCount: number } }>().summary.noteCount).toBe(2);
      const preview = await app.inject({ method: 'POST', url: '/api/v1/xml-exports/preview', headers, payload: { ...filters, companyId: companyA, ids: [noteA] } });
      expect(preview.statusCode).toBe(200);
      const id = preview.json<{ id: string }>().id;
      expect((await app.inject({ method: 'POST', url: `/api/v1/xml-exports/${id}/generate`, headers, payload: { allowPartial: false } })).statusCode).toBe(200);
      const download = await app.inject({ url: `/api/v1/xml-exports/${id}/download`, headers });
      expect(download.statusCode).toBe(200);
      expect(download.headers['cache-control']).toBe('no-store');
      expect(download.headers['content-type']).toContain('application/zip');
      await JSZip.loadAsync(download.rawPayload, { checkCRC32: true });
      await pool.query(`UPDATE administracao.users SET is_master=false WHERE id=$1`, [userId]);
      expect((await app.inject({ url: '/api/v1/reports/imported-invoices?from=2026-09-01&to=2026-09-30', headers })).statusCode).toBe(403);
      await pool.query(`UPDATE administracao.users SET is_master=true WHERE id=$1`, [userId]);
      expect((await app.inject({ method: 'DELETE', url: `/api/v1/xml-exports/${id}`, headers })).statusCode).toBe(204);
      expect((await app.inject({ url: `/api/v1/xml-exports/${id}/download`, headers })).statusCode).toBe(410);
    } finally { await pool.query(`UPDATE administracao.users SET is_master=true WHERE id=$1`, [userId]); await app.close(); }
  });
  it('rejects expired packages and cleans their payload, without erasing history', async () => {
    const preview = await service.preview({ ...filters, ids: [noteA] }, scope) as { id: string };
    await service.generate(preview.id, scope, false);
    await pool.query(`UPDATE financeiro.xml_export_packages SET created_at=CURRENT_TIMESTAMP-interval '2 hours',expires_at=CURRENT_TIMESTAMP-interval '1 hour' WHERE id=$1`, [preview.id]);
    await expect(service.download(preview.id, scope)).rejects.toMatchObject({ statusCode: 410 });
    await service.cleanup();
    const row = await pool.query(`SELECT status,archive_data,snapshot FROM financeiro.xml_export_packages WHERE id=$1`, [preview.id]);
    expect(row.rows[0]).toMatchObject({ status: 'EXPIRED', archive_data: null, snapshot: [] });
  });
});
