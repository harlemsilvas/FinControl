import { randomUUID } from 'node:crypto';
import { ApplicationError } from '../../common/errors/application-error.js';
import type { Database, QueryExecutor } from '../../infrastructure/database/database.js';

export type BankMovementType = 'CASH_BALANCE' | 'MARKETPLACE_REPASS' | 'MANUAL_ENTRY' | 'MANUAL_ADJUSTMENT';

export interface BankMovementInput {
  bankAccountId: string;
  movementType: BankMovementType;
  movementDate: string;
  amount: number;
  costCenterId?: string | null;
  description?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface BankTransferInput {
  fromBankAccountId: string;
  toBankAccountId: string;
  movementDate: string;
  amount: number;
  description?: string | null;
  referenceNumber?: string | null;
  notes?: string | null;
}

export interface BankMovementListFilters {
  bankAccountId?: string;
  companyId?: string;
  movementType?: string;
  direction?: 'IN' | 'OUT';
  from?: string;
  to?: string;
}

interface BankAccountRow extends Record<string, unknown> {
  id: string;
  company_id: string;
  account_name: string;
}

interface MovementRow extends Record<string, unknown> {
  id: string;
  bank_account_id: string;
  company_id: string;
  direction: 'IN' | 'OUT';
  amount: string;
  transfer_group_id: string | null;
}

function camel(key: string): string { return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()); }
function api(row: Record<string, unknown>): Record<string, unknown> { return Object.fromEntries(Object.entries(row).map(([key, value]) => [camel(key), value])); }

export class TreasuryRepository {
  constructor(private readonly database: Database) {}

  async listBalances(page: number, pageSize: number, companyId?: string): Promise<object> {
    const values: unknown[] = [];
    const conditions = ['ba.deleted_at IS NULL'];
    if (companyId) {
      values.push(companyId);
      conditions.push(`ba.company_id = $${values.length}`);
    }
    const where = conditions.join(' AND ');
    const from = `FROM tesouraria.bank_accounts ba
      JOIN tesouraria.banks b ON b.id = ba.bank_id
      LEFT JOIN cadastros.companies c ON c.id = ba.company_id
      LEFT JOIN tesouraria.v_bank_account_balances balance ON balance.bank_account_id = ba.id`;
    const count = await this.database.query<{ total: string } & Record<string, unknown>>(`SELECT count(*)::text total ${from} WHERE ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const result = await this.database.query(`SELECT ba.id bank_account_id,ba.account_name,ba.branch_number,ba.account_number,ba.account_type,
        ba.company_id,COALESCE(NULLIF(c.trade_name,''),c.legal_name) company_name,b.name bank_name,
        COALESCE(balance.official_balance,0)::text official_balance
      ${from} WHERE ${where}
      ORDER BY COALESCE(NULLIF(c.trade_name,''),c.legal_name),ba.account_name,ba.id
      LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { data: result.rows.map(api), page, pageSize, total: Number(count.rows[0]?.total ?? 0) };
  }

  async listMovements(page: number, pageSize: number, filters: BankMovementListFilters = {}): Promise<object> {
    const values: unknown[] = [];
    const conditions = ['1 = 1'];
    if (filters.bankAccountId) { values.push(filters.bankAccountId); conditions.push(`m.bank_account_id = $${values.length}`); }
    if (filters.companyId) { values.push(filters.companyId); conditions.push(`m.company_id = $${values.length}`); }
    if (filters.movementType) { values.push(filters.movementType); conditions.push(`m.movement_type = $${values.length}`); }
    if (filters.direction) { values.push(filters.direction); conditions.push(`m.direction = $${values.length}`); }
    if (filters.from) { values.push(filters.from); conditions.push(`m.movement_date >= $${values.length}::date`); }
    if (filters.to) { values.push(filters.to); conditions.push(`m.movement_date <= $${values.length}::date`); }
    const where = conditions.join(' AND ');
    const from = `FROM tesouraria.bank_account_movements m
      JOIN tesouraria.bank_accounts ba ON ba.id = m.bank_account_id
      JOIN tesouraria.banks b ON b.id = ba.bank_id
      JOIN cadastros.companies c ON c.id = m.company_id
      LEFT JOIN cadastros.cost_centers cc ON cc.id = m.cost_center_id
      LEFT JOIN tesouraria.bank_account_movements reversal ON reversal.reversal_of_movement_id = m.id`;
    const count = await this.database.query<{ total: string } & Record<string, unknown>>(`SELECT count(*)::text total ${from} WHERE ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const result = await this.database.query(`SELECT m.*,ba.account_name,b.name bank_name,
        COALESCE(NULLIF(c.trade_name,''),c.legal_name) company_name,cc.name cost_center_name,
        reversal.id reversal_movement_id
      ${from} WHERE ${where}
      ORDER BY m.movement_date DESC,m.created_at DESC,m.id DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { data: result.rows.map(api), page, pageSize, total: Number(count.rows[0]?.total ?? 0) };
  }

  async createManualEntry(input: BankMovementInput, userId: string, isMaster: boolean): Promise<object> {
    return this.database.transaction(async (tx) => {
      if (input.movementType === 'MANUAL_ADJUSTMENT' && !isMaster) {
        throw new ApplicationError({ code: 'FORBIDDEN', message: 'Only admin users can create manual balance adjustments', statusCode: 403 });
      }
      if (['MARKETPLACE_REPASS', 'MANUAL_ENTRY'].includes(input.movementType) && !input.costCenterId) {
        throw new ApplicationError({ code: 'COST_CENTER_REQUIRED', message: 'Cost center is required for this bank movement', statusCode: 400 });
      }
      const account = await this.loadBankAccount(tx, input.bankAccountId);
      if (input.movementType === 'CASH_BALANCE') {
        await this.ensureNoActiveCashBalance(tx, input.bankAccountId);
      }
      const movement = await this.insertMovement(tx, {
        bankAccountId: input.bankAccountId,
        companyId: account.company_id,
        costCenterId: input.costCenterId ?? null,
        relatedPaymentId: null,
        transferGroupId: null,
        reversalOfMovementId: null,
        movementType: input.movementType,
        direction: 'IN',
        movementDate: input.movementDate,
        amount: input.amount,
        description: input.description?.trim() || this.defaultDescription(input.movementType),
        referenceNumber: input.referenceNumber ?? null,
        notes: input.notes ?? null,
        isSystemGenerated: false,
        userId,
      });
      await this.audit(tx, 'BANK_ACCOUNT_MOVEMENT', movement.id as string, 'CREATED', userId, null, movement);
      return movement;
    });
  }

  async transfer(input: BankTransferInput, userId: string): Promise<object> {
    return this.database.transaction(async (tx) => {
      if (input.fromBankAccountId === input.toBankAccountId) {
        throw new ApplicationError({ code: 'INVALID_TRANSFER_ACCOUNT', message: 'Transfer requires different bank accounts', statusCode: 400 });
      }
      const from = await this.loadBankAccount(tx, input.fromBankAccountId);
      const to = await this.loadBankAccount(tx, input.toBankAccountId);
      if (from.company_id !== to.company_id) {
        throw new ApplicationError({ code: 'CROSS_COMPANY_TRANSFER_BLOCKED', message: 'Transfers between different CNPJs are blocked in the MVP', statusCode: 409 });
      }
      await this.ensureSufficientBalance(tx, input.fromBankAccountId, input.amount);
      const transferGroupId = randomUUID();
      const description = input.description?.trim() || `Transferência entre contas ${from.account_name} e ${to.account_name}`;
      const out = await this.insertMovement(tx, {
        bankAccountId: from.id, companyId: from.company_id, costCenterId: null, relatedPaymentId: null,
        transferGroupId, reversalOfMovementId: null, movementType: 'TRANSFER', direction: 'OUT',
        movementDate: input.movementDate, amount: input.amount, description, referenceNumber: input.referenceNumber ?? null,
        notes: input.notes ?? null, isSystemGenerated: false, userId,
      });
      const incoming = await this.insertMovement(tx, {
        bankAccountId: to.id, companyId: to.company_id, costCenterId: null, relatedPaymentId: null,
        transferGroupId, reversalOfMovementId: null, movementType: 'TRANSFER', direction: 'IN',
        movementDate: input.movementDate, amount: input.amount, description, referenceNumber: input.referenceNumber ?? null,
        notes: input.notes ?? null, isSystemGenerated: false, userId,
      });
      await this.audit(tx, 'BANK_ACCOUNT_TRANSFER', transferGroupId, 'CREATED', userId, null, { out, incoming });
      return { transferGroupId, out, incoming };
    });
  }

  async reverseMovement(id: string, reason: string, userId: string): Promise<object> {
    return this.database.transaction(async (tx) => {
      const source = await tx.query<MovementRow>(`SELECT * FROM tesouraria.bank_account_movements WHERE id=$1 FOR UPDATE`, [id]);
      const row = source.rows[0];
      if (!row) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'Bank account movement not found', statusCode: 404 });
      const targets = row.transfer_group_id
        ? await tx.query<MovementRow>(`SELECT * FROM tesouraria.bank_account_movements WHERE transfer_group_id=$1 FOR UPDATE`, [row.transfer_group_id])
        : source;
      const reversed = [];
      for (const target of targets.rows) {
        const existing = await tx.query(`SELECT 1 FROM tesouraria.bank_account_movements WHERE reversal_of_movement_id=$1 LIMIT 1`, [target.id]);
        if (existing.rowCount) throw new ApplicationError({ code: 'BANK_MOVEMENT_ALREADY_REVERSED', message: 'Bank account movement was already reversed', statusCode: 409 });
        const reversal = await this.insertMovement(tx, {
          bankAccountId: target.bank_account_id,
          companyId: target.company_id,
          costCenterId: null,
          relatedPaymentId: null,
          transferGroupId: target.transfer_group_id,
          reversalOfMovementId: target.id,
          movementType: 'REVERSAL',
          direction: target.direction === 'IN' ? 'OUT' : 'IN',
          movementDate: new Date().toISOString().slice(0, 10),
          amount: Number(target.amount),
          description: `Estorno: ${reason}`.slice(0, 255),
          referenceNumber: null,
          notes: reason,
          isSystemGenerated: true,
          userId,
        });
        reversed.push(reversal);
      }
      await this.audit(tx, 'BANK_ACCOUNT_MOVEMENT', id, 'REVERSED', userId, null, { reason, reversed });
      return { reversed };
    });
  }

  private async loadBankAccount(tx: QueryExecutor, bankAccountId: string): Promise<BankAccountRow> {
    const result = await tx.query<{ id: string; company_id: string | null; account_name: string } & Record<string, unknown>>(
      `SELECT id,company_id,account_name FROM tesouraria.bank_accounts
       WHERE id=$1 AND is_active AND deleted_at IS NULL FOR UPDATE`,
      [bankAccountId],
    );
    const row = result.rows[0];
    if (!row) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'Bank account not found', statusCode: 404 });
    if (!row.company_id) throw new ApplicationError({ code: 'BANK_ACCOUNT_COMPANY_REQUIRED', message: 'Bank account must be linked to a company', statusCode: 409 });
    return { id: row.id, company_id: row.company_id, account_name: row.account_name };
  }

  private async ensureNoActiveCashBalance(tx: QueryExecutor, bankAccountId: string): Promise<void> {
    const existing = await tx.query(
      `SELECT 1
       FROM tesouraria.bank_account_movements m
       WHERE m.bank_account_id=$1
         AND m.movement_type='CASH_BALANCE'
         AND NOT EXISTS (
           SELECT 1 FROM tesouraria.bank_account_movements r WHERE r.reversal_of_movement_id=m.id
         )
       LIMIT 1`,
      [bankAccountId],
    );
    if (existing.rowCount) {
      throw new ApplicationError({ code: 'CASH_BALANCE_ALREADY_EXISTS', message: 'Bank account already has an active cash balance movement', statusCode: 409 });
    }
  }

  private async ensureSufficientBalance(tx: QueryExecutor, bankAccountId: string, amount: number): Promise<void> {
    const result = await tx.query<{ official_balance: string } & Record<string, unknown>>(
      `SELECT official_balance::text FROM tesouraria.v_bank_account_balances WHERE bank_account_id=$1`,
      [bankAccountId],
    );
    if (Number(result.rows[0]?.official_balance ?? 0) < amount) {
      throw new ApplicationError({ code: 'INSUFFICIENT_BANK_BALANCE', message: 'Bank account has insufficient official balance', statusCode: 409 });
    }
  }

  private defaultDescription(type: string): string {
    return {
      CASH_BALANCE: 'Saldo de Caixa',
      MARKETPLACE_REPASS: 'Repasse de marketplace',
      MANUAL_ENTRY: 'Entrada manual',
      MANUAL_ADJUSTMENT: 'Ajuste manual de saldo',
    }[type] ?? 'Movimento bancário';
  }

  private async insertMovement(tx: QueryExecutor, input: {
    bankAccountId: string; companyId: string; costCenterId: string | null; relatedPaymentId: string | null;
    transferGroupId: string | null; reversalOfMovementId: string | null; movementType: string; direction: 'IN' | 'OUT';
    movementDate: string; amount: number; description: string; referenceNumber: string | null; notes: string | null;
    isSystemGenerated: boolean; userId: string;
  }): Promise<Record<string, unknown>> {
    const result = await tx.query(`INSERT INTO tesouraria.bank_account_movements (
        bank_account_id,company_id,cost_center_id,related_payment_id,transfer_group_id,reversal_of_movement_id,
        movement_type,direction,movement_date,amount,description,reference_number,notes,is_system_generated,created_by
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`, [
      input.bankAccountId, input.companyId, input.costCenterId, input.relatedPaymentId, input.transferGroupId, input.reversalOfMovementId,
      input.movementType, input.direction, input.movementDate, input.amount, input.description, input.referenceNumber, input.notes,
      input.isSystemGenerated, input.userId,
    ]);
    return api(result.rows[0]!);
  }

  private async audit(tx: QueryExecutor, entity: string, id: string, action: string, userId: string, previous: object | null, next: object | null): Promise<void> {
    await tx.query(`INSERT INTO administracao.audit_events(domain_code,entity_name,entity_id,action_code,previous_data,new_data,user_id,source_code)
      VALUES('DOM-003',$1,$2,$3,$4,$5,$6,'API')`, [entity, id, action, previous ? JSON.stringify(previous) : null, next ? JSON.stringify(next) : null, userId]);
  }
}
