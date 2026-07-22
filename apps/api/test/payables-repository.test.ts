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
    const query=vi.fn().mockResolvedValueOnce({rows:[{open_balance:'50.00',title_status:'OPEN'}],rowCount:1});
    const repo=new PayablesRepository(database({query}));
    await expect(repo.addPayment({installmentId:'installment',bankAccountId:'bank',paymentMethodId:'method',paymentDate:'2026-07-16',principalAmount:60},'user-id'))
      .rejects.toMatchObject({code:'OVERPAYMENT_CONFIRMATION_REQUIRED',statusCode:409});
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
    expect(titleValues?.[8]).toBe('2026-07-01');
    expect(titleValues?.[9]).toBe(150);
    expect(query.mock.calls[4]?.[0]).toContain('INSERT INTO financeiro.payable_installments');
    expect(installmentValues?.[5]).toBe('payment-method-id');
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
