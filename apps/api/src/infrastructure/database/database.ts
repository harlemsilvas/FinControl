export interface DatabaseHealth {
  database: string;
  latencyMs: number;
  serverTime: string;
}

export interface QueryExecutor {
  query<Row extends Record<string, unknown> = Record<string, unknown>>(
    text: string,
    values?: readonly unknown[],
  ): Promise<{ rows: Row[]; rowCount: number }>;
}

export interface Database extends QueryExecutor {
  checkHealth(): Promise<DatabaseHealth>;
  transaction<T>(work: (executor: QueryExecutor) => Promise<T>): Promise<T>;
  close(): Promise<void>;
}
