import { loadEnvironment } from './config/environment.js';
import { PostgresDatabase } from './infrastructure/database/postgres-database.js';
import { buildApp } from './presentation/http/build-app.js';

const environment = loadEnvironment();
const database = new PostgresDatabase(environment);
const app = buildApp({ database, environment });

async function shutdown(signal: string): Promise<void> {
  app.log.info({ signal }, 'Shutting down FinControl API');
  await app.close();
  process.exit(0);
}

process.once('SIGINT', () => {
  void shutdown('SIGINT');
});
process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});

try {
  await app.listen({ host: environment.API_HOST, port: environment.API_PORT });
} catch (error) {
  app.log.fatal({ err: error }, 'Unable to start FinControl API');
  await app.close();
  process.exit(1);
}

