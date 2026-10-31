import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '../../common/errors/application-error.js';
import { createAuthenticate, requirePermission } from '../auth/auth-context.js';
import type { AuthRepository } from '../auth/auth-repository.js';
import type { TokenService } from '../auth/token-service.js';
import type { ImportedInvoicesService, InvoiceScope } from './imported-invoices-service.js';

interface Options { authRepository: AuthRepository; tokenService: TokenService; service: ImportedInvoicesService }
const fields = {
  from: z.iso.date(), to: z.iso.date(), companyId: z.uuid().optional(),
  search: z.string().trim().max(120).optional(),
};
const range = <T extends { from: string; to: string }>(value: T): boolean => value.from <= value.to && Date.parse(value.to) - Date.parse(value.from) <= 366 * 86400000;
const report = z.object({ ...fields, page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) }).refine(range, 'Informe um período válido de até 366 dias.');
const selection = z.object({ ...fields, ids: z.array(z.uuid()).min(1).max(500).optional() }).strict().refine(range, 'Informe um período válido de até 366 dias.');
const id = z.object({ id: z.uuid() });
function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApplicationError({ code: 'VALIDATION_ERROR', message: 'Filtros ou seleção inválidos.', statusCode: 400 });
  return result.data;
}
function scope(request: FastifyRequest): InvoiceScope {
  return { id: request.authUser!.id, companyIds: request.authUser!.companies.map(company => company.id) };
}
export function importedInvoicesRoutes(app: FastifyInstance, options: Options): Promise<void> {
  const auth = createAuthenticate(options.authRepository, options.tokenService);
  const view = requirePermission('XML_REPORT_VIEW');
  const manage = requirePermission('XML_EXPORT_MANAGE');
  let cleanupTimer: ReturnType<typeof setInterval> | undefined;
  app.addHook('onReady', async () => {
    await options.service.cleanup();
    cleanupTimer = setInterval(() => { void options.service.cleanup().catch((error: unknown) => app.log.error({ err: error }, 'XML export cleanup failed')); }, 60000);
    cleanupTimer.unref();
  });
  app.addHook('onClose', (_instance, done) => { if (cleanupTimer) clearInterval(cleanupTimer); done(); });
  const secure = (_request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    reply.header('Cache-Control', 'no-store').header('X-Content-Type-Options', 'nosniff');
    return Promise.resolve();
  };
  app.get('/reports/imported-invoices', { preHandler: [auth, view, secure] }, request => {
    const filters = parse(report, request.query);
    return options.service.report(filters, scope(request), filters.page, filters.pageSize);
  });
  app.get('/reports/imported-invoices/export-data', { preHandler: [auth, view, secure] }, request => options.service.exportData(parse(selection, request.query), scope(request)));
  app.post('/xml-exports/preview', { preHandler: [auth, view, manage, secure] }, request => options.service.preview(parse(selection, request.body), scope(request)));
  app.post('/xml-exports/:id/generate', { preHandler: [auth, view, manage, secure] }, request => {
    const body = parse(z.object({ allowPartial: z.boolean().default(false) }).strict(), request.body);
    return options.service.generate(parse(id, request.params).id, scope(request), body.allowPartial);
  });
  app.get('/xml-exports', { preHandler: [auth, view, manage, secure] }, request => {
    const filters = parse(z.object({ page: z.coerce.number().int().min(1).default(1) }), request.query);
    return options.service.history(scope(request), filters.page);
  });
  app.delete('/xml-exports/:id', { preHandler: [auth, view, manage, secure] }, async (request, reply) => {
    await options.service.discard(parse(id, request.params).id, scope(request));
    return reply.code(204).send();
  });
  app.get('/xml-exports/:id/download', { preHandler: [auth, view, manage, secure] }, async (request, reply) => {
    const packageId = parse(id, request.params).id;
    const bytes = await options.service.download(packageId, scope(request));
    return reply.type('application/zip').header('Content-Disposition', `attachment; filename="fincontrol_nfe_${packageId}.zip"`).header('Content-Length', bytes.length).send(bytes);
  });
  return Promise.resolve();
}
