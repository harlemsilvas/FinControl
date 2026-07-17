import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { registerErrorHandler } from '../../common/http/error-handler.js';
import type { Environment } from '../../config/environment.js';
import { healthRoutes } from '../../domains/health/health-routes.js';
import type { Database } from '../../infrastructure/database/database.js';
import { AuthRepository } from '../../domains/auth/auth-repository.js';
import { AuthService } from '../../domains/auth/auth-service.js';
import { TokenService } from '../../domains/auth/token-service.js';
import { authRoutes } from '../../domains/auth/auth-routes.js';
import { MasterDataRepository } from '../../domains/master-data/master-data-repository.js';
import { masterDataRoutes } from '../../domains/master-data/master-data-routes.js';
import { PayablesRepository } from '../../domains/payables/payables-repository.js';
import { payablesRoutes } from '../../domains/payables/payables-routes.js';
import { IntelligenceRepository } from '../../domains/intelligence/intelligence-repository.js';
import { intelligenceRoutes } from '../../domains/intelligence/intelligence-routes.js';

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
  app.decorateRequest('authUser', null);
  app.decorateRequest('authSessionId', null);
  void app.register(healthRoutes, { prefix: '/health', database: options.database });
  const authRepository = new AuthRepository(options.database);
  const tokenService = new TokenService(options.environment);
  const authService = new AuthService(authRepository, tokenService);
  void app.register(authRoutes, {
    prefix: '/auth', repository: authRepository, service: authService, tokens: tokenService,
  });
  void app.register(masterDataRoutes, {
    prefix: '/api/v1', authRepository, tokenService,
    repository: new MasterDataRepository(options.database),
  });
  void app.register(payablesRoutes, {
    prefix: '/api/v1', authRepository, tokenService,
    repository: new PayablesRepository(options.database),
  });
  void app.register(intelligenceRoutes, {
    prefix: '/api/v1', authRepository, tokenService,
    repository: new IntelligenceRepository(options.database),
  });

  app.addHook('onClose', async () => {
    await options.database.close();
  });

  return app;
}
