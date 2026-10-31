import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PayablesRepository } from '../../src/domains/payables/payables-repository.js';
import { IntelligenceRepository } from '../../src/domains/intelligence/intelligence-repository.js';
import type { Database, QueryExecutor } from '../../src/infrastructure/database/database.js';

const suite = process.env.RUN_DATABASE_INTEGRATION === 'true' ? describe : describe.skip;
suite('Payable cancellation with real PostgreSQL', () => {
  let pool: Pool;
  let client: PoolClient;
  let repository: PayablesRepository;
  let intelligence: IntelligenceRepository;
  let userId: string;
  const titleId = randomUUID();
  const document = `cancel-test-${titleId}`;
  beforeAll(async () => {
    pool = new Pool({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), database: process.env.DB_NAME, user: process.env.DB_USER, password: process.env.DB_PASSWORD });
    client = await pool.connect();
    await client.query('BEGIN');
    const query = async <Row extends Record<string, unknown>>(sql: string, values: readonly unknown[] = []): Promise<{ rows: Row[]; rowCount: number }> => {
      const result = await client.query<Row>(sql, [...values]);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    };
    const database = { query, transaction: async <T>(work: (tx: QueryExecutor) => Promise<T>): Promise<T> => work({ query }) } as Database;
    repository = new PayablesRepository(database);
    intelligence = new IntelligenceRepository(database);
    userId = randomUUID();
    const supplierId = randomUUID(), companyId = randomUUID(), categoryId = randomUUID();
    await client.query(`INSERT INTO administracao.users(id,full_name,email,password_hash,is_master) VALUES($1,'Cancellation test',$2,'test-only',true)`, [userId, `${userId}@test.local`]);
    await client.query(`INSERT INTO cadastros.companies(id,company_type,legal_name,document_number,created_by,updated_by) VALUES($1,'MAIN','Cancellation test','99999999999001',$2,$2)`, [companyId, userId]);
    await client.query(`INSERT INTO cadastros.suppliers(id,supplier_type,legal_name,document_number,status_id,supplier_category_id,created_by,updated_by)
      VALUES($1,'COMPANY','Cancellation test','99999999999002',(SELECT id FROM cadastros.supplier_statuses WHERE code='ACTIVE'),(SELECT id FROM cadastros.supplier_categories WHERE code='SUPPLIER'),$2,$2)`, [supplierId, userId]);
    await client.query(`INSERT INTO cadastros.financial_categories(id,code,name,nature_code,created_by,updated_by) VALUES($1,$2,'Cancellation test','EXPENSE',$3,$3)`, [categoryId, titleId.slice(0, 20), userId]);
    await client.query(`INSERT INTO financeiro.payable_titles(id,supplier_id,category_id,document_type_id,document_number,description,issue_date,original_amount,status_id,created_by,updated_by,company_id)
      VALUES($1,$2,$3,(SELECT id FROM cadastros.document_types WHERE code='INVOICE'),$4,'Cancellation regression',CURRENT_DATE,100,
      (SELECT id FROM financeiro.payable_title_statuses WHERE code='OPEN'),$5,$5,$6)`, [titleId, supplierId, categoryId, document, userId, companyId]);
    await client.query(`INSERT INTO financeiro.payable_installments(payable_title_id,installment_number,installment_count,amount,due_date,payment_method_id,open_balance,status_id,created_by,updated_by)
      VALUES($1,1,1,100,CURRENT_DATE,(SELECT id FROM cadastros.payment_methods WHERE code='PIX'),100,(SELECT id FROM financeiro.payable_installment_statuses WHERE code='OPEN'),$2,$2)`, [titleId, userId]);

  });
  afterAll(async () => {
    if (client) { await client.query('ROLLBACK'); client.release(); }
    await pool?.end();
  });
  it('removes the cancelled title from the agenda and retains its audited history', async () => {
    const date = (await client.query<{ value: string }>('SELECT CURRENT_DATE::text value')).rows[0]!.value;
    const before = await intelligence.agenda({ from: date, to: date }) as { data: { payableTitleId: string }[] };
    expect(before.data.some(row => row.payableTitleId === titleId)).toBe(true);
    await repository.cancelTitle(titleId, 'Lançamento duplicado', userId);
    const after = await intelligence.agenda({ from: date, to: date }) as { data: { payableTitleId: string }[] };
    expect(after.data.some(row => row.payableTitleId === titleId)).toBe(false);
    const stored = await client.query<{ is_active: boolean; code: string }>(`SELECT t.is_active,s.code FROM financeiro.payable_titles t JOIN financeiro.payable_title_statuses s ON s.id=t.status_id WHERE t.id=$1`, [titleId]);
    expect(stored.rows[0]).toMatchObject({ is_active: false, code: 'CANCELLED' });
    const listed = await repository.list(1, 20, { search: document, recurrenceStatus: 'ALL' }) as { data: unknown[] };
    expect(listed.data).toHaveLength(0);
    const history = await repository.list(1, 20, { search: document, status: 'CANCELLED' }) as { data: unknown[] };
    expect(history.data).toHaveLength(1);
  });
});
