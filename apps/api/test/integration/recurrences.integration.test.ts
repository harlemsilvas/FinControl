import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Database, QueryExecutor } from '../../src/infrastructure/database/database.js';
import { PayablesRepository } from '../../src/domains/payables/payables-repository.js';

const enabled = process.env.RUN_DATABASE_INTEGRATION === 'true';
const suite = enabled ? describe : describe.skip;

function executorFromClient(client: PoolClient): QueryExecutor {
  return {
    query: async <Row extends Record<string, unknown>>(text: string, values: readonly unknown[] = []): Promise<{ rows: Row[]; rowCount: number }> => {
      const result = await client.query<Row>(text, [...values]);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    },
  };
}

function dateOnly(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
}

function requireId<Row extends { id: string }>(result: { rows: Row[] }, label: string): string {
  const id = result.rows[0]?.id;
  if (!id) throw new Error(`Missing integration fixture: ${label}`);
  return id;
}

suite('Recurrence integration with real PostgreSQL', () => {
  let pool: Pool;

  beforeAll(() => {
    pool = new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 4,
      application_name: 'fincontrol-recurrence-integration-tests',
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  it('creates, previews and generates recurrence titles while updating the next occurrence', async () => {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const tx = executorFromClient(client);
      const database: Database = {
        query: <Row extends Record<string, unknown>>(text: string, values?: readonly unknown[]) => tx.query<Row>(text, values),
        checkHealth: () => Promise.resolve({ database: process.env.DB_NAME!, latencyMs: 0, serverTime: new Date().toISOString() }),
        close: () => Promise.resolve(),
        transaction: <T>(work: (executor: QueryExecutor) => Promise<T>): Promise<T> => work(tx),
      };
      const repo = new PayablesRepository(database);

      const suffix = Date.now().toString().slice(-8);
      const userId = requireId(await client.query<{ id: string }>(
        `INSERT INTO administracao.users (full_name,email,password_hash,is_master)
         VALUES ($1,$2,$3,true)
         RETURNING id`,
        [`Usuario Integracao Recorrencia ${suffix}`, `recurrence-${randomUUID()}@fincontrol.local`, 'test-only'],
      ), 'user');
      const supplierStatusId = requireId(await client.query<{ id: string }>(
        `SELECT id FROM cadastros.supplier_statuses WHERE code='ACTIVE' AND is_active LIMIT 1`,
      ), 'supplier status ACTIVE');
      const supplierCategoryId = requireId(await client.query<{ id: string }>(
        `SELECT id FROM cadastros.supplier_categories WHERE code='SUPPLIER' AND is_active AND deleted_at IS NULL LIMIT 1`,
      ), 'supplier category SUPPLIER');
      const companyId = requireId(await client.query<{ id: string }>(
        `INSERT INTO cadastros.companies
           (company_type,legal_name,trade_name,document_number,created_by,updated_by)
         VALUES ('MAIN',$1,$2,$3,$4,$4)
         RETURNING id`,
        [`Empresa Integracao Recorrencia ${suffix}`, `Empresa Teste ${suffix}`, `990000${suffix}`, userId],
      ), 'company');
      const supplierId = requireId(await client.query<{ id: string }>(
        `INSERT INTO cadastros.suppliers
           (supplier_type,legal_name,document_number,status_id,supplier_category_id,is_approved,created_by,updated_by)
         VALUES ('COMPANY',$1,$2,$3,$4,true,$5,$5)
         RETURNING id`,
        [`Fornecedor Integracao Recorrencia ${suffix}`, `980000${suffix}`, supplierStatusId, supplierCategoryId, userId],
      ), 'supplier');
      const categoryId = requireId(await client.query<{ id: string }>(
        `INSERT INTO cadastros.financial_categories (code,name,nature_code,created_by,updated_by)
         VALUES ($1,$2,'EXPENSE',$3,$3)
         RETURNING id`,
        [`REC_INT_${suffix}`, `Categoria Integracao Recorrencia ${suffix}`, userId],
      ), 'financial category');
      const costCenterId = requireId(await client.query<{ id: string }>(
        `INSERT INTO cadastros.cost_centers (code,name,created_by,updated_by)
         VALUES ($1,$2,$3,$3)
         RETURNING id`,
        [`REC_CC_${suffix}`, `Centro Integracao Recorrencia ${suffix}`, userId],
      ), 'cost center');
      const documentTypeId = requireId(await client.query<{ id: string }>(
        `SELECT id FROM cadastros.document_types WHERE code='INVOICE' AND is_active LIMIT 1`,
      ), 'document type INVOICE');
      const paymentMethodId = requireId(await client.query<{ id: string }>(
        `SELECT id FROM cadastros.payment_methods WHERE code='PIX' AND is_active LIMIT 1`,
      ), 'payment method PIX');
      const paymentTermId = requireId(await client.query<{ id: string }>(
        `SELECT id FROM cadastros.payment_terms WHERE code='IMMEDIATE' AND is_active LIMIT 1`,
      ), 'payment term IMMEDIATE');

      const recurrence = await repo.createRecurrence({
        companyId,
        supplierId,
        categoryId,
        costCenterId,
        documentTypeId,
        paymentMethodId,
        paymentTermId,
        description: `Recorrencia integracao ${randomUUID()}`,
        baseDocumentNumber: `REC-${Date.now()}`,
        baseAmount: 321.45,
        frequencyCode: 'MONTHLY',
        startDate: '2026-08-05',
        endDate: '2026-12-05',
        dueDay: 5,
        isOpenEnded: false,
        notes: 'Teste de integração com rollback.',
      }, userId) as { id: string; nextOccurrenceDate: string | null };

      expect(recurrence.id).toBeTruthy();
      expect(dateOnly(recurrence.nextOccurrenceDate)).toBe('2026-08-05');

      const preview = await repo.previewRecurrenceGeneration(recurrence.id, { occurrenceCount: 2 }, userId) as {
        total: number;
        occurrences: { occurrenceDate: string; dueDate: string; sequenceNumber: number; amount: number }[];
      };
      expect(preview.total).toBe(2);
      expect(preview.occurrences[0]).toMatchObject({
        occurrenceDate: '2026-08-05',
        dueDate: '2026-08-05',
        sequenceNumber: 1,
        amount: 321.45,
      });
      expect(preview.occurrences[1]).toMatchObject({
        occurrenceDate: '2026-09-05',
        dueDate: '2026-09-05',
        sequenceNumber: 2,
        amount: 321.45,
      });

      const generation = await repo.generateRecurrenceTitles(recurrence.id, { occurrenceCount: 1 }, userId) as {
        total: number;
        generated: { id: string; occurrenceDate: string; installment: { dueDate: string; amount: number } }[];
      };
      expect(generation.total).toBe(1);
      expect(generation.generated[0]).toMatchObject({
        occurrenceDate: '2026-08-05',
        installment: { dueDate: '2026-08-05', amount: 321.45 },
      });

      const recurrenceState = await client.query<{
        next_occurrence_date: string | Date | null;
        last_generated_until: string | Date | null;
      }>(`SELECT next_occurrence_date,last_generated_until FROM financeiro.payable_recurrences WHERE id=$1`, [recurrence.id]);
      expect(dateOnly(recurrenceState.rows[0]?.next_occurrence_date)).toBe('2026-09-05');
      expect(dateOnly(recurrenceState.rows[0]?.last_generated_until)).toBe('2026-08-05');

      const linkedTitle = await client.query<{
        occurrence_date: string | Date;
        sequence_number: number;
        origin_code: string;
        due_date: string | Date;
        amount: string;
      }>(`SELECT rt.occurrence_date,rt.sequence_number,t.origin_code,i.due_date,i.amount::text
          FROM financeiro.payable_recurrence_titles rt
          JOIN financeiro.payable_titles t ON t.id=rt.payable_title_id
          JOIN financeiro.payable_installments i ON i.payable_title_id=t.id
         WHERE rt.recurrence_id=$1`, [recurrence.id]);

      expect(linkedTitle.rowCount).toBe(1);
      expect(linkedTitle.rows[0]?.sequence_number).toBe(1);
      expect(linkedTitle.rows[0]?.origin_code).toBe('RECURRENCE');
      expect(dateOnly(linkedTitle.rows[0]?.occurrence_date)).toBe('2026-08-05');
      expect(dateOnly(linkedTitle.rows[0]?.due_date)).toBe('2026-08-05');
      expect(Number(linkedTitle.rows[0]?.amount)).toBe(321.45);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
