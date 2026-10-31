import { describe, expect, it, vi } from 'vitest';
import { ApplicationError } from '../src/common/errors/application-error.js';
import { DfeApiClient, DfeApiError, type DfeEntry } from '../src/domains/integrations/dfe-api-client.js';
import { DfeSyncService } from '../src/domains/integrations/dfe-sync-service.js';
import { loadEnvironment } from '../src/config/environment.js';

const CNPJ = '00123456000190';
const key = (n: number): string => `3526101122233300018155001000000${String(n).padStart(3, '0')}1000000001`.slice(0, 44);
const nfe = (chave: string, dest = CNPJ): string => `<nfeProc><NFe><infNFe Id="NFe${chave}"><ide><mod>55</mod><nNF>1</nNF><dhEmi>2026-10-08T10:00:00-03:00</dhEmi></ide>
<emit><CNPJ>11222333000181</CNPJ><xNome>Forn</xNome></emit><dest><CNPJ>${dest}</CNPJ><xNome>Dest</xNome></dest>
<total><ICMSTot><vNF>10.00</vNF></ICMSTot></total></infNFe></NFe></nfeProc>`;
const entry = (n: number): DfeEntry => ({ chave: key(n), nsu: String(n).padStart(15, '0'), emitente_cnpj: '11222333000181', data_emissao: null });

type Statement = { sql: string; values: readonly unknown[] };
interface SetupOptions {
  entries?: DfeEntry[];
  xml?: (chave: string) => string | Promise<string>;
  create?: () => Promise<object>;
  registered?: string[];
  hasMore?: boolean;
}

function setup(options: SetupOptions = {}): { service: DfeSyncService; statements: Statement[]; client: Record<string, ReturnType<typeof vi.fn>>; importer: { createXmlImport: ReturnType<typeof vi.fn> }; logger: Record<string, ReturnType<typeof vi.fn>> } {
  const statements: Statement[] = [];
  const database = { query: vi.fn((sql: string, values: readonly unknown[] = []) => {
    statements.push({ sql, values });
    if (sql.includes('FROM cadastros.companies')) return Promise.resolve({ rows: (options.registered ?? [CNPJ]).map((document_number) => ({ document_number })), rowCount: 1 });
    if (sql.includes('SELECT last_nsu')) return Promise.resolve({ rows: [{ last_nsu: '000000000000000' }], rowCount: 1 });
    return Promise.resolve({ rows: [], rowCount: 0 });
  }) };
  const client = {
    listCompanies: vi.fn(() => Promise.resolve([CNPJ, '99999999000191'])),
    listEntries: vi.fn(() => Promise.resolve({ items: options.entries ?? [], proximo_nsu: '0', tem_mais: options.hasMore ?? false })),
    downloadXml: vi.fn((_cnpj: string, chave: string) => Promise.resolve(options.xml ? options.xml(chave) : nfe(chave))),
    confirm: vi.fn(() => Promise.resolve()),
  };
  const importer = { createXmlImport: vi.fn(options.create ?? ((): Promise<object> => Promise.resolve({}))) };
  const logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const service = new DfeSyncService({ database: database as never, importer: importer, client: client, userId: 'user-1', pageSize: 100, logger });
  return { service, statements, client, importer, logger };
}
const cursorUpdates = (statements: Statement[]): unknown[][] => statements.filter((x) => x.sql.includes('SET last_nsu=')).map((x) => [...x.values]);
const rejects = (error: Error) => (): Promise<object> => Promise.reject(error);

describe('DfeSyncService', () => {
  it('importa com origem DFE_API, avanca o cursor por nota e confirma o ultimo NSU', async () => {
    const t = setup({ entries: [entry(1), entry(2)] });
    const summary = await t.service.runOnce();
    expect(summary).toMatchObject({ companies: 1, imported: 2, duplicates: 0, failedCompanies: 0 });
    expect(t.importer.createXmlImport).toHaveBeenCalledTimes(2);
    const call = t.importer.createXmlImport.mock.calls[0] as unknown as unknown[];
    expect(call[1]).toBe('user-1');
    expect(call[2]).toEqual({ importSource: 'DFE_API' });
    expect(cursorUpdates(t.statements)).toEqual([[CNPJ, entry(1).nsu, 1], [CNPJ, entry(2).nsu, 1]]);
    expect(t.client.confirm).toHaveBeenCalledWith(CNPJ, entry(2).nsu);
    expect(t.client.listEntries).toHaveBeenCalledWith(CNPJ, '000000000000000', 100);
  });

  it('so sincroniza empresas autorizadas no DFe E cadastradas no FinControl', async () => {
    const t = setup({ registered: [] });
    expect(await t.service.runOnce()).toMatchObject({ companies: 0 });
    expect(t.client.listEntries).not.toHaveBeenCalled();
    const lookup = t.statements.find((s) => s.sql.includes('FROM cadastros.companies'))!;
    expect(lookup.values[0]).toEqual([CNPJ, '99999999000191']);
  });

  it('duplicata por chave conta como ja importada e nao e erro', async () => {
    const t = setup({ entries: [entry(1)], create: rejects(new ApplicationError({ code: 'XML_IMPORT_DUPLICATE', message: 'dup', statusCode: 409 })) });
    expect(await t.service.runOnce()).toMatchObject({ imported: 0, duplicates: 1, failedCompanies: 0 });
    expect(cursorUpdates(t.statements)).toEqual([[CNPJ, entry(1).nsu, 0]]);
  });

  it('ignora nota cuja destinataria nao e a empresa, e XML invalido, e segue adiante', async () => {
    const t = setup({ entries: [entry(1), entry(2), entry(3)], xml: (chave) => chave === key(1) ? nfe(chave, '55555555000155') : chave === key(2) ? '<x/>' : nfe(chave) });
    expect(await t.service.runOnce()).toMatchObject({ imported: 1, skipped: 1, invalid: 1, failedCompanies: 0 });
    expect(t.importer.createXmlImport).toHaveBeenCalledTimes(1);
    expect(t.logger.error).toHaveBeenCalledWith(expect.objectContaining({ chave: key(2) }), expect.any(String));
  });

  it('chave do XML diferente da listagem e ignorada', async () => {
    const t = setup({ entries: [entry(1)], xml: () => nfe(key(9)) });
    expect(await t.service.runOnce()).toMatchObject({ imported: 0, invalid: 1 });
  });

  it('falha ao baixar XML interrompe a empresa SEM avancar o cursor alem da ultima nota tratada', async () => {
    const t = setup({ entries: [entry(1), entry(2), entry(3)], xml: (chave) => chave === key(2) ? Promise.reject(new DfeApiError(404, 'DFe API respondeu 404')) : nfe(chave) });
    expect(await t.service.runOnce()).toMatchObject({ imported: 1, failedCompanies: 1 });
    expect(cursorUpdates(t.statements)).toEqual([[CNPJ, entry(1).nsu, 1]]);
    expect(t.statements.some((s) => s.sql.includes('SET last_error=$2') && (s.values[1] as string).startsWith('XML ainda indisponivel no DFe'))).toBe(true);
    expect(t.client.confirm).not.toHaveBeenCalled();
  });

  it('erro inesperado nao vaza detalhes na mensagem registrada', async () => {
    const t = setup({ entries: [entry(1)], create: rejects(new Error('senha=segredo host=interno')) });
    await t.service.runOnce();
    const saved = t.statements.find((s) => s.sql.includes('SET last_error=$2'))!;
    expect(saved.values[1]).toBe('Error');
  });

  it('pagina enquanto tem_mais e respeita o limite de paginas', async () => {
    const t = setup({ entries: [entry(1)], hasMore: true });
    await t.service.runOnce();
    expect(t.client.listEntries).toHaveBeenCalledTimes(20);
  });

  it('nao executa duas rodadas ao mesmo tempo', async () => {
    let release!: () => void;
    const t = setup({ entries: [entry(1)], xml: (chave) => new Promise<string>((resolve) => { release = (): void => resolve(nfe(chave)); }) });
    const first = t.service.runOnce();
    await vi.waitFor(() => expect(t.client.downloadXml).toHaveBeenCalled());
    expect(await t.service.runOnce()).toBeNull();
    release();
    expect(await first).toMatchObject({ imported: 1 });
  });
});

describe('DfeApiClient', () => {
  const make = (fetchImpl: typeof fetch): DfeApiClient => new DfeApiClient({ baseUrl: 'http://127.0.0.1:8000/', apiKey: 'k'.repeat(40), timeoutMs: 1000, fetchImpl });

  it('envia a chave no header, monta URLs e le o XML como texto', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(new Response('<x/>', { status: 200 })));
    const client = make(fetchImpl);
    expect(await client.downloadXml(CNPJ, key(1))).toBe('<x/>');
    await client.listEntries(CNPJ, '5', 10).catch(() => undefined);
    const calls = fetchImpl.mock.calls as unknown as Array<[string, RequestInit]>;
    expect(calls[0]![0]).toBe(`http://127.0.0.1:8000/api/integracao/v1/empresas/${CNPJ}/nfe-entrada/${key(1)}/xml`);
    expect(calls[1]![0]).toContain('apos_nsu=5&limite=10');
    expect((calls[0]![1].headers as Record<string, string>)['X-DFE-Integracao-Key']).toBe('k'.repeat(40));
  });

  it('erro HTTP vira DfeApiError sem expor corpo nem chave', async () => {
    const client = make((() => Promise.resolve(new Response('corpo sensivel', { status: 401 }))));
    const error = await client.listCompanies().catch((e: unknown) => e) as DfeApiError;
    expect(error).toBeInstanceOf(DfeApiError);
    expect(error.status).toBe(401);
    expect(error.message).toBe('DFe API respondeu 401');
  });
});

describe('configuracao do conector', () => {
  const base = { DB_HOST: 'h', DB_PORT: '5432', DB_NAME: 'n', DB_USER: 'u', DB_PASSWORD: 'p', AUTH_ACCESS_TOKEN_SECRET: 'x'.repeat(32) };
  it('fica desligado por padrao e exige URL, chave e usuario quando ligado', () => {
    expect(loadEnvironment(base).DFE_SYNC_ENABLED).toBe(false);
    expect(() => loadEnvironment({ ...base, DFE_SYNC_ENABLED: 'true' })).toThrow(/DFE_API_BASE_URL/);
    expect(loadEnvironment({ ...base, DFE_SYNC_ENABLED: 'true', DFE_API_BASE_URL: 'http://127.0.0.1:8000', DFE_API_KEY: 'k'.repeat(40), DFE_SYNC_USER_ID: '0b4e1c52-6b36-4c6f-8a52-2b0f6a1d7c11' }).DFE_SYNC_INTERVAL_SECONDS).toBe(300);
  });
  it('rejeita chave curta', () => {
    expect(() => loadEnvironment({ ...base, DFE_API_KEY: 'curta' })).toThrow(/DFE_API_KEY/);
  });
});
