import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '../../common/errors/application-error.js';
import { createAuthenticate, requirePermission } from '../auth/auth-context.js';
import type { AuthRepository } from '../auth/auth-repository.js';
import type { TokenService } from '../auth/token-service.js';
import type { BackupsService } from './backups-service.js';

interface Options { authRepository: AuthRepository; tokenService: TokenService; service: BackupsService }

const params = z.object({ name: z.string().regex(/^[A-Za-z0-9._-]+\.dump$/) });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApplicationError({
    code: 'VALIDATION_ERROR', message: 'Invalid request data', statusCode: 400,
    details: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
  return result.data;
}

function userId(request: { authUser?: { id: string } | null }): string {
  const id = request.authUser?.id;
  if (!id) throw new ApplicationError({ code: 'UNAUTHORIZED', message: 'Authentication required', statusCode: 401 });
  return id;
}

function context(request: { ip: string; headers: Record<string, string | string[] | undefined>; id: string; authUser?: { id: string } | null }): { userId: string; ip: string | null; userAgent: string | null; correlationId: string | null } {
  const userAgent = request.headers['user-agent'];
  return {
    userId: userId(request),
    ip: request.ip || null,
    userAgent: typeof userAgent === 'string' ? userAgent : null,
    correlationId: /^[0-9a-f-]{36}$/i.test(request.id) ? request.id : null,
  };
}

export function backupsRoutes(app: FastifyInstance, options: Options): Promise<void> {
  const auth = createAuthenticate(options.authRepository, options.tokenService);
  const manage = requirePermission('BACKUP_MANAGE');

  app.get('/backups', { preHandler: [auth, manage] }, () => options.service.list());
  app.post('/backups', { preHandler: [auth, manage] }, (request, reply) => (
    options.service.create(context(request)).then((result) => reply.status(201).send(result))
  ));
  app.get('/backups/:name/download', { preHandler: [auth, manage] }, async (request, reply) => {
    const { name } = parse(params, request.params);
    const { file, stream } = await options.service.file(name, context(request));
    return reply
      .header('Content-Type', 'application/octet-stream')
      .header('Content-Length', String(file.sizeBytes))
      .header('Content-Disposition', `attachment; filename="${file.name}"`)
      .send(stream);
  });
  return Promise.resolve();
}
