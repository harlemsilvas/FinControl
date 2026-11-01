import type { FastifyInstance } from 'fastify';
import type { Environment } from '../../config/environment.js';
import type { Database } from '../../infrastructure/database/database.js';
import type { PayablesRepository } from '../payables/payables-repository.js';
import { DfeApiClient } from './dfe-api-client.js';
import { DfeSyncService } from './dfe-sync-service.js';

// Desligado por padrao (DFE_SYNC_ENABLED=false). Com o servico habilitado, um unico timer por processo da API.
export function registerDfeSync(app: FastifyInstance, database: Database, importer: PayablesRepository, environment: Environment): void {
  if (!environment.DFE_SYNC_ENABLED) return;
  const service = new DfeSyncService({
    database, importer, userId: environment.DFE_SYNC_USER_ID!, pageSize: environment.DFE_SYNC_PAGE_SIZE, logger: app.log,
    client: new DfeApiClient({ baseUrl: environment.DFE_API_BASE_URL!, apiKey: environment.DFE_API_KEY!, timeoutMs: environment.DFE_API_TIMEOUT_MS }),
  });
  let timer: ReturnType<typeof setInterval> | undefined;
  const tick = (): void => { void service.runOnce()
    .then((summary) => { if (summary) app.log.info({ summary }, 'DFe sync concluido'); })
    .catch((error: unknown) => app.log.error({ err: error instanceof Error ? error.name : 'erro' }, 'DFe sync falhou')); };
  app.addHook('onReady', (done) => { timer = setInterval(tick, environment.DFE_SYNC_INTERVAL_SECONDS * 1000); timer.unref(); tick(); done(); });
  app.addHook('onClose', (_instance, done) => { if (timer) clearInterval(timer); done(); });
}
