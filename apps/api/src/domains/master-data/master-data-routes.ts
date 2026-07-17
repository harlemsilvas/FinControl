import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '../../common/errors/application-error.js';
import { createAuthenticate, requirePermission } from '../auth/auth-context.js';
import type { AuthRepository } from '../auth/auth-repository.js';
import type { TokenService } from '../auth/token-service.js';
import type { MasterDataRepository, ResourceDefinition } from './master-data-repository.js';

interface RouteResource extends ResourceDefinition {
  path: string;
  createSchema: z.ZodType<Record<string, unknown>>;
  updateSchema: z.ZodType<Record<string, unknown>>;
}

interface MasterDataRoutesOptions {
  authRepository: AuthRepository;
  tokenService: TokenService;
  repository: MasterDataRepository;
}

const uuid = z.uuid();
const nullableText = (max: number): z.ZodType<string | null | undefined> => z.string().trim().max(max).nullable().optional();
const auditColumns = { id: 'id', isActive: 'is_active', createdAt: 'created_at', updatedAt: 'updated_at',
  createdBy: 'created_by', updatedBy: 'updated_by', deletedBy: 'deleted_by' };
const simpleColumns = { id: 'id', isActive: 'is_active', createdAt: 'created_at', updatedAt: 'updated_at' };

function partial(schema: z.ZodObject<z.ZodRawShape>): z.ZodType<Record<string, unknown>> {
  return schema.partial().refine((data) => Object.keys(data).length > 0, 'At least one field is required');
}

const supplier = z.object({ supplierType: z.enum(['INDIVIDUAL', 'COMPANY', 'FOREIGN']),
  legalName: z.string().trim().min(2).max(200), tradeName: nullableText(200), documentNumber: nullableText(40),
  countryCode: z.string().trim().length(2).toUpperCase().optional(), representativeName: nullableText(160),
  email: z.email().nullable().optional(), phone: nullableText(40), notes: z.string().max(5000).nullable().optional(),
  isForeign: z.boolean().optional(), isApproved: z.boolean().optional(), isBlocked: z.boolean().optional(), isActive: z.boolean().optional() });
const category = z.object({ parentId: uuid.nullable().optional(), code: z.string().trim().min(1).max(60).toUpperCase(),
  name: z.string().trim().min(2).max(160), natureCode: z.string().trim().min(1).max(30).toUpperCase().optional(), isActive: z.boolean().optional() });
const costCenter = z.object({ parentId: uuid.nullable().optional(), code: z.string().trim().min(1).max(60).toUpperCase(),
  name: z.string().trim().min(2).max(160), isActive: z.boolean().optional() });
const documentType = z.object({ code: z.string().trim().min(1).max(40).toUpperCase(), name: z.string().trim().min(2).max(120),
  requiresFiscalKey: z.boolean().optional(), isActive: z.boolean().optional() });
const paymentMethod = z.object({ code: z.string().trim().min(1).max(40).toUpperCase(), name: z.string().trim().min(2).max(120),
  isActive: z.boolean().optional() });
const paymentTerm = z.object({ code: z.string().trim().min(1).max(40).toUpperCase(), name: z.string().trim().min(2).max(120),
  installmentCount: z.number().int().min(1).nullable().optional(), intervalDays: z.number().int().min(0).nullable().optional(), isActive: z.boolean().optional() });
const bank = z.object({ code: z.string().trim().min(1).max(20), name: z.string().trim().min(2).max(160), isActive: z.boolean().optional() });
const bankAccount = z.object({ bankId: uuid, accountName: z.string().trim().min(2).max(160), branchNumber: nullableText(30),
  accountNumber: z.string().trim().min(1).max(40), accountType: z.string().trim().min(1).max(30).toUpperCase().optional(),
  pixKey: nullableText(255), isDefault: z.boolean().optional(), isActive: z.boolean().optional() });

const resources: RouteResource[] = [
  { path: '/suppliers', domain: 'DOM-001', entity: 'SUPPLIER', table: 'cadastros.suppliers', createSchema: supplier,
    updateSchema: partial(supplier), searchColumns: ['legal_name', 'trade_name', 'document_number'], hasSoftDelete: true, orderBy: 'legal_name, id',
    columns: { ...auditColumns, supplierType: 'supplier_type', legalName: 'legal_name', tradeName: 'trade_name', documentNumber: 'document_number',
      countryCode: 'country_code', representativeName: 'representative_name', email: 'email', phone: 'phone', notes: 'notes',
      isForeign: 'is_foreign', isApproved: 'is_approved', isBlocked: 'is_blocked' } },
  { path: '/financial-categories', domain: 'DOM-001', entity: 'FINANCIAL_CATEGORY', table: 'cadastros.financial_categories', createSchema: category,
    updateSchema: partial(category), searchColumns: ['code', 'name'], hasSoftDelete: true, orderBy: 'code, id',
    columns: { ...auditColumns, parentId: 'parent_id', code: 'code', name: 'name', natureCode: 'nature_code' } },
  { path: '/cost-centers', domain: 'DOM-001', entity: 'COST_CENTER', table: 'cadastros.cost_centers', createSchema: costCenter,
    updateSchema: partial(costCenter), searchColumns: ['code', 'name'], hasSoftDelete: true, orderBy: 'code, id',
    columns: { ...auditColumns, parentId: 'parent_id', code: 'code', name: 'name' } },
  { path: '/document-types', domain: 'DOM-001', entity: 'DOCUMENT_TYPE', table: 'cadastros.document_types', createSchema: documentType,
    updateSchema: partial(documentType), searchColumns: ['code', 'name'], hasSoftDelete: false, orderBy: 'code, id',
    columns: { ...simpleColumns, code: 'code', name: 'name', requiresFiscalKey: 'requires_fiscal_key' } },
  { path: '/payment-methods', domain: 'DOM-001', entity: 'PAYMENT_METHOD', table: 'cadastros.payment_methods', createSchema: paymentMethod,
    updateSchema: partial(paymentMethod), searchColumns: ['code', 'name'], hasSoftDelete: false, orderBy: 'code, id',
    columns: { ...simpleColumns, code: 'code', name: 'name' } },
  { path: '/payment-terms', domain: 'DOM-001', entity: 'PAYMENT_TERM', table: 'cadastros.payment_terms', createSchema: paymentTerm,
    updateSchema: partial(paymentTerm), searchColumns: ['code', 'name'], hasSoftDelete: false, orderBy: 'code, id',
    columns: { ...simpleColumns, code: 'code', name: 'name', installmentCount: 'installment_count', intervalDays: 'interval_days' } },
  { path: '/banks', domain: 'DOM-003', entity: 'BANK', table: 'tesouraria.banks', createSchema: bank,
    updateSchema: partial(bank), searchColumns: ['code', 'name'], hasSoftDelete: false, orderBy: 'code, id',
    columns: { ...simpleColumns, code: 'code', name: 'name' } },
  { path: '/bank-accounts', domain: 'DOM-003', entity: 'BANK_ACCOUNT', table: 'tesouraria.bank_accounts', createSchema: bankAccount,
    updateSchema: partial(bankAccount), searchColumns: ['account_name', 'branch_number', 'account_number', 'pix_key'], hasSoftDelete: true, orderBy: 'account_name, id',
    columns: { ...auditColumns, bankId: 'bank_id', accountName: 'account_name', branchNumber: 'branch_number', accountNumber: 'account_number',
      accountType: 'account_type', pixKey: 'pix_key', isDefault: 'is_default' } },
];

const listQuery = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(), active: z.enum(['true', 'false']).transform((value) => value === 'true').optional() });
const idParams = z.object({ id: uuid });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApplicationError({ code: 'VALIDATION_ERROR', message: 'Invalid request data', statusCode: 400,
    details: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) });
  return result.data;
}

export function masterDataRoutes(app: FastifyInstance, options: MasterDataRoutesOptions): Promise<void> {
  const authenticate = createAuthenticate(options.authRepository, options.tokenService);
  const canView = requirePermission('MASTER_DATA_VIEW');
  const canManage = requirePermission('MASTER_DATA_MANAGE');

  for (const resource of resources) {
    app.get(resource.path, { preHandler: [authenticate, canView] }, async (request) => {
      const query = parse(listQuery, request.query);
      return options.repository.list(resource, query.page, query.pageSize, query.search, query.active);
    });
    app.get(`${resource.path}/:id`, { preHandler: [authenticate, canView] }, async (request) => {
      const { id } = parse(idParams, request.params);
      const entity = await options.repository.findById(resource, id);
      if (!entity) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'Resource not found', statusCode: 404 });
      return entity;
    });
    app.post(resource.path, { preHandler: [authenticate, canManage] }, async (request, reply) => {
      const userId = request.authUser!.id;
      const entity = await options.repository.create(resource, parse(resource.createSchema, request.body), userId);
      await options.repository.audit(resource, 'CREATED', entity.id as string, userId, null, entity);
      return reply.status(201).send(entity);
    });
    app.patch(`${resource.path}/:id`, { preHandler: [authenticate, canManage] }, async (request) => {
      const { id } = parse(idParams, request.params);
      const previous = await options.repository.findById(resource, id);
      if (!previous) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'Resource not found', statusCode: 404 });
      const entity = await options.repository.update(resource, id, parse(resource.updateSchema, request.body), request.authUser!.id);
      await options.repository.audit(resource, 'UPDATED', id, request.authUser!.id, previous, entity);
      return entity;
    });
    app.delete(`${resource.path}/:id`, { preHandler: [authenticate, canManage] }, async (request, reply) => {
      const { id } = parse(idParams, request.params);
      const previous = await options.repository.findById(resource, id);
      if (!previous) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'Resource not found', statusCode: 404 });
      const entity = await options.repository.deactivate(resource, id, request.authUser!.id);
      await options.repository.audit(resource, 'DEACTIVATED', id, request.authUser!.id, previous, entity);
      return reply.status(204).send();
    });
  }
  return Promise.resolve();
}
