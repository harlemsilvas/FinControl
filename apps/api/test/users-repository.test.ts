import { describe, expect, it, vi } from 'vitest';
import type { Database, QueryExecutor } from '../src/infrastructure/database/database.js';
import { UsersRepository } from '../src/domains/administration/users-repository.js';

describe('UsersRepository', () => {
  it('preserves the selected default company when creating a user', async () => {
    const query = vi.fn(async (sql: string, values?: readonly unknown[]) => {
      await Promise.resolve();
      if (sql.includes('FROM administracao.roles WHERE id = ANY')) return { rows: [{ total: '1' }], rowCount: 1 };
      if (sql.includes('FROM cadastros.companies WHERE id = ANY')) return { rows: [{ total: '2' }], rowCount: 1 };
      if (sql.includes('INSERT INTO administracao.users')) return { rows: [{ id: 'user-new' }], rowCount: 1 };
      if (sql.includes('SELECT u.id,u.full_name')) {
        return { rows: [{ id: 'user-new', full_name: 'Operador', email: 'operador@example.com', is_master: false, is_active: true, created_at: new Date(), updated_at: new Date(), roles: [], companies: [] }], rowCount: 1 };
      }
      return { rows: [], rowCount: 0, values };
    });
    const executor: QueryExecutor = {
      query: async <Row extends Record<string, unknown>>(sql: string, values?: readonly unknown[]) => query(sql, values) as Promise<{ rows: Row[]; rowCount: number }>,
    };
    const database = {
      query: async <Row extends Record<string, unknown>>(sql: string, values?: readonly unknown[]) => executor.query<Row>(sql, values),
      transaction: vi.fn(async <T>(work: (tx: QueryExecutor) => Promise<T>) => work(executor)),
      checkHealth: vi.fn(),
      close: vi.fn(),
    } as unknown as Database;

    await new UsersRepository(database).create({
      fullName: 'Operador',
      email: 'operador@example.com',
      password: 'senha-segura',
      roleIds: ['role-operator'],
      companies: [
        { companyId: 'company-1', isDefault: false, accessScope: 'OPERATIONAL' },
        { companyId: 'company-2', isDefault: true, accessScope: 'VIEW_ONLY' },
      ],
    }, 'actor-id');

    const companyInsert = query.mock.calls.find(([sql]) => String(sql).includes('INSERT INTO administracao.user_companies'));
    expect(companyInsert?.[1]).toEqual([
      'user-new', 'company-1', false, 'OPERATIONAL', 'actor-id',
      'user-new', 'company-2', true, 'VIEW_ONLY', 'actor-id',
    ]);
  });
});
