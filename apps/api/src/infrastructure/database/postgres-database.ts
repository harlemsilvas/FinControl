import { performance } from 'node:perf_hooks';
import { Pool } from 'pg';
import type { Environment } from '../../config/environment.js';
import type { Database, DatabaseHealth, QueryExecutor } from './database.js';

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

  async query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values: readonly unknown[] = [],
  ): Promise<{ rows: Row[]; rowCount: number }> {
    const result = await this.pool.query<Row>(text, [...values]);
    return { rows: result.rows, rowCount: result.rowCount ?? 0 };
  }

  async transaction<T>(work: (executor: QueryExecutor) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work({ query: async <Row extends Record<string, unknown>>(text: string, values: readonly unknown[] = []) => {
        const queryResult = await client.query<Row>(text, [...values]);
        return { rows: queryResult.rows, rowCount: queryResult.rowCount ?? 0 };
      } });
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
