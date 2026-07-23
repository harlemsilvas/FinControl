import { randomUUID } from 'node:crypto';
import { Pool, type PoolClient } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { QueryExecutor } from '../../src/infrastructure/database/database.js';
import { PayablesRepository } from '../../src/domains/payables/payables-repository.js';

const enabled = process.env.RUN_DATABASE_INTEGRATION === 'true';
const suite = enabled ? describe : describe.skip;

function executorFromClient(client: PoolClient): QueryExecutor {
  return {
    query: async <Row extends Record<string, unknown>>(text: string, values: readonly unknown[] = []) => {
      const result = await client.query<Row>(text, [...values]);
      return { rows: result.rows, rowCount: result.rowCount ?? 0 };
    },
  };
}

function dateOnly(value: string | Date | null | undefined): string | null {
  if (value == null) return null;
  return value instanceof Date ? value.toISOString().slice(0, 10) : value.slice(0, 10);
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
    const userId = 'c36eab5c-7054-4d44-a308-9dd076c20d0e';

    try {
      await client.query('BEGIN');

      const tx = executorFromClient(client);
      const database = {
        query: tx.query,
        checkHealth: async () => ({ database: process.env.DB_NAME!, latencyMs: 0, serverTime: new Date().toISOString() }),
        close: async () => undefined,
        transaction: async <T>(work: (executor: QueryExecutor) => Promise<T>) => work(tx),
      };
      const repo = new PayablesRepository(database);

      const company = await client.query(`SELECT id FROM cadastros.companies WHERE company_type='MAIN' AND is_active AND deleted_at IS NULL ORDER BY created_at LIMIT 1`);
      const supplier = await client.query(`SELECT id FROM cadastros.suppliers WHERE deleted_at IS NULL AND is_active ORDER BY created_at LIMIT 1`);
      const category = await client.query(`SELECT id FROM cadastros.financial_categories WHERE deleted_at IS NULL AND is_active ORDER BY created_at LIMIT 1`);
      const documentType = await client.query(`SELECT id FROM cadastros.document_types WHERE is_active ORDER BY created_at LIMIT 1`);
      const paymentMethod = await client.query(`SELECT id FROM cadastros.payment_methods WHERE is_active ORDER BY created_at LIMIT 1`);
      const paymentTerm = await client.query(`SELECT id FROM cadastros.payment_terms WHERE is_active ORDER BY created_at LIMIT 1`);
      const costCenter = await client.query(`SELECT id FROM cadastros.cost_centers WHERE deleted_at IS NULL AND is_active ORDER BY created_at LIMIT 1`);

      const recurrence = await repo.createRecurrence({
        companyId: String(company.rows[0]?.id),
        supplierId: String(supplier.rows[0]?.id),
        categoryId: String(category.rows[0]?.id),
        costCenterId: String(costCenter.rows[0]?.id),
        documentTypeId: String(documentType.rows[0]?.id),
        paymentMethodId: String(paymentMethod.rows[0]?.id),
        paymentTermId: String(paymentTerm.rows[0]?.id),
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
      expect(recurrenceState.rows[0]).toMatchObject({
        next_occurrence_date: expect.any(Date),
        last_generated_until: expect.any(Date),
      });
      expect((recurrenceState.rows[0]?.next_occurrence_date as Date).toISOString().slice(0, 10)).toBe('2026-09-05');
      expect((recurrenceState.rows[0]?.last_generated_until as Date).toISOString().slice(0, 10)).toBe('2026-08-05');

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
      expect((linkedTitle.rows[0]?.occurrence_date as Date).toISOString().slice(0, 10)).toBe('2026-08-05');
      expect((linkedTitle.rows[0]?.due_date as Date).toISOString().slice(0, 10)).toBe('2026-08-05');
      expect(Number(linkedTitle.rows[0]?.amount)).toBe(321.45);
    } finally {
      await client.query('ROLLBACK');
      client.release();
    }
  });
});
