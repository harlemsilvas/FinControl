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
const nullableUuid = (): z.ZodType<string | null | undefined> => uuid.nullable().optional();
const auditColumns = { id: 'id', isActive: 'is_active', createdAt: 'created_at', updatedAt: 'updated_at',
  createdBy: 'created_by', updatedBy: 'updated_by', deletedBy: 'deleted_by' };
const simpleColumns = { id: 'id', isActive: 'is_active', createdAt: 'created_at', updatedAt: 'updated_at' };

function digitsOnly(value: string): string {
  return value.replace(/\D+/g, '');
}

function normalizeOptionalPhone(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!(typeof value === 'string' || typeof value === 'number')) return undefined;
  const trimmed = String(value).trim();
  if (trimmed === '') return undefined;
  return digitsOnly(trimmed);
}

function normalizeOptionalDocument(value: unknown, supplierType: 'INDIVIDUAL' | 'COMPANY' | 'FOREIGN'): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!(typeof value === 'string' || typeof value === 'number')) return undefined;
  const trimmed = String(value).trim();
  if (trimmed === '') return undefined;
  return supplierType === 'FOREIGN' ? trimmed : digitsOnly(trimmed);
}

function normalizeOptionalPostalCode(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!(typeof value === 'string' || typeof value === 'number')) return undefined;
  const trimmed = String(value).trim();
  if (trimmed === '') return undefined;
  return digitsOnly(trimmed);
}

function validateEmail(value: string | null | undefined): boolean {
  if (value === undefined || value === null || value === '') return true;
  return z.email().safeParse(value).success;
}

function validatePhone(value: string | null | undefined): boolean {
  if (value === undefined || value === null || value === '') return true;
  return /^\d{10,11}$/.test(value);
}

function partial(schema: z.ZodObject<z.ZodRawShape>): z.ZodType<Record<string, unknown>> {
  return schema.partial().refine((data) => Object.keys(data).length > 0, 'At least one field is required');
}

function withSupplierRules(schema: z.ZodType<Record<string, unknown>>): z.ZodType<Record<string, unknown>> {
  return schema.transform((input) => {
    const value = input as Record<string, unknown> & { supplierType?: 'INDIVIDUAL' | 'COMPANY' | 'FOREIGN'; email?: string | null; financialEmail?: string | null };
    const supplierType = value.supplierType ?? 'COMPANY';
    return {
      ...value,
      documentNumber: normalizeOptionalDocument(value.documentNumber, supplierType),
      postalCode: normalizeOptionalPostalCode(value.postalCode),
      email: value.email === '' ? undefined : value.email?.trim().toLowerCase(),
      financialEmail: value.financialEmail === '' ? undefined : value.financialEmail?.trim().toLowerCase(),
      phone: normalizeOptionalPhone(value.phone),
      mobilePhone: normalizeOptionalPhone(value.mobilePhone),
      secondaryPhone: normalizeOptionalPhone(value.secondaryPhone),
      markerIds: Array.isArray(value.markerIds) ? [...new Set(value.markerIds.filter((item): item is string => typeof item === 'string'))] : value.markerIds,
    };
  }).superRefine((value, context) => {
    const supplierType = value.supplierType;
    const documentNumber = typeof value.documentNumber === 'string' ? value.documentNumber : undefined;
    const email = typeof value.email === 'string' || value.email == null ? value.email : undefined;
    const financialEmail = typeof value.financialEmail === 'string' || value.financialEmail == null ? value.financialEmail : undefined;
    const postalCode = typeof value.postalCode === 'string' || value.postalCode == null ? value.postalCode : undefined;
    if (supplierType === 'INDIVIDUAL' && documentNumber && !/^\d{11}$/.test(documentNumber)) {
      context.addIssue({ code: 'custom', path: ['documentNumber'], message: 'CPF deve conter 11 dígitos.' });
    }
    if (supplierType === 'COMPANY' && documentNumber && !/^\d{14}$/.test(documentNumber)) {
      context.addIssue({ code: 'custom', path: ['documentNumber'], message: 'CNPJ deve conter 14 dígitos.' });
    }
    if (supplierType === 'FOREIGN' && documentNumber && documentNumber.length > 40) {
      context.addIssue({ code: 'custom', path: ['documentNumber'], message: 'Documento deve ter no máximo 40 caracteres.' });
    }
    if (!validateEmail(email)) {
      context.addIssue({ code: 'custom', path: ['email'], message: 'E-mail inválido.' });
    }
    if (!validateEmail(financialEmail)) {
      context.addIssue({ code: 'custom', path: ['financialEmail'], message: 'E-mail financeiro inválido.' });
    }
    if (postalCode && !/^\d{8}$/.test(postalCode)) {
      context.addIssue({ code: 'custom', path: ['postalCode'], message: 'CEP deve conter 8 dígitos.' });
    }
    for (const [field, label] of [['phone', 'Telefone'], ['mobilePhone', 'Celular'], ['secondaryPhone', 'Telefone adicional']] as const) {
      const phoneValue = typeof value[field] === 'string' || value[field] == null ? value[field] : undefined;
      if (!validatePhone(phoneValue)) {
        context.addIssue({ code: 'custom', path: [field], message: label + ' deve conter DDD e 10 ou 11 dígitos.' });
      }
    }
  });
}

const supplierBase = z.object({ supplierType: z.enum(['INDIVIDUAL', 'COMPANY', 'FOREIGN']),
  legalName: z.string().trim().min(2).max(200), tradeName: nullableText(200), documentNumber: z.unknown().optional(),
  countryCode: z.string().trim().length(2).toUpperCase().optional(), representativeName: nullableText(160),
  email: z.string().trim().max(255).nullable().optional(), phone: z.unknown().optional(), mobilePhone: z.unknown().optional(), secondaryPhone: z.unknown().optional(),
  notes: z.string().max(5000).nullable().optional(), isForeign: z.boolean().optional(), isApproved: z.boolean().optional(), isBlocked: z.boolean().optional(), isActive: z.boolean().optional(),
  statusId: nullableUuid(), stateRegistration: nullableText(60), municipalRegistration: nullableText(60), supplierCategoryId: nullableUuid(),
  postalCode: z.unknown().optional(), street: nullableText(255), streetNumber: nullableText(30), addressComplement: nullableText(120), neighborhood: nullableText(120),
  cityId: nullableUuid(), stateId: nullableUuid(), financialEmail: z.string().trim().max(255).nullable().optional(), markerIds: z.array(uuid).max(50).optional(),
  defaultPaymentMethodId: nullableUuid(), defaultPaymentTermId: nullableUuid(), defaultCostCenterId: nullableUuid(),
  averagePaymentTermDays: z.number().int().min(0).nullable().optional(), preferredPaymentDay: z.number().int().min(1).max(31).nullable().optional(),
  financialNotes: nullableText(5000), internalResponsibleName: nullableText(160), relationshipStartedAt: nullableText(10), internalCode: nullableText(60),
  preferredContactChannel: z.enum(['PHONE', 'WHATSAPP', 'EMAIL', 'IN_PERSON']).nullable().optional(),
  supplierOperationalType: z.enum(['PRODUCT', 'SERVICE', 'PRODUCT_AND_SERVICE']).nullable().optional(),
  defaultDeliveryLeadTimeDays: z.number().int().min(0).nullable().optional(), minimumOrderAmount: z.number().min(0).nullable().optional(),
  preferredCarrierName: nullableText(160), freightMode: z.enum(['CIF', 'FOB', 'PICKUP', 'OWN_DELIVERY', 'NOT_APPLICABLE']).nullable().optional(),
  receivingDays: nullableText(160), additionalInfo: nullableText(5000) });
const supplier = withSupplierRules(supplierBase);
const supplierUpdate = withSupplierRules(partial(supplierBase));
const category = z.object({ parentId: uuid.nullable().optional(), code: z.string().trim().min(1).max(60).toUpperCase(),
  name: z.string().trim().min(2).max(160), natureCode: z.string().trim().min(1).max(30).toUpperCase().optional(), isActive: z.boolean().optional() });
const documentType = z.object({ code: z.string().trim().min(1).max(40).toUpperCase(), name: z.string().trim().min(2).max(120), requiresFiscalKey: z.boolean().optional(), isActive: z.boolean().optional() });
const paymentMethod = z.object({ code: z.string().trim().min(1).max(40).toUpperCase(), name: z.string().trim().min(2).max(120), isActive: z.boolean().optional() });
const paymentTerm = z.object({ code: z.string().trim().min(1).max(40).toUpperCase(), name: z.string().trim().min(2).max(120),
  installmentCount: z.number().int().min(1).nullable().optional(), intervalDays: z.number().int().min(0).nullable().optional(), isActive: z.boolean().optional() });
const bank = z.object({ code: z.string().trim().min(1).max(20), name: z.string().trim().min(2).max(160), isActive: z.boolean().optional() });
const bankAccount = z.object({ bankId: uuid, accountName: z.string().trim().min(2).max(160), branchNumber: nullableText(30),
  accountNumber: z.string().trim().min(1).max(40), accountType: z.string().trim().min(1).max(30).toUpperCase().optional(),
  pixKey: nullableText(255), isDefault: z.boolean().optional(), isActive: z.boolean().optional() });
const supplierStatus = z.object({ code: z.string().trim().min(1).max(30).toUpperCase(), name: z.string().trim().min(2).max(120), isActive: z.boolean().optional() });
const supplierCategory = z.object({ code: z.string().trim().min(1).max(30).toUpperCase(), name: z.string().trim().min(2).max(120), description: nullableText(255), isActive: z.boolean().optional() });
const marker = z.object({ code: z.string().trim().min(1).max(40).toUpperCase(), name: z.string().trim().min(2).max(120), description: nullableText(255), color: nullableText(20), isActive: z.boolean().optional() });
const state = z.object({ code: z.string().trim().length(2).toUpperCase(), name: z.string().trim().min(2).max(120), ibgeCode: z.string().trim().max(10).nullable().optional(), isActive: z.boolean().optional() });
const city = z.object({ stateId: uuid, name: z.string().trim().min(2).max(160), ibgeCode: z.string().trim().max(10).nullable().optional(), isActive: z.boolean().optional() });

const resources: RouteResource[] = [
  { path: '/suppliers', domain: 'DOM-001', entity: 'SUPPLIER', table: 'cadastros.suppliers', createSchema: supplier,
    updateSchema: supplierUpdate, searchColumns: ['legal_name', 'trade_name', 'document_number'], hasSoftDelete: true, orderBy: 'legal_name, id',
    columns: { ...auditColumns, supplierType: 'supplier_type', legalName: 'legal_name', tradeName: 'trade_name', documentNumber: 'document_number',
      countryCode: 'country_code', representativeName: 'representative_name', email: 'email', phone: 'phone', mobilePhone: 'mobile_phone', secondaryPhone: 'secondary_phone', notes: 'notes',
      isForeign: 'is_foreign', isApproved: 'is_approved', isBlocked: 'is_blocked', statusId: 'status_id', stateRegistration: 'state_registration',
      municipalRegistration: 'municipal_registration', supplierCategoryId: 'supplier_category_id', postalCode: 'postal_code', street: 'street', streetNumber: 'street_number',
      addressComplement: 'address_complement', neighborhood: 'neighborhood', cityId: 'city_id', stateId: 'state_id', financialEmail: 'financial_email',
      defaultPaymentMethodId: 'default_payment_method_id', defaultPaymentTermId: 'default_payment_term_id', defaultCostCenterId: 'default_cost_center_id',
      averagePaymentTermDays: 'average_payment_term_days', preferredPaymentDay: 'preferred_payment_day', financialNotes: 'financial_notes',
      internalResponsibleName: 'internal_responsible_name', relationshipStartedAt: 'relationship_started_at', internalCode: 'internal_code',
      preferredContactChannel: 'preferred_contact_channel', supplierOperationalType: 'supplier_operational_type', defaultDeliveryLeadTimeDays: 'default_delivery_lead_time_days',
      minimumOrderAmount: 'minimum_order_amount', preferredCarrierName: 'preferred_carrier_name', freightMode: 'freight_mode', receivingDays: 'receiving_days', additionalInfo: 'additional_info' } },
  { path: '/supplier-statuses', domain: 'DOM-001', entity: 'SUPPLIER_STATUS', table: 'cadastros.supplier_statuses', createSchema: supplierStatus,
    updateSchema: partial(supplierStatus), searchColumns: ['code', 'name'], hasSoftDelete: false, orderBy: 'name, id',
    columns: { ...simpleColumns, code: 'code', name: 'name' } },
  { path: '/supplier-categories', domain: 'DOM-001', entity: 'SUPPLIER_CATEGORY', table: 'cadastros.supplier_categories', createSchema: supplierCategory,
    updateSchema: partial(supplierCategory), searchColumns: ['code', 'name', 'description'], hasSoftDelete: true, orderBy: 'name, id',
    columns: { ...auditColumns, code: 'code', name: 'name', description: 'description' } },
  { path: '/markers', domain: 'DOM-001', entity: 'MARKER', table: 'cadastros.markers', createSchema: marker,
    updateSchema: partial(marker), searchColumns: ['code', 'name', 'description'], hasSoftDelete: true, orderBy: 'name, id',
    columns: { ...auditColumns, code: 'code', name: 'name', description: 'description', color: 'color' } },
  { path: '/states', domain: 'DOM-001', entity: 'STATE', table: 'cadastros.states', createSchema: state,
    updateSchema: partial(state), searchColumns: ['code', 'name', 'ibge_code'], hasSoftDelete: false, orderBy: 'name, id',
    columns: { ...simpleColumns, code: 'code', name: 'name', ibgeCode: 'ibge_code' } },
  { path: '/cities', domain: 'DOM-001', entity: 'CITY', table: 'cadastros.cities', createSchema: city,
    updateSchema: partial(city), searchColumns: ['name', 'ibge_code'], hasSoftDelete: false, orderBy: 'name, id',
    columns: { ...simpleColumns, stateId: 'state_id', name: 'name', ibgeCode: 'ibge_code' } },
  { path: '/financial-categories', domain: 'DOM-001', entity: 'FINANCIAL_CATEGORY', table: 'cadastros.financial_categories', createSchema: category,
    updateSchema: partial(category), searchColumns: ['code', 'name'], hasSoftDelete: true, orderBy: 'code, id',
    columns: { ...auditColumns, parentId: 'parent_id', code: 'code', name: 'name', natureCode: 'nature_code' } },
  { path: '/cost-centers', domain: 'DOM-001', entity: 'COST_CENTER', table: 'cadastros.cost_centers', createSchema: category,
    updateSchema: partial(category), searchColumns: ['code', 'name'], hasSoftDelete: true, orderBy: 'code, id',
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

const activeQuery = z.union([z.boolean(), z.enum(['true', 'false'])]).transform((value) => value === true || value === 'true');
const listQuery = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(100).optional(), active: activeQuery.optional() });
const idParams = z.object({ id: uuid });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApplicationError({ code: 'VALIDATION_ERROR', message: 'Invalid request data', statusCode: 400,
    details: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) });
  return result.data;
}

function isSupplierResource(resource: RouteResource): boolean {
  return resource.table === 'cadastros.suppliers';
}

function extractMarkerIds(payload: Record<string, unknown>): string[] | undefined {
  if (!('markerIds' in payload)) return undefined;
  return Array.isArray(payload.markerIds) ? payload.markerIds.filter((item): item is string => typeof item === 'string') : [];
}

function withoutMarkerIds(payload: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...payload };
  delete copy.markerIds;
  return copy;
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
    app.get(resource.path + '/:id', { preHandler: [authenticate, canView] }, async (request) => {
      const { id } = parse(idParams, request.params);
      const entity = await options.repository.findById(resource, id, true);
      if (!entity) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'Resource not found', statusCode: 404 });
      return entity;
    });
    app.post(resource.path, { preHandler: [authenticate, canManage] }, async (request, reply) => {
      const userId = request.authUser!.id;
      const payload = parse(resource.createSchema, request.body);
      const markerIds = isSupplierResource(resource) ? extractMarkerIds(payload) : undefined;
      let entity = await options.repository.create(resource, withoutMarkerIds(payload), userId);
      if (isSupplierResource(resource) && markerIds) {
        await options.repository.replaceSupplierMarkers(entity.id as string, markerIds, userId);
        entity = await options.repository.findById(resource, entity.id as string, true) ?? entity;
      }
      await options.repository.audit(resource, 'CREATED', entity.id as string, userId, null, entity);
      return reply.status(201).send(entity);
    });
    app.patch(resource.path + '/:id', { preHandler: [authenticate, canManage] }, async (request) => {
      const { id } = parse(idParams, request.params);
      const previous = await options.repository.findById(resource, id, true);
      if (!previous) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'Resource not found', statusCode: 404 });
      const payload = parse(resource.updateSchema, request.body);
      const markerIds = isSupplierResource(resource) ? extractMarkerIds(payload) : undefined;
      let entity = await options.repository.update(resource, id, withoutMarkerIds(payload), request.authUser!.id);
      if (isSupplierResource(resource) && markerIds) {
        await options.repository.replaceSupplierMarkers(id, markerIds, request.authUser!.id);
        entity = await options.repository.findById(resource, id, true) ?? entity;
      }
      await options.repository.audit(resource, 'UPDATED', id, request.authUser!.id, previous, entity);
      return entity;
    });
    app.delete(resource.path + '/:id', { preHandler: [authenticate, canManage] }, async (request, reply) => {
      const { id } = parse(idParams, request.params);
      const previous = await options.repository.findById(resource, id, true);
      if (!previous) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'Resource not found', statusCode: 404 });
      const entity = await options.repository.deactivate(resource, id, request.authUser!.id);
      await options.repository.audit(resource, 'DEACTIVATED', id, request.authUser!.id, previous, entity);
      return reply.status(204).send();
    });
    app.post(resource.path + '/:id/reactivate', { preHandler: [authenticate, canManage] }, async (request, reply) => {
      const { id } = parse(idParams, request.params);
      const previous = await options.repository.findById(resource, id, true);
      if (!previous) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'Resource not found', statusCode: 404 });
      const entity = await options.repository.reactivate(resource, id, request.authUser!.id);
      await options.repository.audit(resource, 'REACTIVATED', id, request.authUser!.id, previous, entity);
      return reply.status(200).send(entity);
    });
  }
  return Promise.resolve();
}
