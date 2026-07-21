import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '../../common/errors/application-error.js';
import type { AuthRepository, RequestContext } from './auth-repository.js';
import type { AuthService } from './auth-service.js';
import { createAuthenticate } from './auth-context.js';
import type { TokenService } from './token-service.js';

interface AuthRoutesOptions {
  repository: AuthRepository;
  service: AuthService;
  tokens: TokenService;
}

const loginSchema = z.object({ email: z.email(), password: z.string().min(8).max(200) });
const refreshSchema = z.object({ refreshToken: z.string().min(32) });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApplicationError({
    code: 'VALIDATION_ERROR', message: 'Invalid request data', statusCode: 400,
    details: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
  });
  return result.data;
}

function context(request: FastifyRequest): RequestContext {
  const userAgent = request.headers['user-agent'];
  return { ip: request.ip || null, userAgent: typeof userAgent === 'string' ? userAgent : null,
    correlationId: /^[0-9a-f-]{36}$/i.test(request.id) ? request.id : null };
}

export function authRoutes(app: FastifyInstance, options: AuthRoutesOptions): Promise<void> {
  const authenticate = createAuthenticate(options.repository, options.tokens);

  app.post('/login', async (request) => {
    const body = parse(loginSchema, request.body);
    return options.service.login(body.email, body.password, context(request));
  });

  app.post('/refresh', async (request) => {
    const body = parse(refreshSchema, request.body);
    return options.service.refresh(body.refreshToken, context(request));
  });

  app.post('/logout', { preHandler: authenticate }, async (request, reply) => {
    const user = request.authUser;
    const sessionId = request.authSessionId;
    if (user && sessionId) {
      await options.repository.revokeSession(sessionId, user.id);
      await options.repository.audit('LOGOUT', user.id, user.id, context(request), { sessionId });
    }
    return reply.status(204).send();
  });

  app.get('/me', { preHandler: authenticate }, (request) => options.service.publicUser(request.authUser!));
  return Promise.resolve();
}
