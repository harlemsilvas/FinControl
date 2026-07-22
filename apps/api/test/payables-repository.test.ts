import { describe, expect, it, vi } from 'vitest';
import type { Database, QueryExecutor } from '../src/infrastructure/database/database.js';
import { PayablesRepository, type TitleInput, type XmlImportInput } from '../src/domains/payables/payables-repository.js';

const validTitle: TitleInput = { supplierId:'00000000-0000-0000-0000-000000000001',categoryId:'00000000-0000-0000-0000-000000000002',
  documentTypeId:'00000000-0000-0000-0000-000000000003',documentNumber:'NF-1',description:'Serviço',issueDate:'2026-07-16',
  originalAmount:100,installments:[{installmentNumber:1,installmentCount:1,amount:100,dueDate:'2026-07-30',paymentMethodId:'00000000-0000-0000-0000-000000000004'}] };

function database(executor:QueryExecutor):Database{return {query:async(text,values)=>executor.query(text,values),checkHealth:vi.fn(),close:vi.fn(),
  transaction:async<T>(work:(tx:QueryExecutor)=>Promise<T>)=>work(executor)};}

describe('PayablesRepository business safeguards',()=>{
  it('rejects installment totals different from the calculated title total',async()=>{
    const repo=new PayablesRepository(database({query:vi.fn()}));
    await expect(repo.create({...validTitle,installments:[{...validTitle.installments[0]!,amount:99.99}]},'user-id'))
      .rejects.toMatchObject({code:'INSTALLMENT_TOTAL_MISMATCH',statusCode:400});
  });

  it('returns a duplicate warning before persisting without confirmation',async()=>{
    const query=vi.fn().mockResolvedValueOnce({rows:[{exists:1}],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    await expect(repo.create(validTitle,'user-id')).rejects.toMatchObject({code:'POSSIBLE_DUPLICATE',statusCode:409});
    expect(query).toHaveBeenCalledOnce();
  });

  it('requires explicit confirmation when a payment exceeds the open balance',async()=>{
    const query=vi.fn().mockResolvedValueOnce({rows:[{open_balance:'50.00',title_status:'OPEN',company_id:'company-id'}],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    await expect(repo.addPayment({installmentId:'installment',bankAccountId:'bank',paymentMethodId:'method',paymentDate:'2026-07-16',principalAmount:60},'user-id'))
      .rejects.toMatchObject({code:'OVERPAYMENT_CONFIRMATION_REQUIRED',statusCode:409});
  });

  it('lists installments eligible for individual payment settlement',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{total:'1'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{installment_id:'installment-id',payable_title_id:'title-id',company_id:'company-id',company_name:'ABC Center',supplier_name:'Fornecedor',document_number:'123',installment_number:1,installment_count:1,open_balance:'150.00',installment_status_code:'OPEN'}],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    const result=await repo.listPaymentEligibleInstallments(1,20,{companyId:'company-id',status:'OPEN'}) as {data:{installmentId:string;companyName:string;openBalance:string}[];total:number};
    expect(result.total).toBe(1);
    expect(result.data[0]?.installmentId).toBe('installment-id');
    expect(result.data[0]?.companyName).toBe('ABC Center');
    expect(result.data[0]?.openBalance).toBe('150.00');
    expect(query.mock.calls[0]?.[0]).toContain('i.open_balance > 0');
    expect(query.mock.calls[1]?.[0]).toContain('ORDER BY i.due_date ASC');
  });

  it('creates a payment and an outgoing bank movement in one transaction',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{open_balance:'200.00',title_status:'OPEN',company_id:'company-id',cost_center_id:'cost-center-id',document_number:'123',document_series:'1',supplier_name:'Fornecedor',installment_number:1,installment_count:1}],rowCount:1})
      .mockResolvedValueOnce({rows:[{company_id:'company-id',account_name:'Conta Matriz'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{official_balance:'500.00'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'payment-id',payable_installment_id:'installment',bank_account_id:'bank',movement_amount:'150.00'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'movement-id',related_payment_id:'payment-id',movement_type:'PAYABLE_PAYMENT',direction:'OUT',amount:'150.00'}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    const result=await repo.addPayment({installmentId:'installment',bankAccountId:'bank',paymentMethodId:'method',paymentDate:'2026-07-22',principalAmount:150},'user-id') as {id:string;bankMovement:{id:string}};
    const movementValues=query.mock.calls[4]?.[1] as unknown[] | undefined;
    expect(result.id).toBe('payment-id');
    expect(result.bankMovement.id).toBe('movement-id');
    expect(movementValues?.[1]).toBe('company-id');
    expect(movementValues?.[2]).toBe('cost-center-id');
    expect(movementValues?.[3]).toBe('payment-id');
    expect(query.mock.calls[4]?.[0]).toContain("'PAYABLE_PAYMENT','OUT'");
  });

  it('blocks payment using a bank account from another company',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{open_balance:'200.00',title_status:'OPEN',company_id:'company-a',cost_center_id:null,document_number:'123',document_series:null,supplier_name:'Fornecedor',installment_number:1,installment_count:1}],rowCount:1})
      .mockResolvedValueOnce({rows:[{company_id:'company-b',account_name:'Conta Filial'}],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    await expect(repo.addPayment({installmentId:'installment',bankAccountId:'bank',paymentMethodId:'method',paymentDate:'2026-07-22',principalAmount:100},'user-id'))
      .rejects.toMatchObject({code:'PAYMENT_BANK_ACCOUNT_COMPANY_MISMATCH',statusCode:409});
  });

  it('blocks payment when official bank balance is insufficient',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{open_balance:'200.00',title_status:'OPEN',company_id:'company-id',cost_center_id:null,document_number:'123',document_series:null,supplier_name:'Fornecedor',installment_number:1,installment_count:1}],rowCount:1})
      .mockResolvedValueOnce({rows:[{company_id:'company-id',account_name:'Conta Matriz'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{official_balance:'50.00'}],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    await expect(repo.addPayment({installmentId:'installment',bankAccountId:'bank',paymentMethodId:'method',paymentDate:'2026-07-22',principalAmount:100},'user-id'))
      .rejects.toMatchObject({code:'INSUFFICIENT_BANK_BALANCE',statusCode:409});
  });

  it('reverses payment and creates a compensating bank movement',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{id:'payment-id',status_code:'EFFECTIVE'}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:0})
      .mockResolvedValueOnce({rows:[{id:'reversal-id',payment_id:'payment-id'}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'movement-id',bank_account_id:'bank',company_id:'company-id',cost_center_id:null,direction:'OUT',amount:'150.00',movement_date:'2026-07-22',description:'Pagamento',reference_number:null}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:0})
      .mockResolvedValueOnce({rows:[{id:'movement-reversal-id',reversal_of_movement_id:'movement-id',direction:'IN',amount:'150.00'}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    const result=await repo.reversePayment('payment-id','Pagamento duplicado','user-id') as {id:string;reversedMovements:{id:string}[]};
    const reversalValues=query.mock.calls[6]?.[1] as unknown[] | undefined;
    expect(result.id).toBe('reversal-id');
    expect(result.reversedMovements[0]?.id).toBe('movement-reversal-id');
    expect(reversalValues?.[5]).toBe('IN');
    expect(reversalValues?.[6]).toBe(150);
  });

  it('lists payments with reversal marker and operational context',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{total:'1'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'payment-id',payment_date:'2026-07-22',movement_amount:'403.06',status_code:'REVERSED',reversal_id:'reversal-id',supplier_name:'Fornecedor',company_name:'ABC Center',document_number:'17026',installment_number:1,installment_count:1,bank_name:'Banco Teste',account_name:'Conta Matriz'}],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    const result=await repo.listPayments(1,20,{companyId:'company-id',status:'REVERSED'}) as {data:{id:string;isReversed:boolean;companyName:string;movementAmount:string}[];total:number};
    expect(result.total).toBe(1);
    expect(result.data[0]?.id).toBe('payment-id');
    expect(result.data[0]?.isReversed).toBe(true);
    expect(result.data[0]?.companyName).toBe('ABC Center');
    expect(result.data[0]?.movementAmount).toBe('403.06');
    expect(query.mock.calls[1]?.[0]).toContain('LEFT JOIN financeiro.payment_reversals');
  });

  it('returns payment detail with treasury movements and attachments',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{id:'payment-id',payment_date:'2026-07-22',movement_amount:'403.06',principal_amount:'403.06',status_code:'EFFECTIVE',reversal_id:null,supplier_name:'Fornecedor',company_name:'ABC Center',document_number:'17026',installment_number:1,installment_count:1,bank_name:'Banco Teste',account_name:'Conta Matriz',category_name:'Mercadorias'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'movement-id',related_payment_id:'payment-id',movement_type:'PAYABLE_PAYMENT',direction:'OUT',amount:'403.06',description:'Pagamento 17026'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'attachment-id',payment_id:'payment-id',original_name:'comprovante.pdf'}],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    const result=await repo.getPayment('payment-id') as {id:string;isReversed:boolean;bankMovements:{id:string}[];attachments:{originalName:string}[]};
    expect(result.id).toBe('payment-id');
    expect(result.isReversed).toBe(false);
    expect(result.bankMovements[0]?.id).toBe('movement-id');
    expect(result.attachments[0]?.originalName).toBe('comprovante.pdf');
    expect(query.mock.calls[0]?.[0]).toContain('WHERE p.id=$1');
    expect(query.mock.calls[1]?.[0]).toContain('tesouraria.bank_account_movements');
    expect(query.mock.calls[2]?.[0]).toContain('financeiro.attachments');
  });

  it('returns null when payment detail is not found',async()=>{
    const query=vi.fn().mockResolvedValueOnce({rows:[],rowCount:0});
    const repo=new PayablesRepository(database({query}));
    await expect(repo.getPayment('missing-payment')).resolves.toBeNull();
  });

  it('creates payment receipt attachment metadata with audit trail',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{id:'payment-id'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'attachment-id',payment_id:'payment-id',original_name:'comprovante.pdf',relative_path:'attachments/payments/2026/07/payment-id/file.pdf'}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    const result=await repo.addPaymentAttachment('payment-id',{
      originalName:'comprovante.pdf',
      storedName:'file.pdf',
      relativePath:'attachments/payments/2026/07/payment-id/file.pdf',
      absolutePath:'/tmp/file.pdf',
      mimeType:'application/pdf',
      sizeBytes:123,
      fileHash:'hash',
    },'user-id') as {id:string;paymentId:string};
    const values=query.mock.calls[1]?.[1] as unknown[] | undefined;
    expect(result.id).toBe('attachment-id');
    expect(result.paymentId).toBe('payment-id');
    expect(values?.[0]).toBe('payment-id');
    expect(values?.[4]).toBe('application/pdf');
    expect(query.mock.calls[2]?.[1]).toContain('CREATED_PAYMENT_RECEIPT');
  });

  it('blocks attachment creation for missing payment',async()=>{
    const query=vi.fn().mockResolvedValueOnce({rows:[],rowCount:0});
    const repo=new PayablesRepository(database({query}));
    await expect(repo.addPaymentAttachment('missing-payment',{
      originalName:'comprovante.pdf',
      storedName:'file.pdf',
      relativePath:'attachments/payments/2026/07/missing-payment/file.pdf',
      absolutePath:'/tmp/file.pdf',
      mimeType:'application/pdf',
      sizeBytes:123,
      fileHash:'hash',
    },'user-id')).rejects.toMatchObject({code:'RESOURCE_NOT_FOUND',statusCode:404});
  });

  it('creates and links a supplier when importing XML from a new issuer document',async()=>{
    const input:XmlImportInput={accessKey:'12345678901234567890123456789012345678901234',rawXml:'<xml />',supplierLegalName:'Fornecedor XML Ltda',supplierDocumentNumber:'12345678000190',supplierStateCode:'SP'};
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[],rowCount:0})
      .mockResolvedValueOnce({rows:[],rowCount:0})
      .mockResolvedValueOnce({rows:[{id:'supplier-id',legal_name:'Fornecedor XML Ltda',document_number:'12345678000190'}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'xml-id',access_key:input.accessKey,supplier_id:'supplier-id'}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    const result=await repo.createXmlImport(input,'user-id') as {supplierWasCreated:boolean;supplier:{id:string};supplierId:string};
    expect(result.supplierWasCreated).toBe(true);
    expect(result.supplier.id).toBe('supplier-id');
    expect(result.supplierId).toBe('supplier-id');
    const xmlInsertValues = query.mock.calls[4]?.[1] as unknown[] | undefined;
    expect(query.mock.calls[2]?.[0]).toContain('INSERT INTO cadastros.suppliers');
    expect(xmlInsertValues?.[1]).toBe('supplier-id');
  });


  it('generates a payable title from a received XML import',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{id:'xml-id',access_key:'12345678901234567890123456789012345678901234',supplier_id:'supplier-id',generated_title_id:null,supplier_legal_name:'Fornecedor XML Ltda',document_number:'123',document_series:'1',issue_date:'2026-07-01',due_date:'2026-07-30',invoice_total_amount:'150.00',payment_amount:null}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:0})
      .mockResolvedValueOnce({rows:[{id:'title-id',document_number:'123',supplier_id:'supplier-id'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{installment_number:1,due_date:'2026-07-30',amount:'150.00'}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    const result=await repo.generatePayableFromXml('xml-id',{categoryId:'category-id',documentTypeId:'document-type-id',paymentMethodId:'payment-method-id'},'user-id') as {id:string;installments:{amount:number}[];xmlImportId:string};
    const titleValues = query.mock.calls[2]?.[1] as unknown[] | undefined;
    const installmentValues = query.mock.calls[4]?.[1] as unknown[] | undefined;
    expect(result.id).toBe('title-id');
    expect(result.xmlImportId).toBe('xml-id');
    expect(result.installments[0]?.amount).toBe(150);
    expect(query.mock.calls[2]?.[0]).toContain('INSERT INTO financeiro.payable_titles');
    expect(titleValues?.[0]).toBe('supplier-id');
    expect(titleValues?.[9]).toBe('2026-07-01');
    expect(titleValues?.[10]).toBe(150);
    expect(query.mock.calls[4]?.[0]).toContain('INSERT INTO financeiro.payable_installments');
    expect(installmentValues?.[5]).toBe('payment-method-id');
  });

  it('uses company parameters when generating a payable from XML',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{id:'xml-id',access_key:'12345678901234567890123456789012345678901234',supplier_id:'supplier-id',company_id:'company-id',generated_title_id:null,supplier_legal_name:'Fornecedor XML Ltda',document_number:'123',document_series:'1',issue_date:'2026-07-01',due_date:'2026-07-30',invoice_total_amount:'150.00',payment_amount:null}],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'company-id',company_type:'MAIN',legal_name:'ABC Center Distribuidora Ltda',trade_name:'ABC Center'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{default_financial_category_id:'category-id',default_document_type_id:'document-type-id',default_payment_method_id:'payment-method-id',default_payment_term_id:'term-id',default_cost_center_id:'cost-center-id',default_bank_account_id:null,xml_auto_create_supplier:true,xml_require_known_recipient:false}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:0})
      .mockResolvedValueOnce({rows:[{id:'title-id',document_number:'123',supplier_id:'supplier-id',company_id:'company-id'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{installment_number:1,due_date:'2026-07-30',amount:'150.00'}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    const result=await repo.generatePayableFromXml('xml-id',{},'user-id') as {id:string};
    const titleValues = query.mock.calls[4]?.[1] as unknown[] | undefined;
    const installmentValues = query.mock.calls[6]?.[1] as unknown[] | undefined;
    expect(result.id).toBe('title-id');
    expect(titleValues?.[1]).toBe('company-id');
    expect(titleValues?.[2]).toBe('category-id');
    expect(titleValues?.[3]).toBe('document-type-id');
    expect(titleValues?.[4]).toBe('term-id');
    expect(titleValues?.[5]).toBe('cost-center-id');
    expect(installmentValues?.[5]).toBe('payment-method-id');
  });

  it('uses recipient company parameters for XML imported before company link backfill',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{id:'xml-id',access_key:'12345678901234567890123456789012345678901234',supplier_id:'supplier-id',company_id:null,recipient_document_number:'51309435000153',generated_title_id:null,supplier_legal_name:'Fornecedor XML Ltda',document_number:'123',document_series:'1',issue_date:'2026-07-01',due_date:'2026-07-30',invoice_total_amount:'150.00',payment_amount:null}],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'company-id',company_type:'MAIN',legal_name:'ABC Center Distribuidora Ltda',trade_name:'ABC Center'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{default_financial_category_id:'category-id',default_document_type_id:'document-type-id',default_payment_method_id:'payment-method-id',default_payment_term_id:'term-id',default_cost_center_id:'cost-center-id',default_bank_account_id:null,xml_auto_create_supplier:true,xml_require_known_recipient:false}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:0})
      .mockResolvedValueOnce({rows:[{id:'title-id',document_number:'123',supplier_id:'supplier-id',company_id:'company-id'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{installment_number:1,due_date:'2026-07-30',amount:'150.00'}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    const result=await repo.generatePayableFromXml('xml-id',{},'user-id') as {id:string};
    const titleValues = query.mock.calls[4]?.[1] as unknown[] | undefined;
    const updateValues = query.mock.calls[7]?.[1] as unknown[] | undefined;
    expect(result.id).toBe('title-id');
    expect(titleValues?.[1]).toBe('company-id');
    expect(titleValues?.[2]).toBe('category-id');
    expect(titleValues?.[3]).toBe('document-type-id');
    expect(titleValues?.[4]).toBe('term-id');
    expect(titleValues?.[5]).toBe('cost-center-id');
    expect(updateValues?.[2]).toBe('company-id');
  });

  it('lists xml imports with pagination and active-record filter',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{total:'1'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'xml-id',status_code:'RECEIVED',generated_title_id:null,recipient_kind:'MAIN'}],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    const result=await repo.listXmlImports(2,10,{status:'RECEIVED',recipientKind:'MAIN'}) as {data:{id:string;hasGeneratedTitle:boolean}[];page:number;pageSize:number;total:number};
    expect(result.page).toBe(2);
    expect(result.pageSize).toBe(10);
    expect(result.total).toBe(1);
    expect(result.data[0]?.id).toBe('xml-id');
    expect(result.data[0]?.hasGeneratedTitle).toBe(false);
    expect(query.mock.calls[0]?.[0]).toContain('x.deleted_at IS NULL');
    expect(query.mock.calls[1]?.[0]).toContain('ORDER BY x.imported_at DESC');
  });

  it('returns company parameters in xml import list resolved by recipient document',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{total:'1'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'xml-id',status_code:'RECEIVED',generated_title_id:null,recipient_kind:'MAIN',company_id:null,recipient_document_number:'51309435000153'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'company-id',company_type:'MAIN',legal_name:'ABC Center Distribuidora Ltda',trade_name:'ABC Center'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{default_financial_category_id:'category-id',default_document_type_id:'document-type-id',default_payment_method_id:'payment-method-id',default_payment_term_id:'term-id',default_cost_center_id:'cost-center-id',default_bank_account_id:null,xml_auto_create_supplier:true,xml_require_known_recipient:false}],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    const result=await repo.listXmlImports(1,20) as {data:{companyParameters:{defaultFinancialCategoryId:string};company:{id:string}}[]};
    expect(result.data[0]?.company.id).toBe('company-id');
    expect(result.data[0]?.companyParameters.defaultFinancialCategoryId).toBe('category-id');
  });

  it('reprocesses an xml import that has not generated a payable title',async()=>{
    const query=vi.fn()
      .mockResolvedValueOnce({rows:[{id:'xml-id',generated_title_id:null,status_id:'old-status'}],rowCount:1})
      .mockResolvedValueOnce({rows:[{id:'xml-id',generated_title_id:null,error_message:null}],rowCount:1})
      .mockResolvedValueOnce({rows:[],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    const result=await repo.reprocessXmlImport('xml-id','user-id') as {id:string};
    expect(result.id).toBe('xml-id');
    expect(query.mock.calls[1]?.[0]).toContain("code='RECEIVED'");
    expect(query.mock.calls[2]?.[0]).toContain('INSERT INTO administracao.audit_events');
  });

  it('blocks xml import deletion when a payable title was already generated',async()=>{
    const query=vi.fn().mockResolvedValueOnce({rows:[{id:'xml-id',generated_title_id:'title-id'}],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    await expect(repo.deleteXmlImport('xml-id','user-id')).rejects.toMatchObject({code:'XML_IMPORT_ALREADY_GENERATED',statusCode:409});
  });

});
