import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Environment } from '../src/config/environment.js';
import type { Database } from '../src/infrastructure/database/database.js';
import { buildApp } from '../src/presentation/http/build-app.js';

const environment: Environment = {
  NODE_ENV: 'test',
  API_HOST: '127.0.0.1',
  API_PORT: 3000,
  LOG_LEVEL: 'silent',
  DB_HOST: '127.0.0.1',
  DB_PORT: 5434,
  DB_NAME: 'fincontrol',
  DB_USER: 'fincontrol',
  DB_PASSWORD: 'test-password',
  DB_POOL_MAX: 10,
  DB_IDLE_TIMEOUT_MS: 30_000,
  DB_CONNECTION_TIMEOUT_MS: 5_000,
};

const apps: ReturnType<typeof buildApp>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map(async (app) => app.close()));
});

interface DatabaseMock {
  checkHealth: ReturnType<typeof vi.fn>;
  database: Database;
}

function createDatabase(): DatabaseMock {
  const checkHealth = vi.fn().mockResolvedValue({
    database: 'fincontrol',
    latencyMs: 1.25,
    serverTime: new Date().toISOString(),
  });

  return {
    checkHealth,
    database: {
      checkHealth,
      close: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe('health routes', () => {
  it('reports liveness without querying dependencies', async () => {
    const { checkHealth, database } = createDatabase();
    const app = buildApp({ database, environment, logger: false });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health/live' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({ status: 'ok', service: 'fincontrol-api' });
    expect(checkHealth).not.toHaveBeenCalled();
  });

  it('reports readiness when PostgreSQL is available', async () => {
    const { database } = createDatabase();
    const app = buildApp({ database, environment, logger: false });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      status: 'ok',
      dependencies: { database: { status: 'ok', database: 'fincontrol' } },
    });
  });

  it('reports unavailable when PostgreSQL cannot be reached', async () => {
    const { checkHealth, database } = createDatabase();
    checkHealth.mockRejectedValueOnce(new Error('connection failed'));
    const app = buildApp({ database, environment, logger: false });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({
      status: 'unavailable',
      dependencies: { database: { status: 'unavailable' } },
    });
  });

  it('returns a standardized not-found error', async () => {
    const { database } = createDatabase();
    const app = buildApp({ database, environment, logger: false });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/missing' });

    expect(response.statusCode).toBe(404);
    expect(response.json()).toMatchObject({
      error: { code: 'ROUTE_NOT_FOUND', message: 'Route not found' },
    });
  });
});
