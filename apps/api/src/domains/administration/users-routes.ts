import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '../../common/errors/application-error.js';
import { createAuthenticate, requirePermission } from '../auth/auth-context.js';
import type { AuthRepository } from '../auth/auth-repository.js';
import type { AuthService } from '../auth/auth-service.js';
import type { TokenService } from '../auth/token-service.js';
import type { UserInput, UsersRepository } from './users-repository.js';

interface Options { authRepository: AuthRepository; authService: AuthService; tokenService: TokenService; repository: UsersRepository }

const uuid = z.uuid();
const companyAccess = z.object({
  companyId: uuid,
  isDefault: z.boolean().optional(),
  accessScope: z.enum(['OPERATIONAL', 'VIEW_ONLY']),
});
const userCreate = z.object({
  fullName: z.string().trim().min(2).max(160),
  email: z.email().max(255).transform((value) => value.toLowerCase()),
  password: z.string().min(8).max(200),
  isMaster: z.boolean().optional(),
  isActive: z.boolean().optional(),
  roleIds: z.array(uuid).max(20).optional(),
  companies: z.array(companyAccess).max(50).optional(),
}) satisfies z.ZodType<UserInput>;
const userUpdate = userCreate.extend({ password: z.string().min(8).max(200).optional() }).partial()
  .refine((value) => Object.keys(value).length > 0, 'At least one field is required') satisfies z.ZodType<UserInput>;
const list = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(120).optional(),
  active: z.coerce.boolean().optional(),
});
const id = z.object({ id: uuid });

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

function context(request: { ip: string; headers: Record<string, string | string[] | undefined>; id: string }): { ip: string | null; userAgent: string | null; correlationId: string | null } {
  const userAgent = request.headers['user-agent'];
  return {
    ip: request.ip || null,
    userAgent: typeof userAgent === 'string' ? userAgent : null,
    correlationId: /^[0-9a-f-]{36}$/i.test(request.id) ? request.id : null,
  };
}

export function usersRoutes(app: FastifyInstance, options: Options): Promise<void> {
  const auth = createAuthenticate(options.authRepository, options.tokenService);
  const manage = requirePermission('USER_MANAGE');

  app.get('/roles', { preHandler: [auth, manage] }, () => options.repository.roles());
  app.get('/users', { preHandler: [auth, manage] }, (request) => {
    const query = parse(list, request.query);
    return options.repository.list(query.page, query.pageSize, { search: query.search, active: query.active });
  });
  app.get('/users/:id', { preHandler: [auth, manage] }, async (request) => {
    const entity = await options.repository.findById(parse(id, request.params).id);
    if (!entity) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'User not found', statusCode: 404 });
    return entity;
  });
  app.post('/users', { preHandler: [auth, manage] }, async (request, reply) => reply.status(201).send(await options.repository.create(parse(userCreate, request.body), userId(request))));
  app.patch('/users/:id', { preHandler: [auth, manage] }, async (request) => {
    const entity = await options.repository.update(parse(id, request.params).id, parse(userUpdate, request.body), userId(request));
    if (!entity) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'User not found', statusCode: 404 });
    return entity;
  });
  app.delete('/users/:id', { preHandler: [auth, manage] }, async (request) => {
    const entity = await options.repository.deactivate(parse(id, request.params).id, userId(request));
    if (!entity) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'User not found', statusCode: 404 });
    return entity;
  });
  app.post('/users/:id/reactivate', { preHandler: [auth, manage] }, async (request) => {
    const entity = await options.repository.reactivate(parse(id, request.params).id, userId(request));
    if (!entity) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'User not found', statusCode: 404 });
    return entity;
  });
  app.post('/users/:id/password-reset', { preHandler: [auth, manage] }, async (request) => (
    options.authService.requestPasswordResetForUser(parse(id, request.params).id, userId(request), context(request))
  ));
  return Promise.resolve();
}
