import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useMemo, useState, type FormEvent, type ReactElement, type ReactNode } from 'react';
import { httpClient } from '../api/http-client';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { currency, type ListResponse } from './payables-types';

type FrequencyCode = 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ANNUAL';
type RecurrenceStatus = 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'FINISHED';

interface LookupItem { id: string; name?: string; legalName?: string; tradeName?: string | null; accountName?: string }
interface RecurrenceListItem {
  id: string;
  companyId: string;
  companyName: string;
  supplierName: string;
  categoryName: string;
  paymentMethodName: string;
  costCenterName?: string | null;
  description: string;
  baseDocumentNumber?: string | null;
  baseAmount: string | number;
  frequencyCode: FrequencyCode;
  startDate: string;
  endDate?: string | null;
  maxOccurrences?: number | null;
  nextOccurrenceDate?: string | null;
  lastOccurrenceDate?: string | null;
  generatedCount: number;
  statusCode: RecurrenceStatus;
}
interface GenerationOccurrence { occurrenceDate: string; dueDate: string; sequenceNumber: number; documentNumber: string; amount: number }
interface GenerationPreview { recurrenceId: string; occurrences: GenerationOccurrence[]; total: number }
interface GenerationResult { recurrenceId: string; generated: { id: string; documentNumber: string; occurrenceDate: string }[]; total: number }
interface RecurrenceCancellationResult { id: string; cancelledFutureTitles: number; cancelledFutureTitlesRequested: boolean }
interface CancellationPreviewTitle { payableTitleId: string; occurrenceDate: string; sequenceNumber: number; documentNumber: string; documentSeries?: string | null; description: string; statusCode: string; dueDate: string; openBalance: string | number; installmentCount: number }
interface CancellationPreview { recurrenceId: string; titles: CancellationPreviewTitle[]; total: number }
interface RecurrenceFormState {
  companyId: string;
  supplierId: string;
  categoryId: string;
  costCenterId: string;
  documentTypeId: string;
  paymentMethodId: string;
  paymentTermId: string;
  description: string;
  baseDocumentNumber: string;
  baseAmount: string;
  frequencyCode: FrequencyCode;
  startDate: string;
  endDate: string;
  maxOccurrences: string;
  dueDay: string;
  isOpenEnded: boolean;
  notes: string;
}
interface CancelDialogState {
  item: RecurrenceListItem;
  reason: string;
  cancelFutureTitles: boolean;
}

const frequencies: { value: FrequencyCode; label: string }[] = [
  { value: 'MONTHLY', label: 'Mensal' },
  { value: 'WEEKLY', label: 'Semanal' },
  { value: 'BIWEEKLY', label: 'Quinzenal' },
  { value: 'ANNUAL', label: 'Anual' },
];

const statusStyle: Record<RecurrenceStatus, string> = {
  ACTIVE: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  SUSPENDED: 'border-amber-200 bg-amber-50 text-amber-700',
  CANCELLED: 'border-slate-200 bg-slate-100 text-slate-600',
  FINISHED: 'border-blue-200 bg-blue-50 text-blue-700',
};

const emptyForm: RecurrenceFormState = {
  companyId: '',
  supplierId: '',
  categoryId: '',
  costCenterId: '',
  documentTypeId: '',
  paymentMethodId: '',
  paymentTermId: '',
  description: '',
  baseDocumentNumber: '',
  baseAmount: '',
  frequencyCode: 'MONTHLY',
  startDate: new Date().toISOString().slice(0, 10),
  endDate: '',
  maxOccurrences: '',
  dueDay: String(new Date().getDate()),
  isOpenEnded: false,
  notes: '',
};

function optionLabel(item: LookupItem): string {
  return item.tradeName || item.legalName || item.name || item.accountName || item.id;
}

function datePtBr(value?: string | null): string {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '-';
}

function frequencyLabel(value: FrequencyCode): string {
  return frequencies.find((item) => item.value === value)?.label ?? value;
}

function statusLabel(value: RecurrenceStatus): string {
  return { ACTIVE: 'Ativa', SUSPENDED: 'Suspensa', CANCELLED: 'Cancelada', FINISHED: 'Finalizada' }[value];
}

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string' && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

function useLookup(path: string, enabled = true): UseQueryResult<LookupItem[]> {
  return useQuery({
    queryKey: ['recurrences-lookup', path],
    queryFn: async (): Promise<LookupItem[]> => (await httpClient.get<ListResponse<LookupItem>>(`/api/v1${path}`, { params: { pageSize: 100, active: true } })).data.data,
    enabled,
    staleTime: 60000,
  });
}

function SelectField({ label, value, onChange, children, required = false }: { label: string; value: string; onChange: (value: string) => void; children: ReactNode; required?: boolean }): ReactElement {
  return <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>{label}</span><select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{children}</select></label>;
}

export function RecurrencesPage(): ReactElement {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<RecurrenceFormState>(emptyForm);
  const [generateFor, setGenerateFor] = useState<RecurrenceListItem | null>(null);
  const [untilDate, setUntilDate] = useState('');
  const [occurrenceCount, setOccurrenceCount] = useState('6');
  const [preview, setPreview] = useState<GenerationPreview | null>(null);
  const [message, setMessage] = useState('');
  const [createError, setCreateError] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [cancelDialog, setCancelDialog] = useState<CancelDialogState | null>(null);
  const [cancelError, setCancelError] = useState('');

  const query = useQuery({
    queryKey: ['recurrences', page, pageSize, search, status, companyId, supplierId],
    queryFn: async () => (await httpClient.get<ListResponse<RecurrenceListItem>>('/api/v1/recurrences', { params: { page, pageSize, search: search || undefined, status: status || undefined, companyId: companyId || undefined, supplierId: supplierId || undefined } })).data,
  });

  const companies = useLookup('/companies');
  const suppliers = useLookup('/suppliers');
  const categories = useLookup('/financial-categories', formOpen);
  const documentTypes = useLookup('/document-types', formOpen);
  const paymentMethods = useLookup('/payment-methods', formOpen);
  const paymentTerms = useLookup('/payment-terms', formOpen);
  const costCenters = useLookup('/cost-centers', formOpen);

  const create = useMutation({
    mutationFn: async (): Promise<unknown> => {
      const payload = {
        companyId: form.companyId,
        supplierId: form.supplierId,
        categoryId: form.categoryId,
        costCenterId: form.costCenterId || null,
        documentTypeId: form.documentTypeId,
        paymentMethodId: form.paymentMethodId,
        paymentTermId: form.paymentTermId || null,
        description: form.description,
        baseDocumentNumber: form.baseDocumentNumber || null,
        baseAmount: Number(form.baseAmount),
        frequencyCode: form.frequencyCode,
        startDate: form.startDate,
        endDate: form.endDate || null,
        maxOccurrences: form.maxOccurrences ? Number(form.maxOccurrences) : null,
        dueDay: form.dueDay ? Number(form.dueDay) : null,
        isOpenEnded: form.isOpenEnded,
        notes: form.notes || null,
      };
      return (await httpClient.post<unknown>('/api/v1/recurrences', payload)).data;
    },
    onMutate: () => {
      setCreateError('');
      setStatusMessage('');
    },
    onSuccess: async () => {
      setFormOpen(false);
      setForm(emptyForm);
      setMessage('Recorrência salva com sucesso. Agora você já pode gerar os próximos títulos com pré-visualização.');
      await queryClient.invalidateQueries({ queryKey: ['recurrences'] });
    },
    onError: (error) => {
      setCreateError(errorMessage(error, 'Não foi possível salvar a recorrência. Revise os dados obrigatórios e as regras de prazo final.'));
    },
  });

  const previewMutation = useMutation({
    mutationFn: async () => {
      if (!generateFor) throw new Error('Recorrência não selecionada.');
      const response = await httpClient.post<GenerationPreview>(`/api/v1/recurrences/${generateFor.id}/preview-generation`, generationPayload());
      return response.data;
    },
    onMutate: () => {
      setStatusMessage('');
    },
    onSuccess: (result) => {
      setPreview(result);
      setStatusMessage(result.total > 0 ? `${result.total} ocorrência${result.total === 1 ? '' : 's'} pronta${result.total === 1 ? '' : 's'} para revisão antes da geração.` : 'Não há novas ocorrências dentro dos limites informados.');
    },
  });

  const generate = useMutation({
    mutationFn: async () => {
      if (!generateFor) throw new Error('Recorrência não selecionada.');
      const response = await httpClient.post<GenerationResult>(`/api/v1/recurrences/${generateFor.id}/generate`, generationPayload());
      return response.data;
    },
    onSuccess: async (result) => {
      setMessage(`${result.total} título${result.total === 1 ? '' : 's'} gerado${result.total === 1 ? '' : 's'} com sucesso.`);
      setStatusMessage('');
      setGenerateFor(null);
      setPreview(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recurrences'] }),
        queryClient.invalidateQueries({ queryKey: ['payables'] }),
      ]);
    },
  });

  const changeStatus = useMutation({
    mutationFn: async ({ item, action, reason, cancelFutureTitles }: { item: RecurrenceListItem; action: 'suspend' | 'reactivate'; reason?: string; cancelFutureTitles?: boolean }) => {
      const body = action === 'reactivate' ? undefined : { reason: reason ?? 'Suspensão operacional da recorrência.', cancelFutureTitles };
      return httpClient.post(`/api/v1/recurrences/${item.id}/${action}`, body);
    },
    onSuccess: async (_result, variables) => {
      setMessage(
        variables.action === 'reactivate'
          ? 'Recorrência reativada. Ela volta a ficar apta para novas gerações.'
          : 'Recorrência suspensa. Os títulos já gerados permanecem intactos.',
      );
      await queryClient.invalidateQueries({ queryKey: ['recurrences'] });
    },
  });

  const cancelRecurrence = useMutation({
    mutationFn: async () => {
      if (!cancelDialog) throw new Error('Recorrência não selecionada.');
      const response = await httpClient.post<RecurrenceCancellationResult>(`/api/v1/recurrences/${cancelDialog.item.id}/cancel`, {
        reason: cancelDialog.reason,
        cancelFutureTitles: cancelDialog.cancelFutureTitles,
      });
      return response.data;
    },
    onMutate: () => {
      setCancelError('');
    },
    onSuccess: async (result) => {
      const titlesMessage = result.cancelledFutureTitlesRequested
        ? `${result.cancelledFutureTitles} título${result.cancelledFutureTitles === 1 ? '' : 's'} futuro${result.cancelledFutureTitles === 1 ? '' : 's'} em aberto também foi${result.cancelledFutureTitles === 1 ? '' : 'ram'} cancelado${result.cancelledFutureTitles === 1 ? '' : 's'}.`
        : 'Os títulos já gerados seguem no fluxo normal de contas a pagar.';
      setMessage(`Recorrência cancelada. ${titlesMessage}`);
      setCancelDialog(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['recurrences'] }),
        queryClient.invalidateQueries({ queryKey: ['payables'] }),
      ]);
    },
    onError: (error) => {
      setCancelError(errorMessage(error, 'Não foi possível cancelar a recorrência com as opções informadas.'));
    },
  });

  const cancellationPreview = useQuery({
    queryKey: ['recurrences-cancellation-preview', cancelDialog?.item.id],
    queryFn: async () => {
      if (!cancelDialog) throw new Error('Recorrência não selecionada.');
      return (await httpClient.get<CancellationPreview>(`/api/v1/recurrences/${cancelDialog.item.id}/cancellation-preview`)).data;
    },
    enabled: Boolean(cancelDialog),
    staleTime: 30000,
  });

  const rows = useMemo(() => query.data?.data ?? [], [query.data?.data]);
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / pageSize));
  const summary = useMemo(() => ({
    active: rows.filter((item) => item.statusCode === 'ACTIVE').length,
    suspended: rows.filter((item) => item.statusCode === 'SUSPENDED').length,
    pageAmount: rows.reduce((sum, item) => sum + Number(item.baseAmount || 0), 0),
  }), [rows]);

  function generationPayload(): { untilDate?: string; occurrenceCount?: number } {
    return { untilDate: untilDate || undefined, occurrenceCount: occurrenceCount ? Number(occurrenceCount) : undefined };
  }

  function openCreate(): void {
    setForm(emptyForm);
    setMessage('');
    setCreateError('');
    setFormOpen(true);
  }

  function openGenerate(item: RecurrenceListItem): void {
    setGenerateFor(item);
    setPreview(null);
    setUntilDate('');
    setOccurrenceCount('6');
    setMessage('');
    setStatusMessage('');
  }

  function openCancel(item: RecurrenceListItem): void {
    setCancelDialog({
      item,
      reason: 'Cancelamento operacional da recorrência.',
      cancelFutureTitles: false,
    });
    setCancelError('');
    setMessage('');
    setStatusMessage('');
  }

  function submit(event: FormEvent): void {
    event.preventDefault();
    create.mutate();
  }

  function clearFilters(): void {
    setSearch('');
    setStatus('');
    setCompanyId('');
    setSupplierId('');
    setPage(1);
    setPageSize(20);
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Breadcrumb items={[{ label: 'Financeiro', to: '/payables' }, { label: 'Recorrências' }]} />
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Contas Recorrentes</h1>
          <p className="mt-2 text-slate-600">Cadastre modelos recorrentes e gere títulos futuros com preview antes da confirmação.</p>
        </div>
        <Button onClick={openCreate}>+ Nova recorrência</Button>
      </header>

      {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">{message}</div>}

      <section className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm font-semibold text-slate-500">Ativas na página</p><p className="mt-2 text-2xl font-black text-emerald-700">{summary.active}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Suspensas na página</p><p className="mt-2 text-2xl font-black text-amber-700">{summary.suspended}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Valor base da página</p><p className="mt-2 text-2xl font-black text-slate-950">{currency(summary.pageAmount)}</p></Card>
      </section>

      <Card>
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Recorrências cadastradas</h2>
            <p className="mt-1 text-sm text-slate-500">{query.data?.total ?? 0} registro{(query.data?.total ?? 0) === 1 ? '' : 's'} encontrado{(query.data?.total ?? 0) === 1 ? '' : 's'}.</p>
          </div>
          <Button variant="secondary" onClick={clearFilters}>Limpar filtros</Button>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_220px_220px_170px_150px]">
          <input aria-label="Pesquisar recorrência" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar descrição, fornecedor ou empresa..." className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <select aria-label="Filtrar por empresa" value={companyId} onChange={(event) => { setCompanyId(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">Todas as empresas</option>
            {companies.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
          </select>
          <select aria-label="Filtrar por fornecedor" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">Todos os fornecedores</option>
            {suppliers.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
          </select>
          <select aria-label="Filtrar por status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">Todos os status</option>
            {(['ACTIVE', 'SUSPENDED', 'CANCELLED', 'FINISHED'] as RecurrenceStatus[]).map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
          <select aria-label="Registros por página" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
          </select>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {query.isLoading ? <div className="grid gap-2 py-12 text-center text-slate-500"><p className="font-semibold">Carregando recorrências...</p><p className="text-sm">Estamos buscando os modelos ativos, suspensos e finalizados.</p></div> : query.isError ? <div role="alert" className="grid gap-2 py-12 text-center text-red-700"><p className="font-semibold">Não foi possível carregar as recorrências.</p><p className="text-sm text-red-600">Tente novamente em instantes ou revise os filtros aplicados.</p></div> : <>
            <div className="hidden grid-cols-[1.4fr_1fr_140px_120px_130px_190px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
              <span>Descrição / Empresa</span><span>Fornecedor</span><span>Frequência</span><span className="text-right">Valor</span><span>Próxima</span><span className="text-right">Ações</span>
            </div>
            <div className="divide-y divide-slate-100">
              {rows.map((item) => <div key={item.id} className="grid gap-3 px-4 py-4 text-sm hover:bg-slate-50 xl:grid-cols-[1.4fr_1fr_140px_120px_130px_190px] xl:items-center">
                <span className="min-w-0"><span className="block truncate font-bold text-slate-950">{item.description}</span><span className="block truncate text-xs text-slate-500">{item.companyName} • {item.categoryName}</span></span>
                <span className="truncate font-semibold text-slate-700">{item.supplierName}</span>
                <span><span className={`mb-1 block w-fit rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle[item.statusCode]}`}>{statusLabel(item.statusCode)}</span>{frequencyLabel(item.frequencyCode)}</span>
                <span className="font-black text-slate-950 xl:text-right">{currency(item.baseAmount)}</span>
                <span className="font-semibold text-slate-700">{datePtBr(item.nextOccurrenceDate)}<span className="block text-xs text-slate-500">{item.generatedCount} gerado{item.generatedCount === 1 ? '' : 's'}</span></span>
                <span className="flex flex-wrap justify-start gap-2 xl:justify-end">
                  <Button variant="secondary" className="min-h-9 px-3" disabled={item.statusCode !== 'ACTIVE'} onClick={() => openGenerate(item)}>Gerar</Button>
                  {item.statusCode === 'SUSPENDED' ? <Button variant="secondary" className="min-h-9 px-3" onClick={() => changeStatus.mutate({ item, action: 'reactivate' })}>Reativar</Button> : <Button variant="secondary" className="min-h-9 px-3" disabled={item.statusCode !== 'ACTIVE'} onClick={() => changeStatus.mutate({ item, action: 'suspend' })}>Suspender</Button>}
                  <Button variant="danger" className="min-h-9 px-3" disabled={item.statusCode === 'CANCELLED' || item.statusCode === 'FINISHED'} onClick={() => openCancel(item)}>Cancelar</Button>
                </span>
              </div>)}
              {rows.length === 0 && <div className="grid gap-2 py-12 text-center text-slate-500"><p className="font-semibold">Nenhuma recorrência encontrada.</p><p className="text-sm">Ajuste os filtros ou cadastre um novo modelo recorrente para começar.</p></div>}
            </div>
          </>}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-slate-500">Página {page} de {totalPages}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
          </div>
        </div>
      </Card>

      {formOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
        <form onSubmit={submit} className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><h2 className="text-2xl font-black text-slate-950">Nova recorrência</h2><p className="mt-1 text-sm text-slate-500">A geração de títulos será feita manualmente após salvar.</p></div>
            <button type="button" className="text-2xl text-slate-400 hover:text-slate-700" onClick={() => setFormOpen(false)}>×</button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SelectField label="Empresa" required value={form.companyId} onChange={(value) => setForm((current) => ({ ...current, companyId: value }))}><option value="">Selecione</option>{companies.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>) ?? []}</SelectField>
            <SelectField label="Fornecedor" required value={form.supplierId} onChange={(value) => setForm((current) => ({ ...current, supplierId: value }))}><option value="">Selecione</option>{suppliers.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>) ?? []}</SelectField>
            <SelectField label="Categoria" required value={form.categoryId} onChange={(value) => setForm((current) => ({ ...current, categoryId: value }))}><option value="">Selecione</option>{categories.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>) ?? []}</SelectField>
            <SelectField label="Tipo de documento" required value={form.documentTypeId} onChange={(value) => setForm((current) => ({ ...current, documentTypeId: value }))}><option value="">Selecione</option>{documentTypes.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>) ?? []}</SelectField>
            <SelectField label="Forma de pagamento" required value={form.paymentMethodId} onChange={(value) => setForm((current) => ({ ...current, paymentMethodId: value }))}><option value="">Selecione</option>{paymentMethods.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>) ?? []}</SelectField>
            <SelectField label="Condição de pagamento" value={form.paymentTermId} onChange={(value) => setForm((current) => ({ ...current, paymentTermId: value }))}><option value="">Opcional</option>{paymentTerms.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>) ?? []}</SelectField>
            <SelectField label="Centro de custo" value={form.costCenterId} onChange={(value) => setForm((current) => ({ ...current, costCenterId: value }))}><option value="">Opcional</option>{costCenters.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>) ?? []}</SelectField>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700 xl:col-span-2"><span>Descrição</span><input required value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>Documento base</span><input value={form.baseDocumentNumber} onChange={(event) => setForm((current) => ({ ...current, baseDocumentNumber: event.target.value }))} placeholder="Ex.: ALUGUEL-SBC" className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>Valor base</span><input required type="number" min="0.01" step="0.01" value={form.baseAmount} onChange={(event) => setForm((current) => ({ ...current, baseAmount: event.target.value }))} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <SelectField label="Periodicidade" required value={form.frequencyCode} onChange={(value) => setForm((current) => ({ ...current, frequencyCode: value as FrequencyCode }))}>{frequencies.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</SelectField>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>Data inicial</span><input required type="date" value={form.startDate} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>Data final</span><input type="date" value={form.endDate} onChange={(event) => setForm((current) => ({ ...current, endDate: event.target.value }))} disabled={form.isOpenEnded} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>Máx. ocorrências</span><input type="number" min="1" value={form.maxOccurrences} onChange={(event) => setForm((current) => ({ ...current, maxOccurrences: event.target.value }))} disabled={form.isOpenEnded} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>Dia de vencimento</span><input type="number" min="1" max="31" value={form.dueDay} onChange={(event) => setForm((current) => ({ ...current, dueDay: event.target.value }))} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={form.isOpenEnded} onChange={(event) => setForm((current) => ({ ...current, isOpenEnded: event.target.checked, endDate: event.target.checked ? '' : current.endDate, maxOccurrences: event.target.checked ? '' : current.maxOccurrences }))} /> Sem prazo final</label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700 xl:col-span-3"><span>Observações</span><input value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          </div>
          <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            <p className="font-semibold">Antes de salvar</p>
            <p className="mt-1">Você pode informar data final ou quantidade máxima. Se marcar <span className="font-semibold">Sem prazo final</span>, a geração continuará limitada a até 6 meses por operação.</p>
          </div>
          {createError && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{createError}</p>}
          <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setFormOpen(false)}>Cancelar</Button><Button type="submit" disabled={create.isPending}>{create.isPending ? 'Salvando...' : 'Salvar recorrência'}</Button></div>
        </form>
      </div>}

      {generateFor && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><h2 className="text-2xl font-black text-slate-950">Gerar títulos recorrentes</h2><p className="mt-1 text-sm text-slate-500">{generateFor.description} • {currency(generateFor.baseAmount)}</p></div>
            <button type="button" className="text-2xl text-slate-400 hover:text-slate-700" onClick={() => setGenerateFor(null)}>×</button>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>Gerar até</span><input type="date" value={untilDate} onChange={(event) => { setUntilDate(event.target.value); setPreview(null); }} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
            <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>Ou quantidade de ocorrências</span><input type="number" min="1" max="366" value={occurrenceCount} onChange={(event) => { setOccurrenceCount(event.target.value); setPreview(null); }} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
          </div>
          <div className="mt-4 rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold">Como funciona a geração</p>
            <p className="mt-1">Primeiro revise o preview. A confirmação cria os títulos e parcelas futuras com base nas ocorrências ainda não geradas.</p>
          </div>
          <div className="mt-4 flex justify-end"><Button variant="secondary" disabled={previewMutation.isPending} onClick={() => previewMutation.mutate()}>{previewMutation.isPending ? 'Calculando...' : 'Pré-visualizar'}</Button></div>
          {previewMutation.isError && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">Não foi possível gerar o preview. Verifique o limite de até 6 meses.</p>}
          {statusMessage && <p className="mt-4 text-sm font-semibold text-slate-700">{statusMessage}</p>}
          {preview && <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
            <div className="grid grid-cols-[90px_1fr_120px] gap-3 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500"><span>Venc.</span><span>Documento</span><span className="text-right">Valor</span></div>
            <div className="divide-y divide-slate-100">
              {preview.occurrences.map((item) => <div key={item.occurrenceDate} className="grid grid-cols-[90px_1fr_120px] gap-3 px-4 py-3 text-sm"><span>{datePtBr(item.dueDate)}</span><span className="font-semibold text-slate-800">{item.documentNumber}<span className="block text-xs text-slate-500">Sequência {item.sequenceNumber}</span></span><span className="text-right font-black">{currency(item.amount)}</span></div>)}
              {preview.occurrences.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Nenhuma ocorrência pendente para gerar.</p>}
            </div>
          </div>}
          {generate.isError && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">Não foi possível gerar os títulos. Talvez não existam ocorrências pendentes.</p>}
          <div className="mt-6 flex justify-end gap-3"><Button variant="secondary" onClick={() => setGenerateFor(null)}>Cancelar</Button><Button disabled={!preview?.occurrences.length || generate.isPending} onClick={() => generate.mutate()}>{generate.isPending ? 'Gerando...' : preview?.occurrences.length ? `Confirmar geração de ${preview.occurrences.length}` : 'Confirmar geração'}</Button></div>
        </div>
      </div>}

      {cancelDialog && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/45 p-4" role="dialog" aria-modal="true" aria-label="Cancelar recorrência">
        <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div><h2 className="text-2xl font-black text-slate-950">Cancelar recorrência</h2><p className="mt-1 text-sm text-slate-500">{cancelDialog.item.description} • {cancelDialog.item.supplierName}</p></div>
            <button type="button" className="text-2xl text-slate-400 hover:text-slate-700" onClick={() => setCancelDialog(null)} aria-label="Fechar cancelamento">×</button>
          </div>
          <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            <p className="font-semibold">O que acontece ao cancelar</p>
            <p className="mt-1">A série é encerrada de forma definitiva. Você pode manter os títulos já gerados no fluxo normal ou também cancelar somente os títulos futuros ainda em aberto.</p>
          </div>
          <label className="mt-4 grid gap-1.5 text-sm font-semibold text-slate-700">
            <span>Motivo do cancelamento</span>
            <textarea value={cancelDialog.reason} onChange={(event) => setCancelDialog((current) => current ? { ...current, reason: event.target.value } : current)} rows={4} className="rounded-2xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </label>
          <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
            <input aria-label="Também cancelar títulos futuros em aberto" type="checkbox" checked={cancelDialog.cancelFutureTitles} onChange={(event) => setCancelDialog((current) => current ? { ...current, cancelFutureTitles: event.target.checked } : current)} />
            <span><span className="block font-semibold text-slate-900">Também cancelar títulos futuros em aberto</span><span className="mt-1 block text-slate-500">Somente títulos com vencimento após hoje e sem pagamento efetivo entram nessa ação. Títulos pagos, parcialmente pagos, vencidos ou já cancelados permanecem intactos.</span></span>
          </label>
          <div className="mt-4 rounded-2xl border border-slate-200">
            <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Prévia dos títulos futuros elegíveis</p>
              <p className="mt-1 text-xs text-slate-500">Esta lista mostra exatamente os títulos que podem ser cancelados junto com a recorrência nesta data.</p>
            </div>
            {cancellationPreview.isLoading ? <div className="px-4 py-6 text-sm text-slate-500">Carregando títulos elegíveis...</div> : cancellationPreview.isError ? <div className="px-4 py-6 text-sm text-red-700">Não foi possível carregar a prévia dos títulos futuros.</div> : <div>
              <div className="px-4 py-3 text-sm font-semibold text-slate-700">{cancellationPreview.data?.total ?? 0} título{(cancellationPreview.data?.total ?? 0) === 1 ? '' : 's'} futuro{(cancellationPreview.data?.total ?? 0) === 1 ? '' : 's'} elegível{(cancellationPreview.data?.total ?? 0) === 1 ? '' : 'is'}.</div>
              <div className="divide-y divide-slate-100">
                {cancellationPreview.data?.titles.map((title) => <div key={title.payableTitleId} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[120px_1fr_140px] md:items-center">
                  <span className="font-semibold text-slate-700">{datePtBr(title.dueDate)}<span className="block text-xs text-slate-500">Seq. {title.sequenceNumber}</span></span>
                  <span className="text-slate-900">{title.documentNumber}{title.documentSeries ? `/${title.documentSeries}` : ''}<span className="block text-xs text-slate-500">{title.description}</span></span>
                  <span className="text-right font-black text-slate-900">{currency(title.openBalance)}</span>
                </div>)}
                {cancellationPreview.data && cancellationPreview.data.titles.length === 0 ? <div className="px-4 py-6 text-sm text-slate-500">Nenhum título futuro em aberto será afetado mesmo que a opção esteja marcada.</div> : null}
              </div>
            </div>}
          </div>
          {cancelError && <p role="alert" className="mt-4 text-sm font-semibold text-red-700">{cancelError}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCancelDialog(null)}>Voltar</Button>
            <Button variant="danger" disabled={cancelRecurrence.isPending || cancellationPreview.isLoading || cancelDialog.reason.trim().length < 3} onClick={() => cancelRecurrence.mutate()}>{cancelRecurrence.isPending ? 'Cancelando...' : cancelDialog.cancelFutureTitles ? 'Cancelar recorrência e títulos futuros' : 'Cancelar recorrência'}</Button>
          </div>
        </div>
      </div>}
    </div>
  );
}
