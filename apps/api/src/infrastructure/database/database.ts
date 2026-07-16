export interface DatabaseHealth {
  database: string;
  latencyMs: number;
  serverTime: string;
}

export interface Database {
  checkHealth(): Promise<DatabaseHealth>;
  close(): Promise<void>;
}

