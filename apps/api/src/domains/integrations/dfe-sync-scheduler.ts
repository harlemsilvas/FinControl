import type { FastifyInstance } from 'fastify';
import type { Environment } from '../../config/environment.js';
import type { Database } from '../../infrastructure/database/database.js';
import type { PayablesRepository } from '../payables/payables-repository.js';
import { DfeApiClient } from './dfe-api-client.js';
import { nextDelaySeconds } from './dfe-sync-schedule.js';
import { DfeSyncService } from './dfe-sync-service.js';

// Desligado por padrao (DFE_SYNC_ENABLED=false). Com o servico habilitado, um unico agendador por processo da API.
// O intervalo e curto no horario comercial e longo fora dele (ver dfe-sync-schedule.ts); cada rodada reagenda a proxima.
export function registerDfeSync(app: FastifyInstance, database: Database, importer: PayablesRepository, environment: Environment): void {
  if (!environment.DFE_SYNC_ENABLED) return;
  const service = new DfeSyncService({
    database, importer, userId: environment.DFE_SYNC_USER_ID!, pageSize: environment.DFE_SYNC_PAGE_SIZE, logger: app.log,
    client: new DfeApiClient({ baseUrl: environment.DFE_API_BASE_URL!, apiKey: environment.DFE_API_KEY!, timeoutMs: environment.DFE_API_TIMEOUT_MS }),
  });
  const schedule = {
    timeZone: environment.TZ,
    businessIntervalSeconds: environment.DFE_SYNC_INTERVAL_SECONDS,
    offPeakIntervalSeconds: environment.DFE_SYNC_OFFPEAK_INTERVAL_SECONDS,
    businessStartHour: environment.DFE_SYNC_BUSINESS_START_HOUR,
    businessEndHour: environment.DFE_SYNC_BUSINESS_END_HOUR,
  };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let stopped = false;
  const tick = (): void => {
    void service.runOnce()
      .then((summary) => { if (summary) app.log.info({ summary }, 'DFe sync concluido'); })
      .catch((error: unknown) => app.log.error({ err: error instanceof Error ? error.name : 'erro' }, 'DFe sync falhou'))
      .finally(() => {
        if (stopped) return;
        timer = setTimeout(tick, nextDelaySeconds(new Date(), schedule) * 1000);
        timer.unref();
      });
  };
  app.addHook('onReady', (done) => { tick(); done(); });
  app.addHook('onClose', (_instance, done) => { stopped = true; if (timer) clearTimeout(timer); done(); });
}
