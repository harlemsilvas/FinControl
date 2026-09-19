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
