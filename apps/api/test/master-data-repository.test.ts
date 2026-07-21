import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../src/infrastructure/database/database.js';
import { MasterDataRepository, type ResourceDefinition } from '../src/domains/master-data/master-data-repository.js';

const definition: ResourceDefinition = { domain: 'DOM-001', entity: 'SUPPLIER', table: 'cadastros.suppliers',
  searchColumns: ['legal_name', 'trade_name', 'document_number'], hasSoftDelete: true, orderBy: 'legal_name, id',
  columns: { id: 'id', legalName: 'legal_name', documentNumber: 'document_number', isActive: 'is_active', createdAt: 'created_at', updatedAt: 'updated_at', deletedBy: 'deleted_by', updatedBy: 'updated_by' } };

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
});
