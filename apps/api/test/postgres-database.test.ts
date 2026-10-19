import { describe, expect, it, vi } from 'vitest';
import { loadEnvironment } from '../src/config/environment.js';
import { PostgresDatabase } from '../src/infrastructure/database/postgres-database.js';

const mocks = vi.hoisted(() => ({ pool: vi.fn() }));
vi.mock('pg', () => ({ Pool: class { constructor(options: unknown) { mocks.pool(options); } } }));

describe('PostgresDatabase business timezone', () => {
  it('sets the timezone on every pool connection independently of the database server default', () => {
    const environment = loadEnvironment({
      DB_HOST: '127.0.0.1', DB_PORT: '5434', DB_NAME: 'fincontrol',
      DB_USER: 'fincontrol', DB_PASSWORD: 'test-password',
      AUTH_ACCESS_TOKEN_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    });
    new PostgresDatabase(environment);
    expect(mocks.pool).toHaveBeenCalledWith(expect.objectContaining({
      options: '-c timezone=America/Sao_Paulo',
    }));
  });
});
