import { describe, expect, it, vi } from 'vitest';
import { IntelligenceRepository } from '../src/domains/intelligence/intelligence-repository.js';
import type { Database } from '../src/infrastructure/database/database.js';

function databaseWithRows(rowsByCall: Array<Array<Record<string, unknown>>>): { database: Database; query: ReturnType<typeof vi.fn> } {
  const query = vi.fn(() => {
    const rows = rowsByCall.shift() ?? [];
    return Promise.resolve({ rows, rowCount: rows.length });
  });
  return { database: { query } as unknown as Database, query };
}

describe('IntelligenceRepository payables forecast', () => {
  it('limits the global report to companies allowed for a non-master user', async () => {
    const { database, query } = databaseWithRows([
      [{ total_pending: '150.00', overdue: '0.00', upcoming: '150.00', installment_count: '2', company_count: '2' }],
      [{ label: '2026-09-21', amount: '150.00', count: '2' }],
      [{ id: 'company-a', label: 'Empresa A', amount: '150.00', count: '2' }],
      [{ id: 'installment-a', payable_title_id: 'title-a', total_count: '1' }],
    ]);
    const repository = new IntelligenceRepository(database);

    const result = await repository.payablesForecast({
      from: '2026-09-17', to: '2026-09-23', status: 'ALL_PENDING', page: 1, pageSize: 20,
    }, { isMaster: false, companyIds: ['company-a', 'company-b'] });

    expect(query).toHaveBeenCalledTimes(4);
    expect(String(query.mock.calls[0]?.[0])).toContain('t.company_id = ANY($3::uuid[])');
    expect(query.mock.calls[0]?.[1]).toEqual(['2026-09-17', '2026-09-23', ['company-a', 'company-b']]);
    expect(result).toMatchObject({
      summary: { totalPending: '150.00', installmentCount: '2' },
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    });
  });

  it('rejects an explicitly selected company outside the user scope', async () => {
    const { database, query } = databaseWithRows([]);
    const repository = new IntelligenceRepository(database);

    await expect(repository.payablesForecast({
      from: '2026-09-17', to: '2026-09-23', companyId: 'company-b', status: 'ALL_PENDING', page: 1, pageSize: 20,
    }, { isMaster: false, companyIds: ['company-a'] })).rejects.toMatchObject({ code: 'COMPANY_ACCESS_DENIED', statusCode: 403 });
    expect(query).not.toHaveBeenCalled();
  });
});

describe('IntelligenceRepository payments report', () => {
  it('uses effective payments by payment date and restricts the global scope', async () => {
    const { database, query } = databaseWithRows([
      [{ total_paid: '103.00', total_principal: '100.00', total_adjustments: '3.00', payment_count: '1', company_count: '1' }],
      [{ label: '2026-09-20', amount: '103.00', count: '1' }],
      [{ id: 'company-a', label: 'Empresa A', amount: '103.00', count: '1' }],
      [{ total: '1' }],
      [{ id: 'payment-a', movement_amount: '103.00' }],
    ]);
    const repository = new IntelligenceRepository(database);
    const result = await repository.paymentsReport({ from: '2026-09-01', to: '2026-09-30', page: 1, pageSize: 20 },
      { isMaster: false, companyIds: ['company-a'] });
    expect(query).toHaveBeenCalledTimes(5);
    expect(String(query.mock.calls[0]?.[0])).toContain("ps.code = 'EFFECTIVE'");
    expect(String(query.mock.calls[0]?.[0])).toContain('pr.id IS NULL');
    expect(String(query.mock.calls[0]?.[0])).toContain('p.payment_date BETWEEN $1 AND $2');
    expect(String(query.mock.calls[0]?.[0])).toContain('t.company_id = ANY($3::uuid[])');
    expect(query.mock.calls[0]?.[1]).toEqual(['2026-09-01', '2026-09-30', ['company-a']]);
    expect(result).toMatchObject({ summary: { totalPaid: '103.00', paymentCount: '1' },
      pagination: { total: 1, totalPages: 1 } });
  });

  it('rejects a company outside the user scope', async () => {
    const { database, query } = databaseWithRows([]);
    const repository = new IntelligenceRepository(database);
    await expect(repository.paymentsReport({ from: '2026-09-01', to: '2026-09-30',
      companyId: 'company-b', page: 1, pageSize: 20 },
    { isMaster: false, companyIds: ['company-a'] })).rejects.toMatchObject({ code: 'COMPANY_ACCESS_DENIED', statusCode: 403 });
    expect(query).not.toHaveBeenCalled();
  });
});

describe('IntelligenceRepository planned versus paid', () => {
  it('aggregates due installments and effective payments in separate event streams', async () => {
    const { database, query } = databaseWithRows([
      [{ planned: '250.00', paid: '103.00', difference: '-147.00', installment_count: '2', payment_count: '1', company_count: '1' }],
      [{ label: '2026-09-20', planned: '250.00', paid: '103.00', difference: '-147.00', installment_count: '2', payment_count: '1' }],
      [{ id: 'company-a', label: 'Empresa A', planned: '250.00', paid: '103.00', difference: '-147.00', installment_count: '2', payment_count: '1' }],
    ]);
    const result = await new IntelligenceRepository(database).plannedVsPaid({ from: '2026-09-01', to: '2026-09-30',
      supplierId: 'supplier-a' }, { isMaster: false, companyIds: ['company-a'] });
    expect(query).toHaveBeenCalledTimes(3);
    const sql = String(query.mock.calls[0]?.[0]);
    expect(sql).toContain('UNION ALL');
    expect(sql).toContain('i.due_date BETWEEN $1 AND $2');
    expect(sql).toContain('p.payment_date BETWEEN $1 AND $2');
    expect(sql).toContain("ps.code = 'EFFECTIVE' AND pr.id IS NULL");
    expect(sql).toContain('t.company_id = ANY($3::uuid[])');
    expect(sql).toContain('t.supplier_id = $4');
    expect(query.mock.calls[0]?.[1]).toEqual(['2026-09-01', '2026-09-30', ['company-a'], 'supplier-a']);
    expect(result).toMatchObject({ summary: { planned: '250.00', paid: '103.00', difference: '-147.00' },
      byDate: [{ planned: '250.00', paid: '103.00' }] });
  });

  it('rejects an unauthorized company before querying', async () => {
    const { database, query } = databaseWithRows([]);
    await expect(new IntelligenceRepository(database).plannedVsPaid({ from: '2026-09-01', to: '2026-09-30',
      companyId: 'company-b' }, { isMaster: false, companyIds: ['company-a'] })).rejects.toMatchObject({ code: 'COMPANY_ACCESS_DENIED' });
    expect(query).not.toHaveBeenCalled();
  });
});
