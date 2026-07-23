import { ApplicationError } from '../../common/errors/application-error.js';
import type { Database, QueryExecutor } from '../../infrastructure/database/database.js';
import type { StoredAttachment } from '../../infrastructure/storage/attachment-storage.js';

export interface InstallmentInput { installmentNumber: number; installmentCount: number; amount: number; dueDate: string; paymentMethodId: string; notes?: string | null }
export interface TitleInput { supplierId: string; categoryId: string; documentTypeId: string; paymentTermId?: string | null; costCenterId?: string | null;
  documentNumber: string; documentSeries?: string | null; description: string; originCode?: string; issueDate: string; originalAmount: number;
  discountAmount?: number; additionalAmount?: number; notes?: string | null; draft?: boolean; duplicateConfirmed?: boolean; installments: InstallmentInput[] }
export interface PayableListFilters { search?: string; status?: string; dueFrom?: string; dueTo?: string; supplierId?: string; categoryId?: string }
export interface XmlImportListFilters { search?: string; status?: string; dueFrom?: string; dueTo?: string; supplierId?: string; recipientKind?: 'MAIN' | 'BRANCH' | 'UNKNOWN'; recipientDocumentNumber?: string; importedFrom?: string; importedTo?: string }
export interface PaymentEligibleInstallmentFilters { search?: string; status?: string; dueFrom?: string; dueTo?: string; supplierId?: string; companyId?: string }
export interface PaymentListFilters { search?: string; status?: string; paidFrom?: string; paidTo?: string; supplierId?: string; companyId?: string }
export interface PaymentInput { installmentId: string; batchId?: string | null; bankAccountId: string; paymentMethodId: string; paymentDate: string; principalAmount: number; interestAmount?: number; penaltyAmount?: number; discountAmount?: number; additionalAmount?: number; transactionNumber?: string | null; overpaymentConfirmed?: boolean }
export interface XmlImportInstallmentInput { installmentNumber: number; dueDate: string; amount: number; paymentMethodRaw?: string | null; notes?: string | null }
export interface XmlImportGenerateInput { categoryId?: string | null; documentTypeId?: string | null; paymentMethodId?: string | null; paymentTermId?: string | null; costCenterId?: string | null; description?: string | null; duplicateConfirmed?: boolean }
export interface XmlImportInput { accessKey?: string | null; attachmentId?: string | null; rawXml?: string | null; sourceFileName?: string | null; sourceMimeType?: string | null; sourceSizeBytes?: number | null; sourceFileHash?: string | null; supplierLegalName?: string | null; supplierTradeName?: string | null; supplierDocumentNumber?: string | null; supplierStateRegistration?: string | null; supplierCityName?: string | null; supplierStateCode?: string | null; recipientLegalName?: string | null; recipientDocumentNumber?: string | null; recipientStateRegistration?: string | null; recipientCityName?: string | null; recipientStateCode?: string | null; recipientKind?: 'MAIN' | 'BRANCH' | 'UNKNOWN'; mainCompanyDocumentNumber?: string | null; documentModel?: string | null; documentNumber?: string | null; documentSeries?: string | null; issueDate?: string | null; operationDate?: string | null; dueDate?: string | null; productsAmount?: number | null; freightAmount?: number | null; insuranceAmount?: number | null; discountAmount?: number | null; otherAmount?: number | null; invoiceTotalAmount?: number | null; paymentAmount?: number | null; currencyCode?: string; parsedData?: Record<string, unknown>; installments?: XmlImportInstallmentInput[] }
export interface RecurrenceInput { companyId: string; supplierId: string; categoryId: string; costCenterId?: string | null; documentTypeId: string; paymentMethodId: string; paymentTermId?: string | null; description: string; baseDocumentNumber?: string | null; baseAmount: number; frequencyCode: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ANNUAL'; startDate: string; endDate?: string | null; maxOccurrences?: number | null; dueDay?: number | null; isOpenEnded?: boolean; notes?: string | null }
export interface RecurrenceListFilters { search?: string; status?: string; companyId?: string; supplierId?: string; frequencyCode?: string }
export interface RecurrenceGenerationInput { untilDate?: string | null; occurrenceCount?: number | null }
interface ResolvedCompany { id: string; companyType: 'MAIN' | 'BRANCH'; legalName: string; tradeName: string | null; parameters: CompanyParameters | null }
interface CompanyParameters { defaultFinancialCategoryId: string | null; defaultPaymentMethodId: string | null; defaultPaymentTermId: string | null; defaultCostCenterId: string | null; defaultDocumentTypeId: string | null; defaultBankAccountId: string | null; xmlAutoCreateSupplier: boolean; xmlRequireKnownRecipient: boolean }
interface RecurrenceRow extends Record<string, unknown> { id: string; company_id: string; supplier_id: string; category_id: string; cost_center_id: string | null; document_type_id: string; payment_method_id: string; payment_term_id: string | null; description: string; base_document_number: string | null; base_amount: string; frequency_code: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ANNUAL'; start_date: string | Date; end_date: string | Date | null; max_occurrences: number | null; due_day: number | null; generation_window_months: number; status_code: string; generated_count: string }

function camel(key: string): string { return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()); }
function api(row: Record<string, unknown>): Record<string, unknown> { return Object.fromEntries(Object.entries(row).map(([key, value]) => [camel(key), value])); }
function cents(value: number): number { return Math.round(value * 100); }
function moneyAmount(input: PaymentInput): number { return input.principalAmount + (input.interestAmount ?? 0) + (input.penaltyAmount ?? 0) + (input.additionalAmount ?? 0) - (input.discountAmount ?? 0); }
function dateString(value: string | Date | null | undefined): string | null { return value instanceof Date ? value.toISOString().slice(0, 10) : value ?? null; }
function parseDate(value: string): Date { const [year, month, day] = value.split('-').map(Number); return new Date(Date.UTC(year!, month! - 1, day!)); }
function formatDate(value: Date): string { return value.toISOString().slice(0, 10); }
function daysInMonth(year: number, month: number): number { return new Date(Date.UTC(year, month + 1, 0)).getUTCDate(); }
function addDays(value: string, days: number): string { const date = parseDate(value); date.setUTCDate(date.getUTCDate() + days); return formatDate(date); }
function addMonths(value: string, months: number, dueDay?: number | null): string {
  const date = parseDate(value);
  const target = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1));
  target.setUTCDate(Math.min(dueDay ?? date.getUTCDate(), daysInMonth(target.getUTCFullYear(), target.getUTCMonth())));
  return formatDate(target);
}
function minDate(...values: (string | null | undefined)[]): string { return values.filter((value): value is string => Boolean(value)).sort()[0]!; }
function recurrenceDocumentNumber(baseDocumentNumber: string | null, occurrenceDate: string): string {
  const suffix = occurrenceDate.replaceAll('-', '');
  const prefix = (baseDocumentNumber?.trim() || 'REC').slice(0, 80 - suffix.length - 1);
  return `${prefix}-${suffix}`;
}

export class PayablesRepository {
  constructor(private readonly database: Database) {}

  async listRecurrences(page: number, pageSize: number, filters: RecurrenceListFilters = {}): Promise<object> {
    const values: unknown[] = [];
    const conditions = ['r.deleted_at IS NULL'];
    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(r.description ILIKE $${values.length} OR r.base_document_number ILIKE $${values.length} OR s.legal_name ILIKE $${values.length} OR coalesce(company.trade_name,company.legal_name) ILIKE $${values.length})`);
    }
    if (filters.status) { values.push(filters.status); conditions.push(`rs.code=$${values.length}`); }
    if (filters.companyId) { values.push(filters.companyId); conditions.push(`r.company_id=$${values.length}`); }
    if (filters.supplierId) { values.push(filters.supplierId); conditions.push(`r.supplier_id=$${values.length}`); }
    if (filters.frequencyCode) { values.push(filters.frequencyCode); conditions.push(`r.frequency_code=$${values.length}`); }
    const where = conditions.join(' AND ');
    const from = `FROM financeiro.payable_recurrences r
      JOIN financeiro.payable_recurrence_statuses rs ON rs.id=r.status_id
      JOIN cadastros.companies company ON company.id=r.company_id
      JOIN cadastros.suppliers s ON s.id=r.supplier_id
      JOIN cadastros.financial_categories c ON c.id=r.category_id
      JOIN cadastros.document_types dt ON dt.id=r.document_type_id
      JOIN cadastros.payment_methods pm ON pm.id=r.payment_method_id
      LEFT JOIN cadastros.cost_centers cc ON cc.id=r.cost_center_id
      LEFT JOIN cadastros.payment_terms pt ON pt.id=r.payment_term_id
      LEFT JOIN LATERAL (
        SELECT count(*)::integer generated_count,max(occurrence_date) last_occurrence_date
        FROM financeiro.payable_recurrence_titles rt WHERE rt.recurrence_id=r.id
      ) generated ON true`;
    const count = await this.database.query<{ total: string } & Record<string, unknown>>(`SELECT count(*)::text total ${from} WHERE ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const result = await this.database.query(`SELECT r.*,rs.code status_code,rs.name status_name,
        COALESCE(NULLIF(company.trade_name,''),company.legal_name) company_name,
        s.legal_name supplier_name,c.name category_name,dt.name document_type_name,pm.name payment_method_name,
        cc.name cost_center_name,pt.name payment_term_name,
        COALESCE(generated.generated_count,0) generated_count,generated.last_occurrence_date
      ${from} WHERE ${where}
      ORDER BY r.next_occurrence_date NULLS LAST,r.created_at DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { data: result.rows.map(api), page, pageSize, total: Number(count.rows[0]?.total ?? 0) };
  }

  async getRecurrence(id: string): Promise<object | null> {
    const result = await this.database.query(`SELECT r.*,rs.code status_code,rs.name status_name,
        COALESCE(NULLIF(company.trade_name,''),company.legal_name) company_name,
        s.legal_name supplier_name,c.name category_name,dt.name document_type_name,pm.name payment_method_name,
        cc.name cost_center_name,pt.name payment_term_name
      FROM financeiro.payable_recurrences r
      JOIN financeiro.payable_recurrence_statuses rs ON rs.id=r.status_id
      JOIN cadastros.companies company ON company.id=r.company_id
      JOIN cadastros.suppliers s ON s.id=r.supplier_id
      JOIN cadastros.financial_categories c ON c.id=r.category_id
      JOIN cadastros.document_types dt ON dt.id=r.document_type_id
      JOIN cadastros.payment_methods pm ON pm.id=r.payment_method_id
      LEFT JOIN cadastros.cost_centers cc ON cc.id=r.cost_center_id
      LEFT JOIN cadastros.payment_terms pt ON pt.id=r.payment_term_id
      WHERE r.id=$1 AND r.deleted_at IS NULL`, [id]);
    const row = result.rows[0];
    if (!row) return null;
    const titles = await this.listRecurrenceTitles(id);
    return { ...api(row), titles };
  }

  async createRecurrence(input: RecurrenceInput, userId: string): Promise<object> {
    return this.database.transaction(async (tx) => {
      await this.assertRecurrenceReferences(tx, input);
      const result = await tx.query(`INSERT INTO financeiro.payable_recurrences (
          company_id,supplier_id,category_id,cost_center_id,document_type_id,payment_method_id,payment_term_id,
          description,base_document_number,base_amount,frequency_code,start_date,end_date,max_occurrences,due_day,
          is_open_ended,next_occurrence_date,status_id,notes,created_by,updated_by
        ) VALUES (
          $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$12,
          (SELECT id FROM financeiro.payable_recurrence_statuses WHERE code='ACTIVE'),$17,$18,$18
        ) RETURNING *`, [
        input.companyId,input.supplierId,input.categoryId,input.costCenterId ?? null,input.documentTypeId,input.paymentMethodId,input.paymentTermId ?? null,
        input.description,input.baseDocumentNumber ?? null,input.baseAmount,input.frequencyCode,input.startDate,input.endDate ?? null,input.maxOccurrences ?? null,
        input.dueDay ?? null,input.isOpenEnded ?? false,input.notes ?? null,userId,
      ]);
      const row = result.rows[0]!;
      await this.audit(tx,'PAYABLE_RECURRENCE',row.id as string,'CREATED',userId,null,api(row));
      return api(row);
    });
  }

  async updateRecurrence(id: string, input: Partial<RecurrenceInput>, userId: string): Promise<object> {
    const mapping: Record<string,string> = { companyId:'company_id',supplierId:'supplier_id',categoryId:'category_id',costCenterId:'cost_center_id',documentTypeId:'document_type_id',paymentMethodId:'payment_method_id',paymentTermId:'payment_term_id',description:'description',baseDocumentNumber:'base_document_number',baseAmount:'base_amount',frequencyCode:'frequency_code',startDate:'start_date',endDate:'end_date',maxOccurrences:'max_occurrences',dueDay:'due_day',isOpenEnded:'is_open_ended',notes:'notes' };
    const entries = Object.entries(input).filter((entry) => entry[1] !== undefined && mapping[entry[0]]).map(([key,value]) => [mapping[key]!, value] as const);
    if (!entries.length) throw new ApplicationError({ code:'VALIDATION_ERROR', message:'At least one field is required', statusCode:400 });
    return this.database.transaction(async (tx) => {
      const existing = await tx.query<{ id:string; generated_count:string; status_code:string } & Record<string, unknown>>(`SELECT r.*,rs.code status_code,
          (SELECT count(*)::text FROM financeiro.payable_recurrence_titles rt WHERE rt.recurrence_id=r.id) generated_count
        FROM financeiro.payable_recurrences r JOIN financeiro.payable_recurrence_statuses rs ON rs.id=r.status_id
        WHERE r.id=$1 AND r.deleted_at IS NULL FOR UPDATE`, [id]);
      const current = existing.rows[0];
      if (!current) throw new ApplicationError({ code:'RESOURCE_NOT_FOUND', message:'Recurrence not found', statusCode:404 });
      if (['CANCELLED','FINISHED'].includes(current.status_code)) throw new ApplicationError({ code:'RECURRENCE_TERMINAL', message:'Terminal recurrences cannot be updated', statusCode:409 });
      const generated = Number(current.generated_count) > 0;
      if (generated && entries.some(([column]) => ['company_id','supplier_id','frequency_code'].includes(column)))
        throw new ApplicationError({ code:'RECURRENCE_LOCKED_FIELDS', message:'Company, supplier and frequency cannot change after generated titles', statusCode:409 });
      await this.assertRecurrenceReferences(tx, { ...api(current), ...input } as unknown as RecurrenceInput);
      const values = entries.map((entry) => entry[1]);
      values.push(userId,id);
      const result = await tx.query(`UPDATE financeiro.payable_recurrences SET ${entries.map((entry,index)=>`${entry[0]}=$${index+1}`).join(',')},updated_by=$${values.length-1} WHERE id=$${values.length} AND deleted_at IS NULL RETURNING *`, values);
      const row = result.rows[0]!;
      await this.audit(tx,'PAYABLE_RECURRENCE',id,'UPDATED',userId,api(current),api(row));
      return api(row);
    });
  }

  async changeRecurrenceStatus(id: string, statusCode: 'ACTIVE' | 'SUSPENDED' | 'CANCELLED', userId: string, reason?: string | null): Promise<object> {
    return this.database.transaction(async (tx) => {
      const current = await tx.query<{ status_code:string } & Record<string, unknown>>(`SELECT r.*,rs.code status_code FROM financeiro.payable_recurrences r JOIN financeiro.payable_recurrence_statuses rs ON rs.id=r.status_id WHERE r.id=$1 AND r.deleted_at IS NULL FOR UPDATE`, [id]);
      const row = current.rows[0];
      if (!row) throw new ApplicationError({ code:'RESOURCE_NOT_FOUND', message:'Recurrence not found', statusCode:404 });
      if (row.status_code === 'CANCELLED' || row.status_code === 'FINISHED') throw new ApplicationError({ code:'RECURRENCE_TERMINAL', message:'Terminal recurrences cannot change status', statusCode:409 });
      if (statusCode === 'ACTIVE' && row.status_code !== 'SUSPENDED') throw new ApplicationError({ code:'RECURRENCE_REACTIVATE_INVALID', message:'Only suspended recurrences can be reactivated', statusCode:409 });
      const result = await tx.query(`UPDATE financeiro.payable_recurrences SET status_id=(SELECT id FROM financeiro.payable_recurrence_statuses WHERE code=$2),is_active=($2<>'CANCELLED'),updated_by=$3 WHERE id=$1 RETURNING *`, [id,statusCode,userId]);
      const next = result.rows[0]!;
      const action = statusCode === 'ACTIVE' ? 'REACTIVATED' : statusCode;
      await this.audit(tx,'PAYABLE_RECURRENCE',id,action,userId,api(row),{...api(next),reason: reason ?? null});
      return api(next);
    });
  }

  async listRecurrenceTitles(recurrenceId: string): Promise<object[]> {
    const result = await this.database.query(`SELECT rt.*,t.document_number,t.document_series,t.description,t.total_amount::text total_amount,ts.code status_code,
        i.due_date,i.installment_number,i.installment_count,i.open_balance::text open_balance
      FROM financeiro.payable_recurrence_titles rt
      JOIN financeiro.payable_titles t ON t.id=rt.payable_title_id
      JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id
      LEFT JOIN financeiro.payable_installments i ON i.payable_title_id=t.id AND i.deleted_at IS NULL
      WHERE rt.recurrence_id=$1
      ORDER BY rt.sequence_number ASC,i.installment_number ASC`, [recurrenceId]);
    return result.rows.map(api);
  }

  async previewRecurrenceGeneration(id: string, input: RecurrenceGenerationInput, userId: string): Promise<object> {
    const recurrence = await this.loadRecurrenceForGeneration(this.database, id);
    const occurrences = await this.calculatePendingOccurrences(this.database, recurrence, input);
    await this.audit(this.database,'PAYABLE_RECURRENCE',id,'GENERATION_PREVIEWED',userId,null,{ input, occurrences });
    return { recurrenceId: id, occurrences, total: occurrences.length };
  }

  async generateRecurrenceTitles(id: string, input: RecurrenceGenerationInput, userId: string): Promise<object> {
    return this.database.transaction(async (tx) => {
      const recurrence = await this.loadRecurrenceForGeneration(tx, id, true);
      const occurrences = await this.calculatePendingOccurrences(tx, recurrence, input);
      if (!occurrences.length) throw new ApplicationError({ code:'RECURRENCE_NO_OCCURRENCES_TO_GENERATE', message:'There are no pending occurrences to generate', statusCode:409 });
      const generated: object[] = [];
      for (const occurrence of occurrences) {
        const title = await tx.query(`INSERT INTO financeiro.payable_titles (
            supplier_id,company_id,category_id,document_type_id,payment_term_id,cost_center_id,
            document_number,document_series,description,origin_code,issue_date,original_amount,discount_amount,additional_amount,status_id,notes,created_by,updated_by
          ) VALUES (
            $1,$2,$3,$4,$5,$6,$7,NULL,$8,'RECURRENCE',CURRENT_DATE,$9,0,0,
            (SELECT id FROM financeiro.payable_title_statuses WHERE code='OPEN'),$10,$11,$11
          ) RETURNING *`, [
          recurrence.supplier_id,recurrence.company_id,recurrence.category_id,recurrence.document_type_id,recurrence.payment_term_id,recurrence.cost_center_id,
          occurrence.documentNumber,recurrence.description,occurrence.amount,
          `Gerado a partir da recorrência ${id} para a ocorrência ${occurrence.occurrenceDate}.`,userId,
        ]);
        const titleRow = title.rows[0]!;
        await tx.query(`INSERT INTO financeiro.payable_installments (
            payable_title_id,installment_number,installment_count,amount,due_date,payment_method_id,open_balance,status_id,notes,created_by,updated_by
          ) VALUES (
            $1,1,1,$2,$3,$4,$2,
            (SELECT id FROM financeiro.payable_installment_statuses WHERE code=CASE WHEN $3::date<CURRENT_DATE THEN 'OVERDUE' ELSE 'OPEN' END),
            $5,$6,$6
          )`, [titleRow.id,occurrence.amount,occurrence.dueDate,recurrence.payment_method_id,'Parcela 1/1 gerada por recorrência.',userId]);
        await tx.query(`INSERT INTO financeiro.payable_recurrence_titles (
            recurrence_id,payable_title_id,occurrence_date,sequence_number,generated_by,notes
          ) VALUES ($1,$2,$3,$4,$5,$6)`, [id,titleRow.id,occurrence.occurrenceDate,occurrence.sequenceNumber,userId,'Título gerado pelo MVP de contas recorrentes.']);
        const item = { ...api(titleRow), occurrenceDate: occurrence.occurrenceDate, sequenceNumber: occurrence.sequenceNumber, installment: { installmentNumber: 1, installmentCount: 1, amount: occurrence.amount, dueDate: occurrence.dueDate, paymentMethodId: recurrence.payment_method_id } };
        generated.push(item);
        await this.audit(tx,'PAYABLE_TITLE',titleRow.id as string,'CREATED_FROM_RECURRENCE',userId,null,item);
      }
      const lastOccurrence = occurrences.at(-1)!.occurrenceDate;
      const nextOccurrence = this.nextOccurrenceAfter(recurrence, lastOccurrence);
      await tx.query(`UPDATE financeiro.payable_recurrences SET last_generated_until=$2,next_occurrence_date=$3,updated_by=$4 WHERE id=$1`, [id,lastOccurrence,nextOccurrence,userId]);
      await this.audit(tx,'PAYABLE_RECURRENCE',id,'GENERATED_TITLES',userId,null,{ input, generatedCount: generated.length, lastOccurrence, nextOccurrence });
      return { recurrenceId: id, generated, total: generated.length };
    });
  }

  private async loadRecurrenceForGeneration(executor: QueryExecutor, id: string, forUpdate = false): Promise<RecurrenceRow> {
    const result = await executor.query<RecurrenceRow>(`SELECT r.*,rs.code status_code,
        (SELECT count(*)::text FROM financeiro.payable_recurrence_titles rt WHERE rt.recurrence_id=r.id) generated_count
      FROM financeiro.payable_recurrences r
      JOIN financeiro.payable_recurrence_statuses rs ON rs.id=r.status_id
      WHERE r.id=$1 AND r.deleted_at IS NULL ${forUpdate ? 'FOR UPDATE' : ''}`, [id]);
    const recurrence = result.rows[0];
    if (!recurrence) throw new ApplicationError({ code:'RESOURCE_NOT_FOUND', message:'Recurrence not found', statusCode:404 });
    if (recurrence.status_code !== 'ACTIVE') throw new ApplicationError({ code:'RECURRENCE_NOT_ACTIVE', message:'Only active recurrences can generate titles', statusCode:409 });
    return recurrence;
  }

  private async calculatePendingOccurrences(executor: QueryExecutor, recurrence: RecurrenceRow, input: RecurrenceGenerationInput): Promise<{ occurrenceDate: string; dueDate: string; sequenceNumber: number; documentNumber: string; amount: number }[]> {
    if (!input.untilDate && !input.occurrenceCount) throw new ApplicationError({ code:'RECURRENCE_GENERATION_TARGET_REQUIRED', message:'Until date or occurrence count is required', statusCode:400 });
    const today = new Date().toISOString().slice(0, 10);
    const maxWindowDate = addMonths(today, Math.min(Number(recurrence.generation_window_months || 6), 6));
    if (input.untilDate && input.untilDate > maxWindowDate) throw new ApplicationError({ code:'RECURRENCE_GENERATION_WINDOW_EXCEEDED', message:'Generation is limited to at most 6 months ahead', statusCode:400 });
    const stopDate = minDate(input.untilDate ?? maxWindowDate, maxWindowDate, dateString(recurrence.end_date));
    const existingResult = await executor.query<{ occurrence_date: string | Date; sequence_number: number } & Record<string, unknown>>(`SELECT occurrence_date,sequence_number FROM financeiro.payable_recurrence_titles WHERE recurrence_id=$1 ORDER BY occurrence_date`, [recurrence.id]);
    const existingDates = new Set(existingResult.rows.map((row) => dateString(row.occurrence_date)!));
    const generatedCount = Number(recurrence.generated_count || 0);
    const remainingAllowed = recurrence.max_occurrences == null ? Number.POSITIVE_INFINITY : Math.max(0, recurrence.max_occurrences - generatedCount);
    const requestedCount = input.occurrenceCount ?? Number.POSITIVE_INFINITY;
    const limit = Math.min(requestedCount, remainingAllowed);
    if (limit <= 0) return [];
    const result: { occurrenceDate: string; dueDate: string; sequenceNumber: number; documentNumber: string; amount: number }[] = [];
    let occurrence = dateString(recurrence.start_date)!;
    let sequence = generatedCount + 1;
    for (let safety = 0; safety < 1000 && occurrence <= stopDate && result.length < limit; safety += 1) {
      if (!existingDates.has(occurrence)) {
        result.push({ occurrenceDate: occurrence, dueDate: occurrence, sequenceNumber: sequence, documentNumber: recurrenceDocumentNumber(recurrence.base_document_number, occurrence), amount: Number(recurrence.base_amount) });
        sequence += 1;
      }
      occurrence = this.nextOccurrenceAfter(recurrence, occurrence);
    }
    return result;
  }

  private nextOccurrenceAfter(recurrence: Pick<RecurrenceRow,'frequency_code'|'due_day'>, occurrenceDate: string): string {
    if (recurrence.frequency_code === 'WEEKLY') return addDays(occurrenceDate, 7);
    if (recurrence.frequency_code === 'BIWEEKLY') return addDays(occurrenceDate, 14);
    return addMonths(occurrenceDate, recurrence.frequency_code === 'ANNUAL' ? 12 : 1, recurrence.due_day);
  }

  private async assertRecurrenceReferences(tx: QueryExecutor, input: RecurrenceInput): Promise<void> {
    if (!input.isOpenEnded && !input.endDate && !input.maxOccurrences) {
      throw new ApplicationError({ code:'RECURRENCE_TERMINATION_REQUIRED', message:'End date, max occurrences or open-ended confirmation is required', statusCode:400 });
    }
    if (input.endDate && input.endDate < input.startDate) {
      throw new ApplicationError({ code:'RECURRENCE_INVALID_END_DATE', message:'End date cannot be before start date', statusCode:400 });
    }
    if (['MONTHLY','ANNUAL'].includes(input.frequencyCode) && !input.dueDay) {
      throw new ApplicationError({ code:'RECURRENCE_DUE_DAY_REQUIRED', message:'Due day is required for monthly and annual recurrences', statusCode:400 });
    }
    const checks = await Promise.all([
      tx.query(`SELECT 1 FROM cadastros.companies WHERE id=$1 AND is_active AND deleted_at IS NULL`, [input.companyId]),
      tx.query(`SELECT 1 FROM cadastros.suppliers WHERE id=$1 AND is_active AND deleted_at IS NULL`, [input.supplierId]),
      tx.query(`SELECT 1 FROM cadastros.financial_categories WHERE id=$1 AND is_active AND deleted_at IS NULL`, [input.categoryId]),
      tx.query(`SELECT 1 FROM cadastros.document_types WHERE id=$1 AND is_active`, [input.documentTypeId]),
      tx.query(`SELECT 1 FROM cadastros.payment_methods WHERE id=$1 AND is_active`, [input.paymentMethodId]),
      input.costCenterId ? tx.query(`SELECT 1 FROM cadastros.cost_centers WHERE id=$1 AND is_active AND deleted_at IS NULL`, [input.costCenterId]) : Promise.resolve({ rows: [{}], rowCount: 1 }),
      input.paymentTermId ? tx.query(`SELECT 1 FROM cadastros.payment_terms WHERE id=$1 AND is_active`, [input.paymentTermId]) : Promise.resolve({ rows: [{}], rowCount: 1 }),
    ]);
    const labels = ['Company','Supplier','Category','Document type','Payment method','Cost center','Payment term'];
    const missing = checks.findIndex((result) => result.rowCount === 0);
    if (missing >= 0) throw new ApplicationError({ code:'RECURRENCE_REFERENCE_INVALID', message:`${labels[missing]} is inactive or does not exist`, statusCode:400 });
  }

  async list(page: number, pageSize: number, filters: PayableListFilters = {}): Promise<object> {
    const values: unknown[] = [];
    const conditions = ['t.deleted_at IS NULL'];

    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(t.document_number ILIKE $${values.length} OR t.description ILIKE $${values.length} OR s.legal_name ILIKE $${values.length})`);
    }
    if (filters.status) { values.push(filters.status); conditions.push(`ts.code=$${values.length}`); }
    if (filters.supplierId) { values.push(filters.supplierId); conditions.push(`t.supplier_id=$${values.length}`); }
    if (filters.categoryId) { values.push(filters.categoryId); conditions.push(`t.category_id=$${values.length}`); }
    if (filters.dueFrom) { values.push(filters.dueFrom); conditions.push(`first_i.due_date >= $${values.length}::date`); }
    if (filters.dueTo) { values.push(filters.dueTo); conditions.push(`first_i.due_date <= $${values.length}::date`); }

    const where = conditions.join(' AND ');
    const from = `FROM financeiro.payable_titles t JOIN cadastros.suppliers s ON s.id=t.supplier_id
      JOIN cadastros.financial_categories c ON c.id=t.category_id JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id
      LEFT JOIN financeiro.v_payable_title_balances b ON b.payable_title_id=t.id
      LEFT JOIN LATERAL (
        SELECT i.due_date,i.payment_method_id FROM financeiro.payable_installments i
        WHERE i.payable_title_id=t.id AND i.deleted_at IS NULL ORDER BY i.installment_number LIMIT 1
      ) first_i ON true
      LEFT JOIN cadastros.payment_methods pm ON pm.id=first_i.payment_method_id`;
    const count = await this.database.query<{ total: string } & Record<string, unknown>>(`SELECT count(*)::text total ${from} WHERE ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const result = await this.database.query(`SELECT t.*,s.legal_name supplier_name,c.name category_name,ts.code status_code,
      COALESCE(b.open_balance,0) open_balance, first_i.due_date first_due_date, pm.name payment_method_name
      ${from} WHERE ${where}
      ORDER BY COALESCE(first_i.due_date,t.issue_date) ASC,t.created_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { data: result.rows.map(api), page, pageSize, total: Number(count.rows[0]?.total ?? 0) };
  }

  async get(id: string): Promise<object | null> {
    const title = await this.database.query(`SELECT t.*,s.legal_name supplier_name,c.name category_name,ts.code status_code
      FROM financeiro.payable_titles t JOIN cadastros.suppliers s ON s.id=t.supplier_id
      JOIN cadastros.financial_categories c ON c.id=t.category_id JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id
      WHERE t.id=$1 AND t.deleted_at IS NULL`, [id]);
    if (!title.rows[0]) return null;
    const [installments, tags, attachments, approvals, payments] = await Promise.all([
      this.database.query(`SELECT i.*,s.code status_code FROM financeiro.payable_installments i JOIN financeiro.payable_installment_statuses s ON s.id=i.status_id WHERE i.payable_title_id=$1 AND i.deleted_at IS NULL ORDER BY installment_number`, [id]),
      this.database.query(`SELECT g.id,g.name FROM financeiro.tags g JOIN financeiro.payable_title_tags x ON x.tag_id=g.id WHERE x.payable_title_id=$1 AND g.deleted_at IS NULL`, [id]),
      this.database.query(`SELECT * FROM financeiro.attachments WHERE payable_title_id=$1 AND deleted_at IS NULL ORDER BY created_at`, [id]),
      this.database.query(`SELECT a.*,s.code status_code FROM financeiro.approvals a JOIN financeiro.approval_statuses s ON s.id=a.status_id WHERE payable_title_id=$1 ORDER BY approval_level`, [id]),
      this.database.query(`SELECT p.*,ps.code status_code FROM financeiro.payments p JOIN financeiro.payment_statuses ps ON ps.id=p.status_id JOIN financeiro.payable_installments i ON i.id=p.payable_installment_id WHERE i.payable_title_id=$1 ORDER BY p.payment_date`, [id]),
    ]);
    return { ...api(title.rows[0]), installments: installments.rows.map(api), tags: tags.rows.map(api), attachments: attachments.rows.map(api), approvals: approvals.rows.map(api), payments: payments.rows.map(api) };
  }

  async listPaymentEligibleInstallments(page: number, pageSize: number, filters: PaymentEligibleInstallmentFilters = {}): Promise<object> {
    const values: unknown[] = [];
    const conditions = ['i.deleted_at IS NULL', 't.deleted_at IS NULL', 'i.open_balance > 0', "ims.code IN ('OPEN','OVERDUE','PARTIALLY_PAID')", "ts.code <> 'CANCELLED'"];
    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(t.document_number ILIKE $${values.length} OR t.description ILIKE $${values.length} OR s.legal_name ILIKE $${values.length})`);
    }
    if (filters.status) { values.push(filters.status); conditions.push(`ims.code=$${values.length}`); }
    if (filters.dueFrom) { values.push(filters.dueFrom); conditions.push(`i.due_date >= $${values.length}::date`); }
    if (filters.dueTo) { values.push(filters.dueTo); conditions.push(`i.due_date <= $${values.length}::date`); }
    if (filters.supplierId) { values.push(filters.supplierId); conditions.push(`t.supplier_id=$${values.length}`); }
    if (filters.companyId) { values.push(filters.companyId); conditions.push(`t.company_id=$${values.length}`); }
    const where = conditions.join(' AND ');
    const from = `FROM financeiro.payable_installments i
      JOIN financeiro.payable_titles t ON t.id=i.payable_title_id
      JOIN cadastros.suppliers s ON s.id=t.supplier_id
      JOIN cadastros.financial_categories c ON c.id=t.category_id
      JOIN cadastros.payment_methods pm ON pm.id=i.payment_method_id
      JOIN financeiro.payable_installment_statuses ims ON ims.id=i.status_id
      JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id
      LEFT JOIN cadastros.companies company ON company.id=t.company_id`;
    const count = await this.database.query<{ total: string } & Record<string, unknown>>(`SELECT count(*)::text total ${from} WHERE ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const result = await this.database.query(`SELECT
        i.id installment_id,i.payable_title_id,t.company_id,COALESCE(NULLIF(company.trade_name,''),company.legal_name) company_name,
        t.supplier_id,s.legal_name supplier_name,t.category_id,c.name category_name,t.document_number,t.document_series,t.description,
        i.installment_number,i.installment_count,i.amount::text amount,i.open_balance::text open_balance,i.due_date,
        i.payment_method_id,pm.name payment_method_name,ims.code installment_status_code,ts.code title_status_code
      ${from} WHERE ${where}
      ORDER BY i.due_date ASC,t.document_number ASC,i.installment_number ASC
      LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { data: result.rows.map(api), page, pageSize, total: Number(count.rows[0]?.total ?? 0) };
  }

  async listPayments(page: number, pageSize: number, filters: PaymentListFilters = {}): Promise<object> {
    const values: unknown[] = [];
    const conditions = ['t.deleted_at IS NULL', 'i.deleted_at IS NULL'];
    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(t.document_number ILIKE $${values.length} OR t.description ILIKE $${values.length} OR s.legal_name ILIKE $${values.length} OR p.transaction_number ILIKE $${values.length})`);
    }
    if (filters.status) { values.push(filters.status); conditions.push(`ps.code=$${values.length}`); }
    if (filters.paidFrom) { values.push(filters.paidFrom); conditions.push(`p.payment_date >= $${values.length}::date`); }
    if (filters.paidTo) { values.push(filters.paidTo); conditions.push(`p.payment_date <= $${values.length}::date`); }
    if (filters.supplierId) { values.push(filters.supplierId); conditions.push(`t.supplier_id=$${values.length}`); }
    if (filters.companyId) { values.push(filters.companyId); conditions.push(`t.company_id=$${values.length}`); }
    const where = conditions.join(' AND ');
    const from = `FROM financeiro.payments p
      JOIN financeiro.payment_statuses ps ON ps.id=p.status_id
      JOIN financeiro.payable_installments i ON i.id=p.payable_installment_id
      JOIN financeiro.payable_titles t ON t.id=i.payable_title_id
      JOIN cadastros.suppliers s ON s.id=t.supplier_id
      JOIN cadastros.payment_methods pm ON pm.id=p.payment_method_id
      JOIN tesouraria.bank_accounts ba ON ba.id=p.bank_account_id
      JOIN tesouraria.banks b ON b.id=ba.bank_id
      LEFT JOIN cadastros.companies company ON company.id=t.company_id
      LEFT JOIN financeiro.payment_reversals pr ON pr.payment_id=p.id`;
    const count = await this.database.query<{ total: string } & Record<string, unknown>>(`SELECT count(*)::text total ${from} WHERE ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const result = await this.database.query(`SELECT
        p.id,p.payable_installment_id,p.bank_account_id,p.payment_method_id,p.payment_date,p.principal_amount::text principal_amount,
        p.interest_amount::text interest_amount,p.penalty_amount::text penalty_amount,p.discount_amount::text discount_amount,
        p.additional_amount::text additional_amount,p.movement_amount::text movement_amount,p.transaction_number,p.created_at,
        ps.code status_code,pr.id reversal_id,pr.reason reversal_reason,pr.reversed_at,
        i.installment_number,i.installment_count,t.id payable_title_id,t.company_id,
        COALESCE(NULLIF(company.trade_name,''),company.legal_name) company_name,
        s.legal_name supplier_name,t.document_number,t.document_series,t.description,
        pm.name payment_method_name,ba.account_name,b.name bank_name
      ${from} WHERE ${where}
      ORDER BY p.payment_date DESC,p.created_at DESC,p.id DESC
      LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { data: result.rows.map((row) => ({ ...api(row), isReversed: Boolean(row.reversal_id) })), page, pageSize, total: Number(count.rows[0]?.total ?? 0) };
  }

  async getPayment(id: string): Promise<object | null> {
    const result = await this.database.query(`SELECT
        p.id,p.payable_installment_id,p.bank_account_id,p.payment_method_id,p.payment_date,p.principal_amount::text principal_amount,
        p.interest_amount::text interest_amount,p.penalty_amount::text penalty_amount,p.discount_amount::text discount_amount,
        p.additional_amount::text additional_amount,p.movement_amount::text movement_amount,p.transaction_number,p.overpayment_confirmed,p.created_at,
        ps.code status_code,pr.id reversal_id,pr.reason reversal_reason,pr.reversed_at,
        i.installment_number,i.installment_count,i.amount::text installment_amount,i.open_balance::text installment_open_balance,i.due_date,
        t.id payable_title_id,t.company_id,t.category_id,c.name category_name,t.cost_center_id,cc.name cost_center_name,
        COALESCE(NULLIF(company.trade_name,''),company.legal_name) company_name,
        s.id supplier_id,s.legal_name supplier_name,t.document_number,t.document_series,t.description,
        pm.name payment_method_name,ba.account_name,ba.account_number,b.name bank_name
      FROM financeiro.payments p
      JOIN financeiro.payment_statuses ps ON ps.id=p.status_id
      JOIN financeiro.payable_installments i ON i.id=p.payable_installment_id
      JOIN financeiro.payable_titles t ON t.id=i.payable_title_id
      JOIN cadastros.suppliers s ON s.id=t.supplier_id
      JOIN cadastros.financial_categories c ON c.id=t.category_id
      JOIN cadastros.payment_methods pm ON pm.id=p.payment_method_id
      JOIN tesouraria.bank_accounts ba ON ba.id=p.bank_account_id
      JOIN tesouraria.banks b ON b.id=ba.bank_id
      LEFT JOIN cadastros.cost_centers cc ON cc.id=t.cost_center_id
      LEFT JOIN cadastros.companies company ON company.id=t.company_id
      LEFT JOIN financeiro.payment_reversals pr ON pr.payment_id=p.id
      WHERE p.id=$1`, [id]);
    const row = result.rows[0];
    if (!row) return null;
    const [bankMovements, attachments] = await Promise.all([
      this.database.query(`SELECT m.*,ba.account_name,b.name bank_name
        FROM tesouraria.bank_account_movements m
        JOIN tesouraria.bank_accounts ba ON ba.id=m.bank_account_id
        JOIN tesouraria.banks b ON b.id=ba.bank_id
        WHERE m.related_payment_id=$1
        ORDER BY m.created_at ASC,m.id ASC`, [id]),
      this.database.query(`SELECT * FROM financeiro.attachments WHERE payment_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC`, [id]),
    ]);
    return {
      ...api(row),
      isReversed: Boolean(row.reversal_id),
      bankMovements: bankMovements.rows.map(api),
      attachments: attachments.rows.map(api),
    };
  }

  async addPaymentAttachment(paymentId: string, attachment: StoredAttachment, userId: string): Promise<object> {
    return this.database.transaction(async (tx) => {
      const payment = await tx.query(`SELECT id FROM financeiro.payments WHERE id=$1`, [paymentId]);
      if (!payment.rowCount) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'Payment not found', statusCode: 404 });
      const result = await tx.query(`INSERT INTO financeiro.attachments (
          payment_id,attachment_type_id,original_name,stored_name,relative_path,mime_type,size_bytes,file_hash,created_by
        ) VALUES (
          $1,(SELECT id FROM cadastros.attachment_types WHERE code='PAYMENT_RECEIPT'),$2,$3,$4,$5,$6,$7,$8
        ) RETURNING *`, [paymentId,attachment.originalName,attachment.storedName,attachment.relativePath,attachment.mimeType,attachment.sizeBytes,attachment.fileHash,userId]);
      const row = api(result.rows[0]!);
      await this.audit(tx,'ATTACHMENT',row.id as string,'CREATED_PAYMENT_RECEIPT',userId,null,row);
      return row;
    });
  }

  async getAttachment(id: string): Promise<object | null> {
    const result = await this.database.query(`SELECT * FROM financeiro.attachments WHERE id=$1 AND deleted_at IS NULL`, [id]);
    const row = result.rows[0];
    return row ? api(row) : null;
  }

  async duplicates(supplierId: string, documentNumber: string, documentSeries: string | null, installmentNumber?: number): Promise<object[]> {
    const result = await this.database.query(`SELECT DISTINCT t.id,t.document_number,t.document_series,t.description,t.created_at
      FROM financeiro.payable_titles t LEFT JOIN financeiro.payable_installments i ON i.payable_title_id=t.id
      WHERE t.supplier_id=$1 AND lower(trim(t.document_number))=lower(trim($2))
      AND coalesce(lower(trim(t.document_series)),'')=coalesce(lower(trim($3)),'') AND t.deleted_at IS NULL
      AND ($4::integer IS NULL OR i.installment_number=$4) ORDER BY t.created_at DESC`, [supplierId, documentNumber, documentSeries, installmentNumber ?? null]);
    return result.rows.map(api);
  }

  async create(input: TitleInput, userId: string): Promise<object> {
    const total = cents(input.originalAmount - (input.discountAmount ?? 0) + (input.additionalAmount ?? 0));
    if (input.installments.reduce((sum, item) => sum + cents(item.amount), 0) !== total)
      throw new ApplicationError({ code: 'INSTALLMENT_TOTAL_MISMATCH', message: 'Installments must equal the title total', statusCode: 400 });
    return this.database.transaction(async (tx) => {
      const duplicate = await tx.query(`SELECT 1 FROM financeiro.payable_titles WHERE supplier_id=$1 AND lower(trim(document_number))=lower(trim($2))
        AND coalesce(lower(trim(document_series)),'')=coalesce(lower(trim($3)),'') AND deleted_at IS NULL LIMIT 1`, [input.supplierId,input.documentNumber,input.documentSeries ?? null]);
      if (duplicate.rowCount && !input.duplicateConfirmed) throw new ApplicationError({ code: 'POSSIBLE_DUPLICATE', message: 'A possible duplicate title exists', statusCode: 409 });
      const title = await tx.query(`INSERT INTO financeiro.payable_titles (supplier_id,category_id,document_type_id,payment_term_id,cost_center_id,
        document_number,document_series,description,origin_code,issue_date,original_amount,discount_amount,additional_amount,status_id,notes,
        duplicate_warning_confirmed,duplicate_warning_confirmed_by,duplicate_warning_confirmed_at,created_by,updated_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,(SELECT id FROM financeiro.payable_title_statuses WHERE code=$14),$15,$16,
        CASE WHEN $16 THEN $17::uuid END,CASE WHEN $16 THEN CURRENT_TIMESTAMP END,$17,$17) RETURNING *`,
      [input.supplierId,input.categoryId,input.documentTypeId,input.paymentTermId ?? null,input.costCenterId ?? null,input.documentNumber,input.documentSeries ?? null,
        input.description,input.originCode ?? 'MANUAL',input.issueDate,input.originalAmount,input.discountAmount ?? 0,input.additionalAmount ?? 0,input.draft ? 'DRAFT':'OPEN',
        input.notes ?? null,input.duplicateConfirmed ?? false,userId]);
      const row = title.rows[0]!;
      for (const item of input.installments) await tx.query(`INSERT INTO financeiro.payable_installments
        (payable_title_id,installment_number,installment_count,amount,due_date,payment_method_id,open_balance,status_id,notes,created_by,updated_by)
        VALUES ($1,$2,$3,$4,$5,$6,$4,(SELECT id FROM financeiro.payable_installment_statuses WHERE code=CASE WHEN $5::date<CURRENT_DATE THEN 'OVERDUE' ELSE 'OPEN' END),$7,$8,$8)`,
      [row.id,item.installmentNumber,item.installmentCount,item.amount,item.dueDate,item.paymentMethodId,item.notes ?? null,userId]);
      await this.audit(tx,'PAYABLE_TITLE',row.id as string,'CREATED',userId,null,api(row));
      if (input.duplicateConfirmed) await this.audit(tx,'PAYABLE_TITLE',row.id as string,'DUPLICATE_OVERRIDE',userId,null,{ confirmed:true });
      return { ...api(row), installments: input.installments };
    });
  }

  async updateTitle(id:string,data:Record<string,unknown>,userId:string):Promise<object>{
    const mapping:Record<string,string>={supplierId:'supplier_id',categoryId:'category_id',documentTypeId:'document_type_id',paymentTermId:'payment_term_id',costCenterId:'cost_center_id',documentNumber:'document_number',documentSeries:'document_series',description:'description',issueDate:'issue_date',originalAmount:'original_amount',discountAmount:'discount_amount',additionalAmount:'additional_amount',notes:'notes'};
    const entries=Object.entries(data).filter((entry)=>entry[1]!==undefined&&mapping[entry[0]]).map(([key,value])=>[mapping[key]!,value] as const);
    if(!entries.length) throw new ApplicationError({code:'VALIDATION_ERROR',message:'At least one field is required',statusCode:400});
    return this.database.transaction(async(tx)=>{const paid=await tx.query(`SELECT 1 FROM financeiro.payments p JOIN financeiro.payable_installments i ON i.id=p.payable_installment_id LEFT JOIN financeiro.payment_reversals r ON r.payment_id=p.id WHERE i.payable_title_id=$1 AND r.id IS NULL`,[id]);
      if(paid.rowCount&&entries.some(([column])=>['supplier_id','document_number','document_series','original_amount','discount_amount','additional_amount'].includes(column)))throw new ApplicationError({code:'PAID_TITLE_IMMUTABLE',message:'Financial fields cannot change while effective payments exist',statusCode:409});
      const values=entries.map((entry)=>entry[1]);values.push(userId,id);const result=await tx.query(`UPDATE financeiro.payable_titles SET ${entries.map((entry,index)=>`${entry[0]}=$${index+1}`).join(',')},updated_by=$${values.length-1} WHERE id=$${values.length} AND deleted_at IS NULL RETURNING *`,values);
      const row=result.rows[0];if(!row)throw new ApplicationError({code:'RESOURCE_NOT_FOUND',message:'Title not found',statusCode:404});await this.audit(tx,'PAYABLE_TITLE',id,'UPDATED',userId,null,api(row));return api(row);});
  }

  async updateInstallment(id: string, amount: number, dueDate: string, paymentMethodId: string, userId: string): Promise<object> {
    return this.database.transaction(async (tx) => {
      const paid = await tx.query(`SELECT 1 FROM financeiro.payments p LEFT JOIN financeiro.payment_reversals r ON r.payment_id=p.id WHERE p.payable_installment_id=$1 AND r.id IS NULL`, [id]);
      if (paid.rowCount) throw new ApplicationError({ code:'PAID_INSTALLMENT_IMMUTABLE',message:'A paid installment cannot be changed before reversal',statusCode:409 });
      const result = await tx.query(`UPDATE financeiro.payable_installments SET amount=$2,open_balance=$2,due_date=$3,payment_method_id=$4,updated_by=$5 WHERE id=$1 AND deleted_at IS NULL RETURNING *`, [id,amount,dueDate,paymentMethodId,userId]);
      const row=result.rows[0]; if(!row) throw new ApplicationError({code:'RESOURCE_NOT_FOUND',message:'Installment not found',statusCode:404});
      const valid=await tx.query<{ is_valid:boolean } & Record<string,unknown>>(`SELECT is_valid FROM financeiro.validate_title_installments($1)`,[row.payable_title_id]);
      if(!valid.rows[0]?.is_valid) throw new ApplicationError({code:'INSTALLMENT_TOTAL_MISMATCH',message:'Installments must equal the title total',statusCode:400});
      await this.audit(tx,'PAYABLE_INSTALLMENT',id,'UPDATED',userId,null,api(row)); return api(row);
    });
  }

  async cancelTitle(id:string,reason:string,userId:string):Promise<void>{ await this.database.transaction(async(tx)=>{
    const payments=await tx.query(`SELECT 1 FROM financeiro.payments p JOIN financeiro.payable_installments i ON i.id=p.payable_installment_id LEFT JOIN financeiro.payment_reversals r ON r.payment_id=p.id WHERE i.payable_title_id=$1 AND r.id IS NULL`,[id]);
    if(payments.rowCount) throw new ApplicationError({code:'TITLE_HAS_PAYMENTS',message:'Reverse effective payments before cancellation',statusCode:409});
    const result=await tx.query(`UPDATE financeiro.payable_titles SET status_id=(SELECT id FROM financeiro.payable_title_statuses WHERE code='CANCELLED'),is_active=false,updated_by=$2 WHERE id=$1 AND deleted_at IS NULL RETURNING id`,[id,userId]);
    if(!result.rowCount) throw new ApplicationError({code:'RESOURCE_NOT_FOUND',message:'Title not found',statusCode:404});
    await tx.query(`UPDATE financeiro.payable_installments SET status_id=(SELECT id FROM financeiro.payable_installment_statuses WHERE code='CANCELLED'),updated_by=$2 WHERE payable_title_id=$1`,[id,userId]);
    await this.audit(tx,'PAYABLE_TITLE',id,'CANCELLED',userId,null,{reason}); }); }

  async addPayment(data:PaymentInput,userId:string):Promise<object>{return this.database.transaction(async(tx)=>{
    const installment=await tx.query<{open_balance:string;title_status:string;company_id:string|null;cost_center_id:string|null;document_number:string;document_series:string|null;supplier_name:string;installment_number:number;installment_count:number}&Record<string,unknown>>(`SELECT i.open_balance::text,ts.code title_status,t.company_id,t.cost_center_id,t.document_number,t.document_series,s.legal_name supplier_name,i.installment_number,i.installment_count
      FROM financeiro.payable_installments i
      JOIN financeiro.payable_titles t ON t.id=i.payable_title_id
      JOIN cadastros.suppliers s ON s.id=t.supplier_id
      JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id
      WHERE i.id=$1 AND i.deleted_at IS NULL AND t.deleted_at IS NULL FOR UPDATE`,[data.installmentId]);
    const current=installment.rows[0]; if(!current) throw new ApplicationError({code:'RESOURCE_NOT_FOUND',message:'Installment not found',statusCode:404});
    if(current.title_status==='CANCELLED') throw new ApplicationError({code:'TITLE_CANCELLED',message:'Cancelled titles cannot receive payments',statusCode:409});
    if(!current.company_id) throw new ApplicationError({code:'PAYABLE_COMPANY_REQUIRED',message:'Payable title must be linked to a company before payment',statusCode:409});
    if(Number(data.principalAmount)>Number(current.open_balance)&&!data.overpaymentConfirmed) throw new ApplicationError({code:'OVERPAYMENT_CONFIRMATION_REQUIRED',message:'Payment exceeds open balance',statusCode:409});
    const bank=await tx.query<{company_id:string|null;account_name:string}&Record<string,unknown>>(`SELECT company_id,account_name FROM tesouraria.bank_accounts WHERE id=$1 AND is_active AND deleted_at IS NULL FOR UPDATE`,[data.bankAccountId]);
    const bankAccount=bank.rows[0]; if(!bankAccount) throw new ApplicationError({code:'RESOURCE_NOT_FOUND',message:'Bank account not found',statusCode:404});
    if(!bankAccount.company_id) throw new ApplicationError({code:'BANK_ACCOUNT_COMPANY_REQUIRED',message:'Bank account must be linked to a company',statusCode:409});
    if(bankAccount.company_id!==current.company_id) throw new ApplicationError({code:'PAYMENT_BANK_ACCOUNT_COMPANY_MISMATCH',message:'Bank account must belong to the same company as the payable title',statusCode:409});
    const movementAmount=moneyAmount(data);
    if(movementAmount<=0) throw new ApplicationError({code:'VALIDATION_ERROR',message:'Payment movement amount must be greater than zero',statusCode:400});
    const balance=await tx.query<{official_balance:string}&Record<string,unknown>>(`SELECT official_balance::text FROM tesouraria.v_bank_account_balances WHERE bank_account_id=$1`,[data.bankAccountId]);
    if(Number(balance.rows[0]?.official_balance ?? 0)<movementAmount) throw new ApplicationError({code:'INSUFFICIENT_BANK_BALANCE',message:'Bank account has insufficient official balance',statusCode:409});
    const result=await tx.query(`INSERT INTO financeiro.payments (payable_installment_id,payment_batch_id,bank_account_id,payment_method_id,payment_date,principal_amount,interest_amount,penalty_amount,discount_amount,additional_amount,transaction_number,overpayment_confirmed,overpayment_confirmed_by,overpayment_confirmed_at,status_id,created_by,updated_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CASE WHEN $12 THEN $13::uuid END,CASE WHEN $12 THEN CURRENT_TIMESTAMP END,(SELECT id FROM financeiro.payment_statuses WHERE code='EFFECTIVE'),$13,$13) RETURNING *`,
    [data.installmentId,data.batchId??null,data.bankAccountId,data.paymentMethodId,data.paymentDate,data.principalAmount,data.interestAmount??0,data.penaltyAmount??0,data.discountAmount??0,data.additionalAmount??0,data.transactionNumber??null,data.overpaymentConfirmed??false,userId]);
    const row=result.rows[0]!;
    const movement=await this.insertPaymentBankMovement(tx,row.id as string,data.bankAccountId,current.company_id,current.cost_center_id,data.paymentDate,movementAmount,
      `Pagamento ${current.document_number}${current.document_series ? `/${current.document_series}` : ''} ${current.installment_number}/${current.installment_count} - ${current.supplier_name}`.slice(0,255),data.transactionNumber??null,userId);
    const next={...api(row),bankMovement:movement};
    await this.audit(tx,'PAYMENT',row.id as string,'CREATED',userId,null,next); return next;});}

  async reversePayment(id:string,reason:string,userId:string):Promise<object>{return this.database.transaction(async(tx)=>{
    const payment=await tx.query<{id:string;status_code:string}&Record<string,unknown>>(`SELECT p.*,ps.code status_code FROM financeiro.payments p JOIN financeiro.payment_statuses ps ON ps.id=p.status_id WHERE p.id=$1 FOR UPDATE`,[id]);
    const current=payment.rows[0]; if(!current) throw new ApplicationError({code:'RESOURCE_NOT_FOUND',message:'Payment not found',statusCode:404});
    const already=await tx.query(`SELECT 1 FROM financeiro.payment_reversals WHERE payment_id=$1 LIMIT 1`,[id]);
    if(already.rowCount) throw new ApplicationError({code:'PAYMENT_ALREADY_REVERSED',message:'Payment was already reversed',statusCode:409});
    const result=await tx.query(`INSERT INTO financeiro.payment_reversals(payment_id,reason,reversed_by) VALUES($1,$2,$3) RETURNING *`,[id,reason,userId]);
    await tx.query(`UPDATE financeiro.payments SET status_id=(SELECT id FROM financeiro.payment_statuses WHERE code='REVERSED'),updated_by=$2 WHERE id=$1`,[id,userId]);
    const reversedMovements=await this.reversePaymentBankMovements(tx,id,reason,userId);
    const row=result.rows[0]!; await this.audit(tx,'PAYMENT',id,'REVERSED',userId,api(current),{reason,reversedMovements}); return {...api(row),reversedMovements};});}

  async createXmlImport(input: XmlImportInput, userId: string): Promise<object> {
    return this.database.transaction(async (tx) => {
      if (input.accessKey) {
        const duplicate = await tx.query(`SELECT id FROM financeiro.xml_imports WHERE access_key=$1 LIMIT 1`, [input.accessKey]);
        if (duplicate.rowCount) throw new ApplicationError({ code: 'XML_IMPORT_DUPLICATE', message: 'XML access key already imported', statusCode: 409 });
      }

      const company = await this.resolveCompanyByDocument(tx, input.recipientDocumentNumber);
      const supplier = await this.findOrCreateXmlSupplier(tx, input, userId);
      const result = await tx.query(`INSERT INTO financeiro.xml_imports (
        access_key,supplier_id,company_id,attachment_id,raw_xml,source_file_name,source_mime_type,source_size_bytes,source_file_hash,
        supplier_legal_name,supplier_trade_name,supplier_document_number,supplier_state_registration,supplier_city_name,supplier_state_code,
        recipient_legal_name,recipient_document_number,recipient_state_registration,recipient_city_name,recipient_state_code,recipient_kind,main_company_document_number,
        document_model,document_number,document_series,issue_date,operation_date,due_date,
        products_amount,freight_amount,insurance_amount,discount_amount,other_amount,invoice_total_amount,payment_amount,currency_code,parsed_data,
        status_id,imported_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,
        (SELECT id FROM financeiro.xml_import_statuses WHERE code='RECEIVED'),$38
      ) RETURNING *`, [
        input.accessKey ?? null,supplier?.id ?? null,company?.id ?? null,input.attachmentId ?? null,input.rawXml ?? null,input.sourceFileName ?? null,input.sourceMimeType ?? null,input.sourceSizeBytes ?? null,input.sourceFileHash ?? null,
        input.supplierLegalName ?? null,input.supplierTradeName ?? null,input.supplierDocumentNumber ?? null,input.supplierStateRegistration ?? null,input.supplierCityName ?? null,input.supplierStateCode ?? null,
        input.recipientLegalName ?? null,input.recipientDocumentNumber ?? null,input.recipientStateRegistration ?? null,input.recipientCityName ?? null,input.recipientStateCode ?? null,company?.companyType ?? 'UNKNOWN',input.mainCompanyDocumentNumber ?? null,
        input.documentModel ?? null,input.documentNumber ?? null,input.documentSeries ?? null,input.issueDate ?? null,input.operationDate ?? null,input.dueDate ?? null,
        input.productsAmount ?? null,input.freightAmount ?? null,input.insuranceAmount ?? null,input.discountAmount ?? null,input.otherAmount ?? null,input.invoiceTotalAmount ?? null,input.paymentAmount ?? null,input.currencyCode ?? 'BRL',JSON.stringify(input.parsedData ?? {}),
        userId
      ]);
      const row = result.rows[0]!;
      const installments: object[] = [];
      for (const item of input.installments ?? []) {
        const installment = await tx.query(`INSERT INTO financeiro.xml_import_installments (xml_import_id,installment_number,due_date,amount,payment_method_raw,notes)
          VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [row.id,item.installmentNumber,item.dueDate,item.amount,item.paymentMethodRaw ?? null,item.notes ?? null]);
        installments.push(api(installment.rows[0]!));
      }
      await this.audit(tx,'XML_IMPORT',row.id as string,'CREATED',userId,null,{...api(row),installments,supplier:supplier?.entity ?? null,supplierWasCreated:supplier?.created ?? false});
      return { ...api(row), installments, supplier: supplier?.entity ?? null, supplierWasCreated: supplier?.created ?? false, company: this.publicCompany(company), companyParameters: company?.parameters ?? null };
    });
  }

  async listXmlImports(page: number, pageSize: number, filters: XmlImportListFilters = {}): Promise<object> {
    const values: unknown[] = [];
    const conditions = ['x.deleted_at IS NULL'];
    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(x.access_key ILIKE $${values.length} OR x.document_number ILIKE $${values.length} OR x.document_series ILIKE $${values.length} OR x.supplier_legal_name ILIKE $${values.length} OR x.supplier_trade_name ILIKE $${values.length} OR x.recipient_legal_name ILIKE $${values.length})`);
    }
    if (filters.status) { values.push(filters.status); conditions.push(`s.code=$${values.length}`); }
    if (filters.dueFrom) { values.push(filters.dueFrom); conditions.push(`x.due_date >= $${values.length}::date`); }
    if (filters.dueTo) { values.push(filters.dueTo); conditions.push(`x.due_date <= $${values.length}::date`); }
    if (filters.supplierId) { values.push(filters.supplierId); conditions.push(`x.supplier_id=$${values.length}`); }
    if (filters.recipientKind) { values.push(filters.recipientKind); conditions.push(`x.recipient_kind=$${values.length}`); }
    if (filters.recipientDocumentNumber) { values.push(filters.recipientDocumentNumber); conditions.push(`x.recipient_document_number=$${values.length}`); }
    if (filters.importedFrom) { values.push(filters.importedFrom); conditions.push(`x.imported_at::date >= $${values.length}::date`); }
    if (filters.importedTo) { values.push(filters.importedTo); conditions.push(`x.imported_at::date <= $${values.length}::date`); }
    const where = conditions.join(' AND ');
    const from = `FROM financeiro.xml_imports x
      JOIN financeiro.xml_import_statuses s ON s.id=x.status_id
      LEFT JOIN cadastros.suppliers supplier ON supplier.id=x.supplier_id
      LEFT JOIN financeiro.payable_titles title ON title.id=x.generated_title_id`;
    const count = await this.database.query<{ total: string } & Record<string, unknown>>(`SELECT count(*)::text total ${from} WHERE ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const result = await this.database.query(`SELECT x.*,s.code status_code,supplier.legal_name resolved_supplier_name,supplier.document_number resolved_supplier_document_number,title.document_number generated_title_document_number
      ${from} WHERE ${where}
      ORDER BY x.imported_at DESC LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { data: await Promise.all(result.rows.map((row) => this.xmlImportApi(row, this.database))), page, pageSize, total: Number(count.rows[0]?.total ?? 0) };
  }

  async getXmlImport(id: string): Promise<object | null> {
    const result = await this.database.query(`SELECT x.*,s.code status_code,supplier.legal_name resolved_supplier_name,supplier.document_number resolved_supplier_document_number,title.document_number generated_title_document_number
      FROM financeiro.xml_imports x
      JOIN financeiro.xml_import_statuses s ON s.id=x.status_id
      LEFT JOIN cadastros.suppliers supplier ON supplier.id=x.supplier_id
      LEFT JOIN financeiro.payable_titles title ON title.id=x.generated_title_id
      WHERE x.id=$1 AND x.deleted_at IS NULL`, [id]);
    const row = result.rows[0];
    if (!row) return null;
    const installments = await this.database.query(`SELECT * FROM financeiro.xml_import_installments WHERE xml_import_id=$1 ORDER BY installment_number`, [id]);
    return { ...await this.xmlImportApi(row, this.database), installments: installments.rows.map(api) };
  }

  async reprocessXmlImport(id: string, userId: string): Promise<object> {
    return this.database.transaction(async (tx) => {
      const current = await tx.query<{ generated_title_id: string | null } & Record<string, unknown>>(`SELECT * FROM financeiro.xml_imports WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, [id]);
      const row = current.rows[0];
      if (!row) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'XML import not found', statusCode: 404 });
      if (row.generated_title_id) throw new ApplicationError({ code: 'XML_IMPORT_ALREADY_GENERATED', message: 'XML import already generated a payable title', statusCode: 409 });
      const result = await tx.query(`UPDATE financeiro.xml_imports SET status_id=(SELECT id FROM financeiro.xml_import_statuses WHERE code='RECEIVED'),error_message=NULL,processed_at=NULL WHERE id=$1 RETURNING *`, [id]);
      const next = result.rows[0]!;
      await this.audit(tx,'XML_IMPORT',id,'REPROCESSED',userId,api(row),api(next));
      return api(next);
    });
  }

  async deleteXmlImport(id: string, userId: string): Promise<void> {
    await this.database.transaction(async (tx) => {
      const current = await tx.query<{ generated_title_id: string | null } & Record<string, unknown>>(`SELECT * FROM financeiro.xml_imports WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, [id]);
      const row = current.rows[0];
      if (!row) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'XML import not found', statusCode: 404 });
      if (row.generated_title_id) throw new ApplicationError({ code: 'XML_IMPORT_ALREADY_GENERATED', message: 'XML import already generated a payable title', statusCode: 409 });
      const result = await tx.query(`UPDATE financeiro.xml_imports SET deleted_at=CURRENT_TIMESTAMP,deleted_by=$2 WHERE id=$1 AND deleted_at IS NULL RETURNING *`, [id,userId]);
      const next = result.rows[0]!;
      await this.audit(tx,'XML_IMPORT',id,'DELETED',userId,api(row),api(next));
    });
  }

  private async findOrCreateXmlSupplier(tx: QueryExecutor, input: XmlImportInput, userId: string): Promise<{ id: string; created: boolean; entity: Record<string, unknown> } | null> {
    const documentNumber = input.supplierDocumentNumber?.replace(/\D+/g, '') ?? '';
    if (!/^\d{11}$/.test(documentNumber) && !/^\d{14}$/.test(documentNumber)) return null;

    const existing = await tx.query(`SELECT * FROM cadastros.suppliers WHERE country_code='BR' AND document_number=$1 AND deleted_at IS NULL LIMIT 1`, [documentNumber]);
    if (existing.rows[0]) return { id: existing.rows[0].id as string, created: false, entity: api(existing.rows[0]) };

    const supplierType = documentNumber.length === 11 ? 'INDIVIDUAL' : 'COMPANY';
    const legalName = input.supplierLegalName?.trim() || input.supplierTradeName?.trim() || `Fornecedor XML ${documentNumber}`;
    const tradeName = input.supplierTradeName?.trim() || null;
    const stateCode = input.supplierStateCode?.trim().toUpperCase() || null;
    const cityName = input.supplierCityName?.trim() || null;
    const notes = `Fornecedor criado automaticamente pela importação XML NFe${input.accessKey ? ` ${input.accessKey}` : ''}.`;
    const created = await tx.query(`INSERT INTO cadastros.suppliers (
        supplier_type,legal_name,trade_name,document_number,country_code,state_registration,supplier_category_id,status_id,state_id,city_id,notes,created_by,updated_by
      ) VALUES (
        $1,$2,$3,$4,'BR',$5,
        (SELECT id FROM cadastros.supplier_categories WHERE code='SUPPLIER'),
        (SELECT id FROM cadastros.supplier_statuses WHERE code='ACTIVE'),
        (SELECT id FROM cadastros.states WHERE code=$6 LIMIT 1),
        (SELECT c.id FROM cadastros.cities c JOIN cadastros.states s ON s.id=c.state_id WHERE s.code=$6 AND lower(c.name)=lower($7) LIMIT 1),
        $8,$9,$9
      ) RETURNING *`, [supplierType,legalName,tradeName,documentNumber,input.supplierStateRegistration ?? null,stateCode,cityName,notes,userId]);
    const entity = api(created.rows[0]!);
    await tx.query(`INSERT INTO administracao.audit_events(domain_code,entity_name,entity_id,action_code,previous_data,new_data,user_id,source_code) VALUES('DOM-001','SUPPLIER',$1,'CREATED_FROM_XML_IMPORT',NULL,$2,$3,'API')`, [entity.id,JSON.stringify(entity),userId]);
    return { id: entity.id as string, created: true, entity };
  }

  async generatePayableFromXml(xmlImportId: string, input: XmlImportGenerateInput, userId: string): Promise<object> {
    return this.database.transaction(async (tx) => {
      const xmlResult = await tx.query<{ id: string; access_key: string | null; supplier_id: string | null; company_id: string | null; recipient_document_number: string | null; generated_title_id: string | null; supplier_legal_name: string | null; document_number: string | null; document_series: string | null; issue_date: string | Date | null; due_date: string | Date | null; invoice_total_amount: string | null; payment_amount: string | null; raw_xml: string | null } & Record<string, unknown>>(
        `SELECT * FROM financeiro.xml_imports WHERE id=$1 AND deleted_at IS NULL FOR UPDATE`, [xmlImportId]);
      const xml = xmlResult.rows[0];
      if (!xml) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'XML import not found', statusCode: 404 });
      if (xml.generated_title_id) throw new ApplicationError({ code: 'XML_IMPORT_ALREADY_GENERATED', message: 'XML import already generated a payable title', statusCode: 409 });
      if (!xml.supplier_id) throw new ApplicationError({ code: 'XML_IMPORT_SUPPLIER_REQUIRED', message: 'XML import must be linked to a supplier before generating payable title', statusCode: 409 });

      const amount = Number(xml.payment_amount ?? xml.invoice_total_amount ?? 0);
      if (!Number.isFinite(amount) || amount <= 0) throw new ApplicationError({ code: 'XML_IMPORT_AMOUNT_REQUIRED', message: 'XML import does not have a valid amount', statusCode: 400 });
      const documentNumber = String(xml.document_number || xml.access_key || xml.id).slice(0, 80);
      const documentSeries = xml.document_series ? String(xml.document_series).slice(0, 30) : null;
      const issueDate = this.toDateString(xml.issue_date) ?? new Date().toISOString().slice(0, 10);
      const description = input.description?.trim() || `NFe ${documentNumber}${xml.supplier_legal_name ? ` - ${xml.supplier_legal_name}` : ''}`;
      const company = await this.resolveXmlCompany(tx, xml);
      const companyId = company?.id ?? xml.company_id ?? null;
      const parameters = company?.parameters ?? null;
      const categoryId = input.categoryId ?? parameters?.defaultFinancialCategoryId;
      const documentTypeId = input.documentTypeId ?? parameters?.defaultDocumentTypeId;
      const paymentMethodId = input.paymentMethodId ?? parameters?.defaultPaymentMethodId;
      const paymentTermId = input.paymentTermId ?? parameters?.defaultPaymentTermId ?? null;
      const costCenterId = input.costCenterId ?? parameters?.defaultCostCenterId ?? null;
      if (!categoryId) throw new ApplicationError({ code: 'XML_IMPORT_CATEGORY_REQUIRED', message: 'Financial category is required to generate a payable title', statusCode: 400 });
      if (!documentTypeId) throw new ApplicationError({ code: 'XML_IMPORT_DOCUMENT_TYPE_REQUIRED', message: 'Document type is required to generate a payable title', statusCode: 400 });
      if (!paymentMethodId) throw new ApplicationError({ code: 'XML_IMPORT_PAYMENT_METHOD_REQUIRED', message: 'Payment method is required to generate payable installments', statusCode: 400 });

      const duplicate = await tx.query(`SELECT 1 FROM financeiro.payable_titles WHERE supplier_id=$1 AND lower(trim(document_number))=lower(trim($2))
        AND coalesce(lower(trim(document_series)),'')=coalesce(lower(trim($3)),'') AND deleted_at IS NULL LIMIT 1`, [xml.supplier_id,documentNumber,documentSeries]);
      if (duplicate.rowCount && !input.duplicateConfirmed) throw new ApplicationError({ code: 'POSSIBLE_DUPLICATE', message: 'A possible duplicate title exists', statusCode: 409 });

      const title = await tx.query(`INSERT INTO financeiro.payable_titles (supplier_id,company_id,category_id,document_type_id,payment_term_id,cost_center_id,
        document_number,document_series,description,origin_code,issue_date,original_amount,discount_amount,additional_amount,status_id,notes,
        duplicate_warning_confirmed,duplicate_warning_confirmed_by,duplicate_warning_confirmed_at,created_by,updated_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'XML',$10,$11,0,0,(SELECT id FROM financeiro.payable_title_statuses WHERE code='OPEN'),$12,$13,
        CASE WHEN $13 THEN $14::uuid END,CASE WHEN $13 THEN CURRENT_TIMESTAMP END,$14,$14) RETURNING *`,
      [xml.supplier_id,companyId,categoryId,documentTypeId,paymentTermId,costCenterId,documentNumber,documentSeries,description,issueDate,amount,
        `Gerado a partir da importação XML ${xml.access_key ?? xml.id}.`,input.duplicateConfirmed ?? false,userId]);
      const titleRow = title.rows[0]!;

      const xmlInstallments = await tx.query<{ installment_number: number; due_date: string | Date | null; amount: string } & Record<string, unknown>>(
        `SELECT installment_number,due_date,amount::text FROM financeiro.xml_import_installments WHERE xml_import_id=$1 ORDER BY installment_number`, [xmlImportId]);
      const installments = this.normalizeXmlInstallments(xmlInstallments.rows, amount, this.toDateString(xml.due_date) ?? issueDate);
      for (const item of installments) {
        await tx.query(`INSERT INTO financeiro.payable_installments
          (payable_title_id,installment_number,installment_count,amount,due_date,payment_method_id,open_balance,status_id,notes,created_by,updated_by)
          VALUES ($1,$2,$3,$4,$5,$6,$4,(SELECT id FROM financeiro.payable_installment_statuses WHERE code=CASE WHEN $5::date<CURRENT_DATE THEN 'OVERDUE' ELSE 'OPEN' END),$7,$8,$8)`,
        [titleRow.id,item.installmentNumber,item.installmentCount,item.amount,item.dueDate,paymentMethodId,item.notes,userId]);
      }

      await tx.query(`UPDATE financeiro.xml_imports SET company_id=COALESCE(company_id,$3),generated_title_id=$2,status_id=(SELECT id FROM financeiro.xml_import_statuses WHERE code='PROCESSED'),processed_at=CURRENT_TIMESTAMP WHERE id=$1`, [xmlImportId,titleRow.id,companyId]);
      await this.audit(tx,'PAYABLE_TITLE',titleRow.id as string,'CREATED_FROM_XML_IMPORT',userId,null,{...api(titleRow),xmlImportId,installments});
      await this.audit(tx,'XML_IMPORT',xmlImportId,'GENERATED_PAYABLE_TITLE',userId,null,{generatedTitleId:titleRow.id});
      return { ...api(titleRow), installments, xmlImportId };
    });
  }

  private normalizeXmlInstallments(rows: { installment_number: number; due_date: string | Date | null; amount: string }[], total: number, fallbackDueDate: string): { installmentNumber: number; installmentCount: number; amount: number; dueDate: string; notes: string | null }[] {
    const parsed = rows.map((row, index) => ({
      installmentNumber: Number(row.installment_number || index + 1),
      amount: Number(row.amount || 0),
      dueDate: this.toDateString(row.due_date) ?? fallbackDueDate,
      notes: null,
    })).filter((item) => item.amount > 0 && item.dueDate);
    // Cada duplicata da NFe representa um vencimento independente.
    // Diferencas de arredondamento entre vNF e vDup nao podem descartar parcelas.
    const items = parsed.length ? parsed : [{ installmentNumber: 1, amount: total, dueDate: fallbackDueDate, notes: null }];
    return items.map((item, index) => ({ ...item, installmentNumber: index + 1, installmentCount: items.length }));
  }

  private toDateString(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }

  private async resolveCompanyByDocument(tx: QueryExecutor, documentNumber: string | null | undefined): Promise<ResolvedCompany | null> {
    const normalized = documentNumber?.replace(/\D+/g, '') ?? '';
    if (!/^\d{14}$/.test(normalized)) return null;
    const result = await tx.query<{ id: string; company_type: 'MAIN' | 'BRANCH'; legal_name: string; trade_name: string | null } & Record<string, unknown>>(
      `SELECT id,company_type,legal_name,trade_name FROM cadastros.companies
       WHERE document_number=$1 AND is_active AND deleted_at IS NULL LIMIT 1`,
      [normalized],
    );
    const row = result.rows[0];
    if (!row) return null;
    return { id: row.id, companyType: row.company_type, legalName: row.legal_name, tradeName: row.trade_name, parameters: await this.loadCompanyParameters(tx, row.id) };
  }

  private async resolveCompanyById(tx: QueryExecutor, companyId: string | null | undefined): Promise<ResolvedCompany | null> {
    if (!companyId) return null;
    const result = await tx.query<{ id: string; company_type: 'MAIN' | 'BRANCH'; legal_name: string; trade_name: string | null } & Record<string, unknown>>(
      `SELECT id,company_type,legal_name,trade_name FROM cadastros.companies
       WHERE id=$1 AND is_active AND deleted_at IS NULL LIMIT 1`,
      [companyId],
    );
    const row = result.rows[0];
    if (!row) return null;
    return { id: row.id, companyType: row.company_type, legalName: row.legal_name, tradeName: row.trade_name, parameters: await this.loadCompanyParameters(tx, row.id) };
  }

  private async resolveXmlCompany(tx: QueryExecutor, row: Record<string, unknown>): Promise<ResolvedCompany | null> {
    return await this.resolveCompanyById(tx, row.company_id as string | null | undefined)
      ?? this.resolveCompanyByDocument(tx, row.recipient_document_number as string | null | undefined);
  }

  private async loadCompanyParameters(tx: QueryExecutor, companyId: string | null | undefined): Promise<CompanyParameters | null> {
    if (!companyId) return null;
    const result = await tx.query(`SELECT * FROM cadastros.company_parameters
      WHERE company_id=$1 AND is_active AND deleted_at IS NULL LIMIT 1`, [companyId]);
    const row = result.rows[0];
    if (!row) return null;
    return {
      defaultFinancialCategoryId: row.default_financial_category_id as string | null,
      defaultPaymentMethodId: row.default_payment_method_id as string | null,
      defaultPaymentTermId: row.default_payment_term_id as string | null,
      defaultCostCenterId: row.default_cost_center_id as string | null,
      defaultDocumentTypeId: row.default_document_type_id as string | null,
      defaultBankAccountId: row.default_bank_account_id as string | null,
      xmlAutoCreateSupplier: row.xml_auto_create_supplier !== false,
      xmlRequireKnownRecipient: row.xml_require_known_recipient === true,
    };
  }

  private publicCompany(company: ResolvedCompany | null): object | null {
    return company ? { id: company.id, companyType: company.companyType, legalName: company.legalName, tradeName: company.tradeName } : null;
  }

  private async xmlImportApi(row: Record<string, unknown>, executor: QueryExecutor): Promise<Record<string, unknown>> {
    const company = await this.resolveXmlCompany(executor, row);
    return {
      ...api(row),
      hasGeneratedTitle: Boolean(row.generated_title_id),
      company: this.publicCompany(company),
      companyParameters: company?.parameters ?? null,
    };
  }

  private async insertPaymentBankMovement(tx:QueryExecutor,paymentId:string,bankAccountId:string,companyId:string,costCenterId:string|null,paymentDate:string,amount:number,description:string,referenceNumber:string|null,userId:string):Promise<object>{
    const result=await tx.query(`INSERT INTO tesouraria.bank_account_movements (
        bank_account_id,company_id,cost_center_id,related_payment_id,movement_type,direction,movement_date,amount,description,reference_number,is_system_generated,created_by
      ) VALUES ($1,$2,$3,$4,'PAYABLE_PAYMENT','OUT',$5,$6,$7,$8,true,$9) RETURNING *`,
    [bankAccountId,companyId,costCenterId,paymentId,paymentDate,amount,description.slice(0,255),referenceNumber,userId]);
    const movement=api(result.rows[0]!);
    await tx.query(`INSERT INTO administracao.audit_events(domain_code,entity_name,entity_id,action_code,previous_data,new_data,user_id,source_code)
      VALUES('DOM-003','BANK_ACCOUNT_MOVEMENT',$1,'CREATED_FROM_PAYMENT',NULL,$2,$3,'API')`,
    [movement.id,JSON.stringify(movement),userId]);
    return movement;
  }

  private async reversePaymentBankMovements(tx:QueryExecutor,paymentId:string,reason:string,userId:string):Promise<object[]>{
    const movements=await tx.query<{id:string;bank_account_id:string;company_id:string;cost_center_id:string|null;direction:'IN'|'OUT';amount:string;movement_date:string;description:string;reference_number:string|null}&Record<string,unknown>>(
      `SELECT *
       FROM tesouraria.bank_account_movements
       WHERE related_payment_id=$1 AND movement_type='PAYABLE_PAYMENT'
       FOR UPDATE`,
      [paymentId],
    );
    const reversed:object[]=[];
    for(const movement of movements.rows){
      const existing=await tx.query(`SELECT 1 FROM tesouraria.bank_account_movements WHERE reversal_of_movement_id=$1 LIMIT 1`,[movement.id]);
      if(existing.rowCount) throw new ApplicationError({code:'BANK_MOVEMENT_ALREADY_REVERSED',message:'Bank account movement was already reversed',statusCode:409});
      const reversal=await tx.query(`INSERT INTO tesouraria.bank_account_movements (
          bank_account_id,company_id,cost_center_id,related_payment_id,reversal_of_movement_id,movement_type,direction,movement_date,amount,description,reference_number,notes,is_system_generated,created_by
        ) VALUES ($1,$2,$3,$4,$5,'REVERSAL',$6,CURRENT_DATE,$7,$8,$9,$10,true,$11) RETURNING *`,
      [movement.bank_account_id,movement.company_id,movement.cost_center_id,paymentId,movement.id,movement.direction==='IN'?'OUT':'IN',Number(movement.amount),`Estorno pagamento: ${reason}`.slice(0,255),movement.reference_number,reason,userId]);
      const entity=api(reversal.rows[0]!);
      await tx.query(`INSERT INTO administracao.audit_events(domain_code,entity_name,entity_id,action_code,previous_data,new_data,user_id,source_code)
        VALUES('DOM-003','BANK_ACCOUNT_MOVEMENT',$1,'REVERSED_FROM_PAYMENT_REVERSAL',NULL,$2,$3,'API')`,
      [entity.id,JSON.stringify(entity),userId]);
      reversed.push(entity);
    }
    return reversed;
  }

  async execute(sql:string,values:readonly unknown[]=[]):Promise<object[]>{const result=await this.database.query(sql,values);return result.rows.map(api);}
  async executeOne(sql:string,values:readonly unknown[]=[]):Promise<object>{const rows=await this.execute(sql,values);if(!rows[0])throw new ApplicationError({code:'RESOURCE_NOT_FOUND',message:'Resource not found',statusCode:404});return rows[0];}
  async record(entity:string,id:string,action:string,userId:string,data:object):Promise<void>{await this.audit(this.database,entity,id,action,userId,null,data);}

  private async audit(tx:QueryExecutor,entity:string,id:string,action:string,userId:string,previous:object|null,next:object|null):Promise<void>{await tx.query(`INSERT INTO administracao.audit_events(domain_code,entity_name,entity_id,action_code,previous_data,new_data,user_id,source_code) VALUES('DOM-002',$1,$2,$3,$4,$5,$6,'API')`,[entity,id,action,previous?JSON.stringify(previous):null,next?JSON.stringify(next):null,userId]);}
}
