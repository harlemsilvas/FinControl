import { performance } from 'node:perf_hooks';
import { Pool } from 'pg';
import type { Environment } from '../../config/environment.js';
import type { Database, DatabaseHealth } from './database.js';

interface HealthRow {
  database: string;
  server_time: Date;
}

export class PostgresDatabase implements Database {
  private readonly pool: Pool;

  constructor(environment: Environment) {
    this.pool = new Pool({
      host: environment.DB_HOST,
      port: environment.DB_PORT,
      database: environment.DB_NAME,
      user: environment.DB_USER,
      password: environment.DB_PASSWORD,
      max: environment.DB_POOL_MAX,
      idleTimeoutMillis: environment.DB_IDLE_TIMEOUT_MS,
      connectionTimeoutMillis: environment.DB_CONNECTION_TIMEOUT_MS,
      application_name: 'fincontrol-api',
    });
  }

  async checkHealth(): Promise<DatabaseHealth> {
    const startedAt = performance.now();
    const result = await this.pool.query<HealthRow>(
      'SELECT current_database() AS database, CURRENT_TIMESTAMP AS server_time',
    );
    const row = result.rows[0];

    if (row === undefined) {
      throw new Error('PostgreSQL health query returned no rows');
    }

    return {
      database: row.database,
      latencyMs: Math.round((performance.now() - startedAt) * 100) / 100,
      serverTime: row.server_time.toISOString(),
    };
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}

