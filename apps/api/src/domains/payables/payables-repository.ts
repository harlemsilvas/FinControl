import { ApplicationError } from '../../common/errors/application-error.js';
import type { Database, QueryExecutor } from '../../infrastructure/database/database.js';

export interface InstallmentInput { installmentNumber: number; installmentCount: number; amount: number; dueDate: string; paymentMethodId: string; notes?: string | null }
export interface TitleInput { supplierId: string; categoryId: string; documentTypeId: string; paymentTermId?: string | null; costCenterId?: string | null;
  documentNumber: string; documentSeries?: string | null; description: string; originCode?: string; issueDate: string; originalAmount: number;
  discountAmount?: number; additionalAmount?: number; notes?: string | null; draft?: boolean; duplicateConfirmed?: boolean; installments: InstallmentInput[] }
export interface PayableListFilters { search?: string; status?: string; dueFrom?: string; dueTo?: string; supplierId?: string; categoryId?: string }
export interface XmlImportInstallmentInput { installmentNumber: number; dueDate: string; amount: number; paymentMethodRaw?: string | null; notes?: string | null }
export interface XmlImportGenerateInput { categoryId: string; documentTypeId: string; paymentMethodId: string; paymentTermId?: string | null; costCenterId?: string | null; description?: string | null; duplicateConfirmed?: boolean }
export interface XmlImportInput { accessKey?: string | null; attachmentId?: string | null; rawXml?: string | null; sourceFileName?: string | null; sourceMimeType?: string | null; sourceSizeBytes?: number | null; sourceFileHash?: string | null; supplierLegalName?: string | null; supplierTradeName?: string | null; supplierDocumentNumber?: string | null; supplierStateRegistration?: string | null; supplierCityName?: string | null; supplierStateCode?: string | null; recipientLegalName?: string | null; recipientDocumentNumber?: string | null; recipientStateRegistration?: string | null; recipientCityName?: string | null; recipientStateCode?: string | null; recipientKind?: 'MAIN' | 'BRANCH' | 'UNKNOWN'; mainCompanyDocumentNumber?: string | null; documentModel?: string | null; documentNumber?: string | null; documentSeries?: string | null; issueDate?: string | null; operationDate?: string | null; dueDate?: string | null; productsAmount?: number | null; freightAmount?: number | null; insuranceAmount?: number | null; discountAmount?: number | null; otherAmount?: number | null; invoiceTotalAmount?: number | null; paymentAmount?: number | null; currencyCode?: string; parsedData?: Record<string, unknown>; installments?: XmlImportInstallmentInput[] }

function camel(key: string): string { return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()); }
function api(row: Record<string, unknown>): Record<string, unknown> { return Object.fromEntries(Object.entries(row).map(([key, value]) => [camel(key), value])); }
function cents(value: number): number { return Math.round(value * 100); }

export class PayablesRepository {
  constructor(private readonly database: Database) {}

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

  async addPayment(data:Record<string,unknown>,userId:string):Promise<object>{return this.database.transaction(async(tx)=>{
    const installment=await tx.query<{open_balance:string;title_status:string}&Record<string,unknown>>(`SELECT i.open_balance::text,ts.code title_status FROM financeiro.payable_installments i JOIN financeiro.payable_titles t ON t.id=i.payable_title_id JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id WHERE i.id=$1 FOR UPDATE`,[data.installmentId]);
    const current=installment.rows[0]; if(!current) throw new ApplicationError({code:'RESOURCE_NOT_FOUND',message:'Installment not found',statusCode:404});
    if(current.title_status==='CANCELLED') throw new ApplicationError({code:'TITLE_CANCELLED',message:'Cancelled titles cannot receive payments',statusCode:409});
    if(Number(data.principalAmount)>Number(current.open_balance)&&!data.overpaymentConfirmed) throw new ApplicationError({code:'OVERPAYMENT_CONFIRMATION_REQUIRED',message:'Payment exceeds open balance',statusCode:409});
    const result=await tx.query(`INSERT INTO financeiro.payments (payable_installment_id,payment_batch_id,bank_account_id,payment_method_id,payment_date,principal_amount,interest_amount,penalty_amount,discount_amount,additional_amount,transaction_number,overpayment_confirmed,overpayment_confirmed_by,overpayment_confirmed_at,status_id,created_by,updated_by)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,CASE WHEN $12 THEN $13::uuid END,CASE WHEN $12 THEN CURRENT_TIMESTAMP END,(SELECT id FROM financeiro.payment_statuses WHERE code='EFFECTIVE'),$13,$13) RETURNING *`,
    [data.installmentId,data.batchId??null,data.bankAccountId,data.paymentMethodId,data.paymentDate,data.principalAmount,data.interestAmount??0,data.penaltyAmount??0,data.discountAmount??0,data.additionalAmount??0,data.transactionNumber??null,data.overpaymentConfirmed??false,userId]);
    const row=result.rows[0]!; await this.audit(tx,'PAYMENT',row.id as string,'CREATED',userId,null,api(row)); return api(row);});}

  async reversePayment(id:string,reason:string,userId:string):Promise<object>{return this.database.transaction(async(tx)=>{
    const result=await tx.query(`INSERT INTO financeiro.payment_reversals(payment_id,reason,reversed_by) VALUES($1,$2,$3) RETURNING *`,[id,reason,userId]);
    await tx.query(`UPDATE financeiro.payments SET status_id=(SELECT id FROM financeiro.payment_statuses WHERE code='REVERSED'),updated_by=$2 WHERE id=$1`,[id,userId]);
    const row=result.rows[0]!; await this.audit(tx,'PAYMENT',id,'REVERSED',userId,null,{reason}); return api(row);});}

  async createXmlImport(input: XmlImportInput, userId: string): Promise<object> {
    return this.database.transaction(async (tx) => {
      if (input.accessKey) {
        const duplicate = await tx.query(`SELECT id FROM financeiro.xml_imports WHERE access_key=$1 LIMIT 1`, [input.accessKey]);
        if (duplicate.rowCount) throw new ApplicationError({ code: 'XML_IMPORT_DUPLICATE', message: 'XML access key already imported', statusCode: 409 });
      }

      const supplier = await this.findOrCreateXmlSupplier(tx, input, userId);
      const result = await tx.query(`INSERT INTO financeiro.xml_imports (
        access_key,supplier_id,attachment_id,raw_xml,source_file_name,source_mime_type,source_size_bytes,source_file_hash,
        supplier_legal_name,supplier_trade_name,supplier_document_number,supplier_state_registration,supplier_city_name,supplier_state_code,
        recipient_legal_name,recipient_document_number,recipient_state_registration,recipient_city_name,recipient_state_code,recipient_kind,main_company_document_number,
        document_model,document_number,document_series,issue_date,operation_date,due_date,
        products_amount,freight_amount,insurance_amount,discount_amount,other_amount,invoice_total_amount,payment_amount,currency_code,parsed_data,
        status_id,imported_by
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,
        (SELECT id FROM financeiro.xml_import_statuses WHERE code='RECEIVED'),$37
      ) RETURNING *`, [
        input.accessKey ?? null,supplier?.id ?? null,input.attachmentId ?? null,input.rawXml ?? null,input.sourceFileName ?? null,input.sourceMimeType ?? null,input.sourceSizeBytes ?? null,input.sourceFileHash ?? null,
        input.supplierLegalName ?? null,input.supplierTradeName ?? null,input.supplierDocumentNumber ?? null,input.supplierStateRegistration ?? null,input.supplierCityName ?? null,input.supplierStateCode ?? null,
        input.recipientLegalName ?? null,input.recipientDocumentNumber ?? null,input.recipientStateRegistration ?? null,input.recipientCityName ?? null,input.recipientStateCode ?? null,input.recipientKind ?? 'UNKNOWN',input.mainCompanyDocumentNumber ?? null,
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
      return { ...api(row), installments, supplier: supplier?.entity ?? null, supplierWasCreated: supplier?.created ?? false };
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
      const xmlResult = await tx.query<{ id: string; access_key: string | null; supplier_id: string | null; generated_title_id: string | null; supplier_legal_name: string | null; document_number: string | null; document_series: string | null; issue_date: string | Date | null; due_date: string | Date | null; invoice_total_amount: string | null; payment_amount: string | null; raw_xml: string | null } & Record<string, unknown>>(
        `SELECT * FROM financeiro.xml_imports WHERE id=$1 FOR UPDATE`, [xmlImportId]);
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

      const duplicate = await tx.query(`SELECT 1 FROM financeiro.payable_titles WHERE supplier_id=$1 AND lower(trim(document_number))=lower(trim($2))
        AND coalesce(lower(trim(document_series)),'')=coalesce(lower(trim($3)),'') AND deleted_at IS NULL LIMIT 1`, [xml.supplier_id,documentNumber,documentSeries]);
      if (duplicate.rowCount && !input.duplicateConfirmed) throw new ApplicationError({ code: 'POSSIBLE_DUPLICATE', message: 'A possible duplicate title exists', statusCode: 409 });

      const title = await tx.query(`INSERT INTO financeiro.payable_titles (supplier_id,category_id,document_type_id,payment_term_id,cost_center_id,
        document_number,document_series,description,origin_code,issue_date,original_amount,discount_amount,additional_amount,status_id,notes,
        duplicate_warning_confirmed,duplicate_warning_confirmed_by,duplicate_warning_confirmed_at,created_by,updated_by)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'XML',$9,$10,0,0,(SELECT id FROM financeiro.payable_title_statuses WHERE code='OPEN'),$11,$12,
        CASE WHEN $12 THEN $13::uuid END,CASE WHEN $12 THEN CURRENT_TIMESTAMP END,$13,$13) RETURNING *`,
      [xml.supplier_id,input.categoryId,input.documentTypeId,input.paymentTermId ?? null,input.costCenterId ?? null,documentNumber,documentSeries,description,issueDate,amount,
        `Gerado a partir da importação XML ${xml.access_key ?? xml.id}.`,input.duplicateConfirmed ?? false,userId]);
      const titleRow = title.rows[0]!;

      const xmlInstallments = await tx.query<{ installment_number: number; due_date: string | Date | null; amount: string } & Record<string, unknown>>(
        `SELECT installment_number,due_date,amount::text FROM financeiro.xml_import_installments WHERE xml_import_id=$1 ORDER BY installment_number`, [xmlImportId]);
      const installments = this.normalizeXmlInstallments(xmlInstallments.rows, amount, this.toDateString(xml.due_date) ?? issueDate);
      for (const item of installments) {
        await tx.query(`INSERT INTO financeiro.payable_installments
          (payable_title_id,installment_number,installment_count,amount,due_date,payment_method_id,open_balance,status_id,notes,created_by,updated_by)
          VALUES ($1,$2,$3,$4,$5,$6,$4,(SELECT id FROM financeiro.payable_installment_statuses WHERE code=CASE WHEN $5::date<CURRENT_DATE THEN 'OVERDUE' ELSE 'OPEN' END),$7,$8,$8)`,
        [titleRow.id,item.installmentNumber,item.installmentCount,item.amount,item.dueDate,input.paymentMethodId,item.notes,userId]);
      }

      await tx.query(`UPDATE financeiro.xml_imports SET generated_title_id=$2,status_id=(SELECT id FROM financeiro.xml_import_statuses WHERE code='PROCESSED'),processed_at=CURRENT_TIMESTAMP WHERE id=$1`, [xmlImportId,titleRow.id]);
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
    const totalCents = Math.round(total * 100);
    const parsedCents = parsed.reduce((sum, item) => sum + Math.round(item.amount * 100), 0);
    const items = parsed.length && parsedCents === totalCents ? parsed : [{ installmentNumber: 1, amount: total, dueDate: fallbackDueDate, notes: null }];
    return items.map((item, index) => ({ ...item, installmentNumber: index + 1, installmentCount: items.length }));
  }

  private toDateString(value: string | Date | null | undefined): string | null {
    if (!value) return null;
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return String(value).slice(0, 10);
  }
  async execute(sql:string,values:readonly unknown[]=[]):Promise<object[]>{const result=await this.database.query(sql,values);return result.rows.map(api);}
  async executeOne(sql:string,values:readonly unknown[]=[]):Promise<object>{const rows=await this.execute(sql,values);if(!rows[0])throw new ApplicationError({code:'RESOURCE_NOT_FOUND',message:'Resource not found',statusCode:404});return rows[0];}
  async record(entity:string,id:string,action:string,userId:string,data:object):Promise<void>{await this.audit(this.database,entity,id,action,userId,null,data);}

  private async audit(tx:QueryExecutor,entity:string,id:string,action:string,userId:string,previous:object|null,next:object|null):Promise<void>{await tx.query(`INSERT INTO administracao.audit_events(domain_code,entity_name,entity_id,action_code,previous_data,new_data,user_id,source_code) VALUES('DOM-002',$1,$2,$3,$4,$5,$6,'API')`,[entity,id,action,previous?JSON.stringify(previous):null,next?JSON.stringify(next):null,userId]);}
}
