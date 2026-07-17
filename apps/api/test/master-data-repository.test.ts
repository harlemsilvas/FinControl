import { describe, expect, it, vi } from 'vitest';
import type { Database } from '../src/infrastructure/database/database.js';
import { MasterDataRepository, type ResourceDefinition } from '../src/domains/master-data/master-data-repository.js';

const definition: ResourceDefinition = { domain: 'DOM-001', entity: 'PAYMENT_METHOD', table: 'cadastros.payment_methods',
  searchColumns: ['code', 'name'], hasSoftDelete: false, orderBy: 'code, id',
  columns: { id: 'id', code: 'code', name: 'name', isActive: 'is_active', createdAt: 'created_at', updatedAt: 'updated_at' } };

function database(query: ReturnType<typeof vi.fn>): Database {
  return { query, transaction: vi.fn(), checkHealth: vi.fn(), close: vi.fn() } as Database;
}

describe('MasterDataRepository', () => {
  it('lists resources with pagination, search and API field mapping', async () => {
    const query = vi.fn()
      .mockResolvedValueOnce({ rows: [{ total: '1' }], rowCount: 1 })
      .mockResolvedValueOnce({ rows: [{ id: '1', code: 'PIX', name: 'PIX', is_active: true,
        created_at: new Date('2026-07-16'), updated_at: new Date('2026-07-16') }], rowCount: 1 });
    const result = await new MasterDataRepository(database(query)).list(definition, 2, 10, 'pix', true);
    expect(result).toMatchObject({ page: 2, pageSize: 10, total: 1,
      data: [{ id: '1', code: 'PIX', name: 'PIX', isActive: true }] });
    expect(query.mock.calls[0]?.[0]).toContain('is_active = $1');
    expect(query.mock.calls[1]?.[1]).toEqual([true, '%pix%', 10, 10]);
  });

  it('creates resources using only allowlisted columns', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: '1', code: 'WIRE', name: 'Transferência', is_active: true }], rowCount: 1 });
    const result = await new MasterDataRepository(database(query)).create(definition,
      { code: 'WIRE', name: 'Transferência', unknown: 'ignored' }, 'user-id');
    expect(result).toMatchObject({ id: '1', code: 'WIRE', name: 'Transferência' });
    expect(query.mock.calls[0]?.[0]).not.toContain('unknown');
    expect(query.mock.calls[0]?.[1]).toEqual(['WIRE', 'Transferência']);
  });

  it('deactivates resources without physically deleting rows', async () => {
    const query = vi.fn().mockResolvedValue({ rows: [{ id: '1', code: 'PIX', name: 'PIX', is_active: false }], rowCount: 1 });
    await new MasterDataRepository(database(query)).deactivate(definition, '1', 'user-id');
    expect(query.mock.calls[0]?.[0]).toContain('UPDATE cadastros.payment_methods SET is_active = false');
    expect(query.mock.calls[0]?.[0]).not.toContain('DELETE FROM');
  });
});
