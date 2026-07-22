import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../src/infrastructure/database/database.js';
import { MasterDataRepository, type ResourceDefinition } from '../src/domains/master-data/master-data-repository.js';

const definition: ResourceDefinition = { domain: 'DOM-001', entity: 'SUPPLIER', table: 'cadastros.suppliers',
  searchColumns: ['legal_name', 'trade_name', 'document_number'], hasSoftDelete: true, orderBy: 'legal_name, id',
  columns: { id: 'id', legalName: 'legal_name', documentNumber: 'document_number', isActive: 'is_active', createdAt: 'created_at', updatedAt: 'updated_at', deletedBy: 'deleted_by', updatedBy: 'updated_by' } };
const companyParameters: ResourceDefinition = { domain: 'DOM-001', entity: 'COMPANY_PARAMETER', table: 'cadastros.company_parameters',
  searchColumns: ['notes'], hasSoftDelete: true, orderBy: 'created_at DESC, id',
  columns: { id: 'id', companyId: 'company_id', fiscalEnvironment: 'fiscal_environment', isActive: 'is_active', createdAt: 'created_at', updatedAt: 'updated_at' } };
const bankAccounts: ResourceDefinition = { domain: 'DOM-003', entity: 'BANK_ACCOUNT', table: 'tesouraria.bank_accounts',
  searchColumns: ['account_name', 'branch_number', 'account_number', 'pix_key'], hasSoftDelete: true, orderBy: 'account_name, id',
  columns: { id: 'id', companyId: 'company_id', bankId: 'bank_id', accountName: 'account_name', accountNumber: 'account_number',
    isActive: 'is_active', createdAt: 'created_at', updatedAt: 'updated_at' } };

function database(query: ReturnType<typeof vi.fn>): Database {
  return { query, transaction: vi.fn(), checkHealth: vi.fn(), close: vi.fn() } as Database;
}

describe('MasterDataRepository', () => {
  it('lists only active soft-deleted resources when active=true', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: '1', legal_name: 'Fornecedor A', document_number: '1', is_active: true,
        created_at: new Date('2026-07-16'), updated_at: new Date('2026-07-16') }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ marker_id: 'marker-1' }], rowCount: 1 });
    const result = await new MasterDataRepository(database(query)).list(definition, 1, 20, 'Fornecedor', true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toMatchObject({ id: '1', legalName: 'Fornecedor A', markerIds: ['marker-1'] });
    expect(query.mock.calls[0]?.[0]).toContain('deleted_at IS NULL');
    expect(query.mock.calls[0]?.[0]).toContain('is_active = $1');
    expect(query.mock.calls[2]?.[0]).toContain('FROM cadastros.supplier_markers');
  });

  it('lists inactive soft-deleted resources when active=false', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: '2', legal_name: 'Fornecedor B', document_number: '2', is_active: false,
        created_at: new Date('2026-07-16'), updated_at: new Date('2026-07-16') }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [], rowCount: 0 });
    const result = await new MasterDataRepository(database(query)).list(definition, 1, 20, undefined, false);
    expect(result.data).toHaveLength(1);
    expect(query.mock.calls[0]?.[0]).not.toContain('deleted_at IS NULL');
    expect(query.mock.calls[1]?.[1]).toEqual([false, 20, 0]);
    expect(query.mock.calls[2]?.[1]).toEqual(['2']);
  });

  it('reactivates soft-deleted resources without physical insert', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: '1', legal_name: 'Fornecedor A', is_active: true }], rowCount: 1 });
    await new MasterDataRepository(database(query)).reactivate(definition, '1', 'user-id');
    expect(query.mock.calls[0]?.[0]).toContain('is_active = true');
    expect(query.mock.calls[0]?.[0]).toContain('deleted_at = NULL');
    expect(query.mock.calls[0]?.[0]).not.toContain('INSERT INTO');
  });

  it('deactivates resources without physically deleting rows', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: '1', legal_name: 'Fornecedor A', is_active: false }], rowCount: 1 });
    await new MasterDataRepository(database(query)).deactivate(definition, '1', 'user-id');
    expect(query.mock.calls[0]?.[0]).toContain('UPDATE cadastros.suppliers SET is_active = false');
    expect(query.mock.calls[0]?.[0]).not.toContain('DELETE FROM');
  });

  it('adds the company name to company parameter records', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: '1', company_id: 'company-id', fiscal_environment: 'PRODUCTION', is_active: true,
        created_at: new Date('2026-07-22'), updated_at: new Date('2026-07-22') }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ display_name: 'Fantasia Teste' }], rowCount: 1 });
    const result = await new MasterDataRepository(database(query)).list(companyParameters, 1, 20, undefined, true);
    expect(result.data[0]).toMatchObject({ companyId: 'company-id', companyName: 'Fantasia Teste' });
    expect(query.mock.calls[2]?.[0]).toContain('FROM cadastros.companies');
  });

  it('adds company and bank names to bank account records', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: '1', company_id: 'company-id', bank_id: 'bank-id', account_name: 'Conta Principal',
        account_number: '123', is_active: true, created_at: new Date('2026-07-22'), updated_at: new Date('2026-07-22') }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ display_name: 'Empresa Fantasia' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ name: 'Banco Teste' }], rowCount: 1 });
    const result = await new MasterDataRepository(database(query)).list(bankAccounts, 1, 20, undefined, true);
    expect(result.data[0]).toMatchObject({ companyName: 'Empresa Fantasia', bankName: 'Banco Teste' });
  });
});
