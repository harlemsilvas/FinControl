import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApplicationError } from '../../common/errors/application-error.js';
import { createAuthenticate, requirePermission } from '../auth/auth-context.js';
import type { AuthRepository } from '../auth/auth-repository.js';
import type { TokenService } from '../auth/token-service.js';
import type { BankMovementInput, BankMovementListFilters, BankTransferInput, TreasuryRepository } from './treasury-repository.js';

interface Options { authRepository: AuthRepository; tokenService: TokenService; repository: TreasuryRepository }

const uuid = z.uuid();
const money = z.number().finite().positive();
const list = z.object({ page: z.coerce.number().int().min(1).default(1), pageSize: z.coerce.number().int().min(1).max(100).default(20) });
const balancesList = list.extend({ companyId: uuid.optional() });
const movementList = list.extend({
  bankAccountId: uuid.optional(),
  companyId: uuid.optional(),
  movementType: z.enum(['CASH_BALANCE', 'MARKETPLACE_REPASS', 'MANUAL_ENTRY', 'MANUAL_ADJUSTMENT', 'PAYABLE_PAYMENT', 'TRANSFER', 'REVERSAL']).optional(),
  direction: z.enum(['IN', 'OUT']).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
}) satisfies z.ZodType<{ page: number; pageSize: number } & BankMovementListFilters>;
const manualEntry = z.object({
  bankAccountId: uuid,
  movementType: z.enum(['CASH_BALANCE', 'MARKETPLACE_REPASS', 'MANUAL_ENTRY', 'MANUAL_ADJUSTMENT']),
  movementDate: z.iso.date(),
  amount: money,
  costCenterId: uuid.nullable().optional(),
  description: z.string().trim().min(1).max(255).nullable().optional(),
  referenceNumber: z.string().trim().max(100).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
}) satisfies z.ZodType<BankMovementInput>;
const transfer = z.object({
  fromBankAccountId: uuid,
  toBankAccountId: uuid,
  movementDate: z.iso.date(),
  amount: money,
  description: z.string().trim().min(1).max(255).nullable().optional(),
  referenceNumber: z.string().trim().max(100).nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
}) satisfies z.ZodType<BankTransferInput>;
const id = z.object({ id: uuid });
const reversal = z.object({ reason: z.string().trim().min(3).max(1000) });

function parse<T>(schema: z.ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApplicationError({ code: 'VALIDATION_ERROR', message: 'Invalid request data', statusCode: 400,
    details: result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })) });
  return result.data;
}

export function treasuryRoutes(app: FastifyInstance, options: Options): Promise<void> {
  const authenticate = createAuthenticate(options.authRepository, options.tokenService);
  const canView = requirePermission('BANK_ACCOUNT_MOVEMENT_VIEW');
  const canManage = requirePermission('BANK_ACCOUNT_MOVEMENT_MANAGE');

  app.get('/bank-account-balances', { preHandler: [authenticate, canView] }, async (request) => {
    const query = parse(balancesList, request.query);
    return options.repository.listBalances(query.page, query.pageSize, query.companyId);
  });

  app.get('/bank-account-movements', { preHandler: [authenticate, canView] }, async (request) => {
    const query = parse(movementList, request.query);
    return options.repository.listMovements(query.page, query.pageSize, {
      bankAccountId: query.bankAccountId,
      companyId: query.companyId,
      movementType: query.movementType,
      direction: query.direction,
      from: query.from,
      to: query.to,
    });
  });

  app.post('/bank-account-movements/manual-entry', { preHandler: [authenticate, canManage] }, async (request, reply) => {
    const user = request.authUser!;
    return reply.status(201).send(await options.repository.createManualEntry(parse(manualEntry, request.body), user.id, user.isMaster));
  });

  app.post('/bank-account-transfers', { preHandler: [authenticate, canManage] }, async (request, reply) => {
    return reply.status(201).send(await options.repository.transfer(parse(transfer, request.body), request.authUser!.id));
  });

  app.post('/bank-account-movements/:id/reverse', { preHandler: [authenticate, canManage] }, async (request, reply) => {
    const params = parse(id, request.params);
    const body = parse(reversal, request.body);
    return reply.status(201).send(await options.repository.reverseMovement(params.id, body.reason, request.authUser!.id));
  });

  return Promise.resolve();
}
