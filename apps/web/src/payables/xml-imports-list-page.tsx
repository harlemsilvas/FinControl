import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useMemo, useState, type ReactElement } from 'react';
import { ApiError, httpClient } from '../api/http-client';
import { useAuth } from '../auth/auth-context';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import type { ListResponse } from './payables-types';
import { currency } from './payables-types';
import { XmlImportDialog } from './xml-import-dialog';

type RecipientKind = 'MAIN' | 'BRANCH' | 'UNKNOWN';
type XmlStatus = 'RECEIVED' | 'PROCESSING' | 'PROCESSED' | 'WARNING' | 'ERROR';

interface LookupItem {
  id: string;
  name?: string;
  legalName?: string;
  code?: string;
}

interface XmlImportInstallment {
  id: string;
  installmentNumber: number;
  dueDate: string;
  amount: string | number;
  paymentMethodRaw?: string | null;
  notes?: string | null;
}

interface CompanyParameters {
  defaultFinancialCategoryId?: string | null;
  defaultDocumentTypeId?: string | null;
  defaultPaymentMethodId?: string | null;
  defaultPaymentTermId?: string | null;
  defaultCostCenterId?: string | null;
}

interface XmlImportListItem {
  id: string;
  importedAt: string;
  statusCode: XmlStatus;
  accessKey?: string | null;
  sourceFileName?: string | null;
  supplierLegalName?: string | null;
  supplierTradeName?: string | null;
  supplierDocumentNumber?: string | null;
  recipientLegalName?: string | null;
  recipientDocumentNumber?: string | null;
  recipientKind: RecipientKind;
  mainCompanyDocumentNumber?: string | null;
  documentNumber?: string | null;
  documentSeries?: string | null;
  dueDate?: string | null;
  invoiceTotalAmount?: string | number | null;
  paymentAmount?: string | number | null;
  generatedTitleId?: string | null;
  generatedTitleDocumentNumber?: string | null;
  resolvedSupplierName?: string | null;
  errorMessage?: string | null;
  hasGeneratedTitle?: boolean;
  companyParameters?: CompanyParameters | null;
}

interface XmlImportDetail extends XmlImportListItem {
  rawXml?: string | null;
  documentModel?: string | null;
  issueDate?: string | null;
  operationDate?: string | null;
  recipientCityName?: string | null;
  recipientStateCode?: string | null;
  supplierCityName?: string | null;
  supplierStateCode?: string | null;
  productsAmount?: string | number | null;
  freightAmount?: string | number | null;
  insuranceAmount?: string | number | null;
  discountAmount?: string | number | null;
  otherAmount?: string | number | null;
  installments: XmlImportInstallment[];
}

interface GeneratedPayableResult {
  id: string;
  documentNumber?: string;
}

const statuses: XmlStatus[] = ['RECEIVED', 'PROCESSING', 'PROCESSED', 'WARNING', 'ERROR'];
const recipientKinds: RecipientKind[] = ['MAIN', 'BRANCH', 'UNKNOWN'];

const statusStyle: Record<string, string> = {
  RECEIVED: 'border-blue-200 bg-blue-50 text-blue-700',
  PROCESSING: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  PROCESSED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  WARNING: 'border-amber-200 bg-amber-50 text-amber-700',
  ERROR: 'border-red-200 bg-red-50 text-red-700',
};

const kindStyle: Record<RecipientKind, string> = {
  MAIN: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  BRANCH: 'border-amber-200 bg-amber-50 text-amber-700',
  UNKNOWN: 'border-slate-200 bg-slate-50 text-slate-600',
};

function statusLabel(value: string): string {
  return { RECEIVED: 'Recebido', PROCESSING: 'Em processamento', PROCESSED: 'Processado', WARNING: 'Com alerta', ERROR: 'Erro' }[value] ?? value;
}

function kindLabel(value: RecipientKind): string {
  return { MAIN: 'Matriz', BRANCH: 'Filial', UNKNOWN: 'Não classificado' }[value];
}

function datePtBr(value?: string | null): string {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '-';
}

function dateTimePtBr(value?: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function digitsOnly(value?: string | null): string {
  return (value ?? '').replace(/\D+/g, '');
}

function formatDocument(value?: string | null): string {
  const digits = digitsOnly(value);
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return value || '-';
}

function amount(item: XmlImportListItem | XmlImportDetail): string | number {
  return item.paymentAmount ?? item.invoiceTotalAmount ?? 0;
}

function documentLabel(item: XmlImportListItem): string {
  if (item.documentNumber) return `${item.documentNumber}${item.documentSeries ? ` / ${item.documentSeries}` : ''}`;
  return item.accessKey ?? item.sourceFileName ?? item.id;
}

function supplierLabel(item: XmlImportListItem): string {
  return item.resolvedSupplierName ?? item.supplierLegalName ?? item.supplierTradeName ?? '-';
}

function optionLabel(item: LookupItem): string {
  return item.legalName ?? item.name ?? item.code ?? item.id;
}

function can(userPermissions: string[], isMaster: boolean, permission: string): boolean {
  return isMaster || userPermissions.includes(permission);
}

export function XmlImportsListPage(): ReactElement {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const userPermissions = auth.session?.user.permissions ?? [];
  const isMaster = Boolean(auth.session?.user.isMaster);
  const canManageXml = can(userPermissions, isMaster, 'XML_IMPORT_MANAGE');
  const canCreatePayable = can(userPermissions, isMaster, 'PAYABLE_TITLE_CREATE');

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [recipientKind, setRecipientKind] = useState('');
  const [recipientDocumentNumber, setRecipientDocumentNumber] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [importedFrom, setImportedFrom] = useState('');
  const [importedTo, setImportedTo] = useState('');
  const [selectedId, setSelectedId] = useState<string>();
  const [xmlImportOpen, setXmlImportOpen] = useState(false);
  const [generateFor, setGenerateFor] = useState<XmlImportListItem>();
  const [categoryId, setCategoryId] = useState('');
  const [documentTypeId, setDocumentTypeId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentTermId, setPaymentTermId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [duplicatePending, setDuplicatePending] = useState(false);

  const query = useQuery({
    queryKey: ['xml-imports', page, pageSize, search, status, recipientKind, recipientDocumentNumber, supplierId, dueFrom, dueTo, importedFrom, importedTo],
    queryFn: async () => {
      const response = await httpClient.get<ListResponse<XmlImportListItem>>('/api/v1/xml-imports', {
        params: {
          page,
          pageSize,
          search: search || undefined,
          status: status || undefined,
          recipientKind: recipientKind || undefined,
          recipientDocumentNumber: digitsOnly(recipientDocumentNumber) || undefined,
          supplierId: supplierId || undefined,
          dueFrom: dueFrom || undefined,
          dueTo: dueTo || undefined,
          importedFrom: importedFrom || undefined,
          importedTo: importedTo || undefined,
        },
      });
      return response.data;
    },
  });

  const suppliers = useQuery({
    queryKey: ['xml-imports-suppliers'],
    queryFn: async () => (await httpClient.get<ListResponse<LookupItem>>('/api/v1/suppliers', { params: { pageSize: 100, active: true } })).data.data,
    staleTime: 60000,
  });

  const detail = useQuery({
    queryKey: ['xml-import-detail', selectedId],
    queryFn: async () => (await httpClient.get<XmlImportDetail>(`/api/v1/xml-imports/${selectedId}`)).data,
    enabled: Boolean(selectedId),
  });

  const lookupEnabled = Boolean(generateFor);
  const categories = useLookup('/financial-categories', lookupEnabled);
  const documentTypes = useLookup('/document-types', lookupEnabled);
  const paymentMethods = useLookup('/payment-methods', lookupEnabled);
  const paymentTerms = useLookup('/payment-terms', lookupEnabled);
  const costCenters = useLookup('/cost-centers', lookupEnabled);

  const reprocess = useMutation({
    mutationFn: async (id: string) => httpClient.post(`/api/v1/xml-imports/${id}/reprocess`),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['xml-imports'] });
      if (selectedId) await queryClient.invalidateQueries({ queryKey: ['xml-import-detail', selectedId] });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => httpClient.delete(`/api/v1/xml-imports/${id}`),
    onSuccess: async () => {
      setSelectedId(undefined);
      await queryClient.invalidateQueries({ queryKey: ['xml-imports'] });
    },
  });

  const generate = useMutation<GeneratedPayableResult, Error, boolean>({
    mutationFn: async (duplicateConfirmed = false) => {
      if (!generateFor) throw new Error('Importação XML não selecionada.');
      const response = await httpClient.post<GeneratedPayableResult>(`/api/v1/xml-imports/${generateFor.id}/generate-payable`, {
        categoryId: categoryId || null,
        documentTypeId: documentTypeId || null,
        paymentMethodId: paymentMethodId || null,
        paymentTermId: paymentTermId || null,
        costCenterId: costCenterId || null,
        description: `NFe ${documentLabel(generateFor)} - ${supplierLabel(generateFor)}`.slice(0, 255),
        duplicateConfirmed,
      });
      return response.data;
    },
    onSuccess: async () => {
      setGenerateFor(undefined);
      setDuplicatePending(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['xml-imports'] }),
        queryClient.invalidateQueries({ queryKey: ['payables'] }),
      ]);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === 'POSSIBLE_DUPLICATE') setDuplicatePending(true);
    },
  });

  const rows = useMemo(() => query.data?.data ?? [], [query.data?.data]);
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / pageSize));
  const firstItem = query.data?.total ? (page - 1) * pageSize + 1 : 0;
  const lastItem = query.data?.total ? Math.min(page * pageSize, query.data.total) : 0;
  const hasFilters = Boolean(search || status || recipientKind || recipientDocumentNumber || supplierId || dueFrom || dueTo || importedFrom || importedTo || pageSize !== 20);
  const summary = useMemo(() => ({
    totalAmount: rows.reduce((sum, item) => sum + Number(amount(item) || 0), 0),
    branches: rows.filter((item) => item.recipientKind === 'BRANCH').length,
    pending: rows.filter((item) => !item.hasGeneratedTitle && !item.generatedTitleId).length,
  }), [rows]);

  function clearFilters(): void {
    setSearch('');
    setStatus('');
    setRecipientKind('');
    setRecipientDocumentNumber('');
    setSupplierId('');
    setDueFrom('');
    setDueTo('');
    setImportedFrom('');
    setImportedTo('');
    setPageSize(20);
    setPage(1);
  }

  function openGenerate(item: XmlImportListItem): void {
    const parameters = item.companyParameters;
    setGenerateFor(item);
    setDuplicatePending(false);
    setCategoryId(parameters?.defaultFinancialCategoryId ?? '');
    setDocumentTypeId(parameters?.defaultDocumentTypeId ?? '');
    setPaymentMethodId(parameters?.defaultPaymentMethodId ?? '');
    setPaymentTermId(parameters?.defaultPaymentTermId ?? '');
    setCostCenterId(parameters?.defaultCostCenterId ?? '');
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Breadcrumb items={[{ label: 'Financeiro', to: '/payables' }, { label: 'XMLs Importados' }]} />
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">XMLs Importados</h1>
          <p className="mt-2 text-slate-600">Consulte NFe recebidas, acompanhe matriz/filial e trate importações antes da geração de contas.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => void query.refetch()}>Atualizar</Button>
          <Button variant="secondary" onClick={() => setXmlImportOpen(true)}>Importar XML</Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm font-semibold text-slate-500">Valor da página</p><p className="mt-2 text-2xl font-black text-slate-950">{currency(summary.totalAmount)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Filiais na página</p><p className="mt-2 text-2xl font-black text-amber-700">{summary.branches}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Pendentes de geração</p><p className="mt-2 text-2xl font-black text-blue-700">{summary.pending}</p></Card>
      </section>

      <Card>
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Importações</h2>
            <p className="mt-1 text-sm text-slate-500">{query.data?.total ?? 0} registro{(query.data?.total ?? 0) === 1 ? '' : 's'} encontrado{(query.data?.total ?? 0) === 1 ? '' : 's'}.</p>
          </div>
          <Button variant="secondary" disabled={!hasFilters} onClick={clearFilters}>Limpar filtros</Button>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_180px_190px_190px]">
          <label className="relative block">
            <span className="sr-only">Pesquisar XML importado</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">⌕</span>
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar chave, documento, fornecedor ou destinatário..." className="min-h-11 w-full rounded-xl border border-slate-300 px-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <select aria-label="Filtrar por status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">Todos os status</option>
            {statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
          <select aria-label="Filtrar por classificação" value={recipientKind} onChange={(event) => { setRecipientKind(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">Matriz, filial ou indefinido</option>
            {recipientKinds.map((item) => <option key={item} value={item}>{kindLabel(item)}</option>)}
          </select>
          <input aria-label="Documento do destinatário" value={recipientDocumentNumber} onChange={(event) => { setRecipientDocumentNumber(event.target.value); setPage(1); }} placeholder="CNPJ destinatário" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[220px_170px_170px_170px_170px_150px]">
          <select aria-label="Filtrar por fornecedor" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">Todos os fornecedores</option>
            {suppliers.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
          </select>
          <input aria-label="Importado de" type="date" value={importedFrom} onChange={(event) => { setImportedFrom(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <input aria-label="Importado até" type="date" value={importedTo} onChange={(event) => { setImportedTo(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <input aria-label="Vencimento de" type="date" value={dueFrom} onChange={(event) => { setDueFrom(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <input aria-label="Vencimento até" type="date" value={dueTo} onChange={(event) => { setDueTo(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <select aria-label="Registros por página" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {query.isLoading ? <p className="py-12 text-center text-slate-500">Carregando...</p> : query.isError ? <p role="alert" className="py-12 text-center text-red-700">Não foi possível carregar os XMLs importados.</p> : <>
            <div className="hidden grid-cols-[128px_1.3fr_1.2fr_150px_128px_128px_156px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
              <span>Importação</span><span>Fornecedor / Documento</span><span>Destinatário</span><span>Classificação</span><span>Vencimento</span><span className="text-right">Valor</span><span className="text-right">Ações</span>
            </div>
            <div className="divide-y divide-slate-100">
              {rows.map((item) => {
                const generated = Boolean(item.hasGeneratedTitle || item.generatedTitleId);
                return <div key={item.id} className="grid gap-3 px-4 py-4 text-sm hover:bg-slate-50 xl:grid-cols-[128px_1.3fr_1.2fr_150px_128px_128px_156px] xl:items-center">
                  <span className="font-semibold text-slate-700">{dateTimePtBr(item.importedAt)}<span className={`mt-2 block w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle[item.statusCode] ?? statusStyle.RECEIVED}`}>{statusLabel(item.statusCode)}</span></span>
                  <span className="min-w-0"><span className="block truncate font-bold text-slate-950">{supplierLabel(item)}</span><span className="block truncate text-xs text-slate-500">{documentLabel(item)}</span></span>
                  <span className="min-w-0"><span className="block truncate font-semibold text-slate-700">{item.recipientLegalName ?? '-'}</span><span className="block truncate text-xs text-slate-500">{formatDocument(item.recipientDocumentNumber)}</span></span>
                  <span className={`w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${kindStyle[item.recipientKind]}`}>{kindLabel(item.recipientKind)}</span>
                  <span className="font-semibold text-slate-700">{datePtBr(item.dueDate)}</span>
                  <span className="font-black text-slate-950 xl:text-right">{currency(amount(item))}</span>
                  <span className="flex flex-wrap items-center gap-3 xl:justify-end">
                    <button className="font-bold text-blue-700 hover:underline" onClick={() => setSelectedId(item.id)}>Ver</button>
                    {!generated && canCreatePayable ? <button className="font-bold text-teal-700 hover:underline" onClick={() => openGenerate(item)}>Gerar</button> : <span className="text-xs font-bold text-emerald-700">{generated ? 'Gerado' : ''}</span>}
                    {!generated && canManageXml ? <button className="font-bold text-red-700 hover:underline" onClick={() => { if (window.confirm('Excluir esta importação XML?')) remove.mutate(item.id); }}>Excluir</button> : null}
                  </span>
                </div>;
              })}
              {rows.length === 0 && <p className="py-12 text-center text-slate-500">Nenhum XML importado encontrado.</p>}
            </div>
          </>}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-slate-500">Exibindo {firstItem}-{lastItem} de {query.data?.total ?? 0}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
            <span className="grid min-w-12 place-items-center rounded-lg bg-blue-600 px-2 text-sm font-bold text-white">{page}/{totalPages}</span>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
          </div>
        </div>

        {remove.error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{remove.error instanceof ApiError ? remove.error.message : 'Não foi possível excluir o XML.'}</p> : null}
        {reprocess.error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{reprocess.error instanceof ApiError ? reprocess.error.message : 'Não foi possível reprocessar o XML.'}</p> : null}
      </Card>

      {selectedId ? <DetailDialog detail={detail.data} loading={detail.isLoading} error={detail.isError} onClose={() => setSelectedId(undefined)} onReprocess={(id) => reprocess.mutate(id)} canReprocess={canManageXml && !detail.data?.hasGeneratedTitle && !detail.data?.generatedTitleId} reprocessing={reprocess.isPending} /> : null}
      {generateFor ? <GenerateDialog item={generateFor} categoryId={categoryId} documentTypeId={documentTypeId} paymentMethodId={paymentMethodId} paymentTermId={paymentTermId} costCenterId={costCenterId} categories={categories.data ?? []} documentTypes={documentTypes.data ?? []} paymentMethods={paymentMethods.data ?? []} paymentTerms={paymentTerms.data ?? []} costCenters={costCenters.data ?? []} duplicatePending={duplicatePending} pending={generate.isPending} error={generate.error} onCategory={setCategoryId} onDocumentType={setDocumentTypeId} onPaymentMethod={setPaymentMethodId} onPaymentTerm={setPaymentTermId} onCostCenter={setCostCenterId} onClose={() => setGenerateFor(undefined)} onGenerate={(confirmed) => generate.mutate(confirmed)} /> : null}
      <XmlImportDialog open={xmlImportOpen} onClose={() => setXmlImportOpen(false)} />
    </div>
  );
}

function useLookup(path: string, enabled: boolean): UseQueryResult<LookupItem[]> {
  return useQuery({
    queryKey: ['xml-imports-lookup', path],
    queryFn: async () => (await httpClient.get<ListResponse<LookupItem>>(`/api/v1${path}`, { params: { pageSize: 100, active: true } })).data.data,
    enabled,
    staleTime: 60000,
  });
}

function DetailDialog({ detail, loading, error, canReprocess, reprocessing, onClose, onReprocess }: { detail?: XmlImportDetail; loading: boolean; error: boolean; canReprocess: boolean; reprocessing: boolean; onClose: () => void; onReprocess: (id: string) => void }): ReactElement {
  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Detalhes do XML importado">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div><h2 className="text-2xl font-bold text-slate-950">Detalhes do XML</h2><p className="mt-1 text-sm text-slate-500">{detail ? documentLabel(detail) : 'Carregando importação...'}</p></div>
          <button type="button" className="text-2xl text-slate-400 hover:text-slate-700" onClick={onClose} aria-label="Fechar">x</button>
        </div>
        {loading ? <p className="py-12 text-center text-slate-500">Carregando...</p> : error || !detail ? <p role="alert" className="py-12 text-center text-red-700">Não foi possível carregar os detalhes.</p> : <>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <Info label="Status" value={statusLabel(detail.statusCode)} />
            <Info label="Classificação" value={kindLabel(detail.recipientKind)} />
            <Info label="Valor" value={currency(amount(detail))} />
            <Info label="Fornecedor" value={supplierLabel(detail)} />
            <Info label="Documento fornecedor" value={formatDocument(detail.supplierDocumentNumber)} />
            <Info label="Destinatário" value={detail.recipientLegalName ?? '-'} />
            <Info label="Documento destinatário" value={formatDocument(detail.recipientDocumentNumber)} />
            <Info label="Emissão" value={datePtBr(detail.issueDate)} />
            <Info label="Vencimento" value={datePtBr(detail.dueDate)} />
          </div>
          {detail.errorMessage ? <p role="alert" className="mt-5 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{detail.errorMessage}</p> : null}
          <div className="mt-6 overflow-hidden rounded-xl border border-slate-200">
            <div className="grid grid-cols-[80px_130px_130px_1fr] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
              <span>Parcela</span><span>Vencimento</span><span>Valor</span><span>Forma bruta</span>
            </div>
            {detail.installments.length ? detail.installments.map((item) => <div key={item.id} className="grid grid-cols-[80px_130px_130px_1fr] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-0"><span>{item.installmentNumber}</span><span>{datePtBr(item.dueDate)}</span><span className="font-bold">{currency(item.amount)}</span><span>{item.paymentMethodRaw ?? '-'}</span></div>) : <p className="px-4 py-8 text-center text-sm text-slate-500">Nenhuma parcela extraída.</p>}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Fechar</Button>
            {canReprocess ? <Button variant="secondary" disabled={reprocessing} onClick={() => onReprocess(detail.id)}>{reprocessing ? 'Reprocessando...' : 'Reprocessar'}</Button> : null}
          </div>
        </>}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }): ReactElement {
  return <div className="rounded-xl border border-slate-200 p-3"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-1 break-words text-sm font-semibold text-slate-800">{value}</p></div>;
}

function GenerateDialog(props: { item: XmlImportListItem; categoryId: string; documentTypeId: string; paymentMethodId: string; paymentTermId: string; costCenterId: string; categories: LookupItem[]; documentTypes: LookupItem[]; paymentMethods: LookupItem[]; paymentTerms: LookupItem[]; costCenters: LookupItem[]; duplicatePending: boolean; pending: boolean; error: Error | null; onCategory: (value: string) => void; onDocumentType: (value: string) => void; onPaymentMethod: (value: string) => void; onPaymentTerm: (value: string) => void; onCostCenter: (value: string) => void; onClose: () => void; onGenerate: (confirmed: boolean) => void }): ReactElement {
  const canGenerate = Boolean(props.categoryId && props.documentTypeId && props.paymentMethodId);
  const error = props.error instanceof ApiError
    ? props.error.code === 'POSSIBLE_DUPLICATE' ? 'Já existe uma conta parecida. Confirme se deseja gerar mesmo assim.' : props.error.message
    : props.error ? 'Não foi possível gerar a conta a pagar.' : undefined;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Gerar conta a pagar do XML">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4">
          <div><h2 className="text-2xl font-bold text-slate-950">Gerar conta a pagar</h2><p className="mt-1 text-sm text-slate-500">{documentLabel(props.item)} - {supplierLabel(props.item)}</p></div>
          <button type="button" className="text-2xl text-slate-400 hover:text-slate-700" onClick={props.onClose} aria-label="Fechar">x</button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Select label="Categoria" value={props.categoryId} items={props.categories} onChange={props.onCategory} />
          <Select label="Tipo de documento" value={props.documentTypeId} items={props.documentTypes} onChange={props.onDocumentType} />
          <Select label="Forma de pagamento" value={props.paymentMethodId} items={props.paymentMethods} onChange={props.onPaymentMethod} />
          <Select label="Condição de pagamento" value={props.paymentTermId} items={props.paymentTerms} onChange={props.onPaymentTerm} optional />
          <Select label="Centro de custo" value={props.costCenterId} items={props.costCenters} onChange={props.onCostCenter} optional />
        </div>
        {error ? <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="secondary" onClick={props.onClose}>Cancelar</Button>
          {props.duplicatePending ? <Button variant="danger" disabled={props.pending} onClick={() => props.onGenerate(true)}>{props.pending ? 'Gerando...' : 'Confirmar e gerar'}</Button> : <Button disabled={!canGenerate || props.pending} onClick={() => props.onGenerate(false)}>{props.pending ? 'Gerando...' : 'Gerar conta'}</Button>}
        </div>
      </div>
    </div>
  );
}

function Select({ label, value, items, optional = false, onChange }: { label: string; value: string; items: LookupItem[]; optional?: boolean; onChange: (value: string) => void }): ReactElement {
  return <label className="grid gap-1.5 text-sm font-semibold text-slate-700">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"><option value="">{optional ? 'Opcional' : 'Selecione'}</option>{items.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}</select></label>;
}
