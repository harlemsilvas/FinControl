import { describe, expect, it, vi } from 'vitest';
import type { Database, QueryExecutor } from '../src/infrastructure/database/database.js';
import { TreasuryRepository } from '../src/domains/treasury/treasury-repository.js';

function database(executor: QueryExecutor): Database {
  return {
    query: async (text, values) => executor.query(text, values),
    checkHealth: vi.fn(),
    close: vi.fn(),
    transaction: async <T>(work: (tx: QueryExecutor) => Promise<T>) => work(executor),
  };
}

describe('TreasuryRepository bank account movements', () => {
  it('creates a marketplace repass manual entry linked to cost center and bank account company', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'bank-account-id', company_id: 'company-id', account_name: 'Conta Matriz' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'movement-id', bank_account_id: 'bank-account-id', company_id: 'company-id', cost_center_id: 'cost-center-id', movement_type: 'MARKETPLACE_REPASS', direction: 'IN', amount: '500.00' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 1 });
    const repo = new TreasuryRepository(database({ query }));
    const result = await repo.createManualEntry({
      bankAccountId: 'bank-account-id',
      movementType: 'MARKETPLACE_REPASS',
      movementDate: '2026-07-22',
      amount: 500,
      costCenterId: 'cost-center-id',
    }, 'user-id', false) as { id: string; companyId: string };
    const insertValues = query.mock.calls[1]?.[1] as unknown[] | undefined;
    expect(result.id).toBe('movement-id');
    expect(result.companyId).toBe('company-id');
    expect(insertValues?.[2]).toBe('cost-center-id');
    expect(insertValues?.[6]).toBe('MARKETPLACE_REPASS');
    expect(insertValues?.[7]).toBe('IN');
  });

  it('requires cost center for marketplace repass entries', async () => {
    const repo = new TreasuryRepository(database({ query: vi.fn() }));
    await expect(repo.createManualEntry({
      bankAccountId: 'bank-account-id',
      movementType: 'MARKETPLACE_REPASS',
      movementDate: '2026-07-22',
      amount: 500,
    }, 'user-id', false)).rejects.toMatchObject({ code: 'COST_CENTER_REQUIRED', statusCode: 400 });
  });

  it('allows manual adjustment only for admin users', async () => {
    const repo = new TreasuryRepository(database({ query: vi.fn() }));
    await expect(repo.createManualEntry({
      bankAccountId: 'bank-account-id',
      movementType: 'MANUAL_ADJUSTMENT',
      movementDate: '2026-07-22',
      amount: 100,
    }, 'user-id', false)).rejects.toMatchObject({ code: 'FORBIDDEN', statusCode: 403 });
  });

  it('blocks a second active cash balance movement for the same bank account', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'bank-account-id', company_id: 'company-id', account_name: 'Conta Matriz' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });
    const repo = new TreasuryRepository(database({ query }));
    await expect(repo.createManualEntry({
      bankAccountId: 'bank-account-id',
      movementType: 'CASH_BALANCE',
      movementDate: '2026-07-22',
      amount: 100,
    }, 'user-id', false)).rejects.toMatchObject({ code: 'CASH_BALANCE_ALREADY_EXISTS', statusCode: 409 });
  });

  it('blocks transfers between different company CNPJs', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'from-account', company_id: 'company-a', account_name: 'Conta A' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'to-account', company_id: 'company-b', account_name: 'Conta B' }], rowCount: 1 });
    const repo = new TreasuryRepository(database({ query }));
    await expect(repo.transfer({
      fromBankAccountId: 'from-account',
      toBankAccountId: 'to-account',
      movementDate: '2026-07-22',
      amount: 100,
    }, 'user-id')).rejects.toMatchObject({ code: 'CROSS_COMPANY_TRANSFER_BLOCKED', statusCode: 409 });
  });

  it('blocks transfer when source account has insufficient official balance', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ id: 'from-account', company_id: 'company-a', account_name: 'Conta A' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: 'to-account', company_id: 'company-a', account_name: 'Conta B' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ official_balance: '50.00' }], rowCount: 1 });
    const repo = new TreasuryRepository(database({ query }));
    await expect(repo.transfer({
      fromBankAccountId: 'from-account',
      toBankAccountId: 'to-account',
      movementDate: '2026-07-22',
      amount: 100,
    }, 'user-id')).rejects.toMatchObject({ code: 'INSUFFICIENT_BANK_BALANCE', statusCode: 409 });
  });
});
