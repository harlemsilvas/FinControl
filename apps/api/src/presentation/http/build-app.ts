import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { registerErrorHandler } from '../../common/http/error-handler.js';
import type { Environment } from '../../config/environment.js';
import { healthRoutes } from '../../domains/health/health-routes.js';
import type { Database } from '../../infrastructure/database/database.js';

export interface BuildAppOptions {
  database: Database;
  environment: Environment;
  logger?: FastifyServerOptions['logger'];
}

export function buildApp(options: BuildAppOptions): FastifyInstance {
  const app = Fastify({
    logger: options.logger ?? {
      level: options.environment.LOG_LEVEL,
      ...(options.environment.NODE_ENV === 'development'
        ? { transport: { target: 'pino-pretty', options: { colorize: true } } }
        : {}),
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'password',
          '*.password',
          'token',
          '*.token',
        ],
        censor: '[REDACTED]',
      },
    },
    requestIdHeader: 'x-request-id',
  });

  registerErrorHandler(app);
  void app.register(healthRoutes, { prefix: '/health', database: options.database });

  app.addHook('onClose', async () => {
    await options.database.close();
  });

  return app;
}

