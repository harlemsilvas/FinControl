import type { FastifyInstance } from 'fastify';
import type { Database } from '../../infrastructure/database/database.js';

interface HealthRoutesOptions {
  database: Database;
}

export function healthRoutes(
  app: FastifyInstance,
  options: HealthRoutesOptions,
): Promise<void> {
  app.get('/live', () => ({
    status: 'ok',
    service: 'fincontrol-api',
    timestamp: new Date().toISOString(),
  }));

  app.get('/ready', async (_request, reply) => {
    try {
      const database = await options.database.checkHealth();
      return {
        status: 'ok',
        service: 'fincontrol-api',
        dependencies: {
          database: { status: 'ok', ...database },
        },
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      app.log.error({ err: error }, 'Readiness check failed');
      return reply.status(503).send({
        status: 'unavailable',
        service: 'fincontrol-api',
        dependencies: {
          database: { status: 'unavailable' },
        },
        timestamp: new Date().toISOString(),
      });
    }
  });

  return Promise.resolve();
}

