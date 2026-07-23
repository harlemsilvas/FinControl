import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type ReactElement } from 'react';
import { ApiError, httpClient } from '../api/http-client';
import { Button } from '../components/ui/button';
import { currency, type PayableListItem } from './payables-types';

interface RecurrenceDetail {
  id: string;
  companyId: string;
  supplierId: string;
  categoryId: string;
  costCenterId?: string | null;
  documentTypeId: string;
  paymentMethodId: string;
  paymentTermId?: string | null;
  description: string;
  baseDocumentNumber?: string | null;
  baseAmount: string | number;
  frequencyCode: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'ANNUAL';
  startDate: string;
  endDate?: string | null;
  maxOccurrences?: number | null;
  dueDay?: number | null;
  isOpenEnded?: boolean;
  notes?: string | null;
}

interface RecurrencePreviewTitle {
  payableTitleId: string;
  occurrenceDate: string;
  sequenceNumber: number;
  documentNumber: string;
  documentSeries?: string | null;
  description: string;
  dueDate: string;
  openBalance: string | number;
}

interface RecurrencePreview {
  recurrenceId: string;
  effectiveDate?: string | null;
  titles: RecurrencePreviewTitle[];
  total: number;
}

interface RevisionFormState {
  effectiveDate: string;
  description: string;
  baseAmount: string;
  categoryId: string;
  costCenterId: string;
  documentTypeId: string;
  paymentMethodId: string;
  paymentTermId: string;
  dueDay: string;
  endDate: string;
  maxOccurrences: string;
  isOpenEnded: boolean;
  notes: string;
  reason: string;
  cancelFutureTitles: boolean;
}

type DialogMode = 'cancel' | 'revise';

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function dateOnly(value?: string | null): string {
  if (!value) return '';
  const match = value.match(/^\d{4}-\d{2}-\d{2}/);
  return match?.[0] ?? '';
}

function isIsoDate(value?: string | null): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value ?? '');
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function datePtBr(value?: string | null): string {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
}

function nextBusinessActionDate(candidate?: string | null): string {
  const tomorrow = addDays(new Date(), 1);
  const tomorrowIso = iso(tomorrow);
  const candidateDate = dateOnly(candidate);
  return candidateDate && candidateDate > tomorrowIso ? candidateDate : tomorrowIso;
}

export function isTerminalRecurrence(status?: string | null): boolean {
  return status === 'CANCELLED' || status === 'FINISHED';
}

function recurrenceStatusLabel(status?: string | null): string {
  return status === 'FINISHED' ? 'Série finalizada' : status === 'CANCELLED' ? 'Série cancelada' : 'Recorrente';
}

function defaultRevisionEndDate(effectiveDate: string): string {
  const safeEffectiveDate = dateOnly(effectiveDate);
  if (!isIsoDate(safeEffectiveDate)) return '';
  return iso(addDays(new Date(`${safeEffectiveDate}T00:00:00`), 180));
}

function normalizeRevisionForm(form: RevisionFormState): RevisionFormState {
  const effectiveDate = dateOnly(form.effectiveDate);
  const endDate = dateOnly(form.endDate);
  if (form.isOpenEnded || form.maxOccurrences || endDate) return { ...form, effectiveDate, endDate };
  return { ...form, effectiveDate, endDate: defaultRevisionEndDate(effectiveDate) };
}

function recurrenceErrorMessage(error: unknown): string {
  if (!(error instanceof ApiError)) return error instanceof Error ? error.message : 'Não foi possível revisar a série recorrente.';
  if (error.code === 'RECURRENCE_TERMINAL') return 'Esta série já está encerrada e não pode mais receber revisão. Atualize a listagem e escolha uma série ativa.';
  if (error.code === 'RECURRENCE_REFERENCE_INVALID') {
    const details = error.details && typeof error.details === 'object' ? error.details as { field?: unknown; id?: unknown } : {};
    const suffix = details.field ? ` Campo: ${String(details.field)}${details.id ? ` (${String(details.id)})` : ''}.` : '';
    return `${error.message}${suffix}`;
  }
  if (error.code === 'INVALID_REFERENCE') {
    const details = error.details && typeof error.details === 'object' ? error.details as { constraint?: unknown } : {};
    const suffix = details.constraint ? ` Constraint: ${String(details.constraint)}.` : '';
    return `O banco recusou uma referência ou regra da nova recorrência.${suffix}`;
  }
  if (error.code === 'VALIDATION_ERROR' && Array.isArray(error.details)) {
    const effectiveDateIssue = error.details.find((detail) => {
      if (!detail || typeof detail !== 'object') return false;
      return (detail as { path?: unknown }).path === 'effectiveDate';
    }) as { message?: unknown } | undefined;
    if (effectiveDateIssue?.message) return `A data de vigência precisa estar no formato AAAA-MM-DD. Selecione a data novamente antes de salvar. Detalhe: ${String(effectiveDateIssue.message)}`;
    const endDateIssue = error.details.find((detail) => {
      if (!detail || typeof detail !== 'object') return false;
      return (detail as { path?: unknown }).path === 'endDate';
    }) as { message?: unknown } | undefined;
    if (endDateIssue?.message) {
      const message = String(endDateIssue.message);
      if (message === 'Invalid ISO date') return 'A data final estava em formato inválido. Ajuste a data final ou deixe o campo vazio para aplicarmos novamente o padrão de 180 dias.';
      return `A nova vigência precisa de um limite. Preenchemos 180 dias por padrão, mas você pode ajustar a data final, informar a quantidade máxima ou marcar "Sem prazo final". Detalhe: ${message}`;
    }
  }
  return error.message || 'Não foi possível revisar a série recorrente.';
}

export function RecurrenceActionsIconButton({
  onClick,
  disabled = false,
}: {
  onClick: () => void;
  disabled?: boolean;
}): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label="Ações da recorrência"
      title="Ações da recorrência"
      className="grid size-8 place-items-center rounded-full border border-blue-200 bg-blue-50 text-sm font-bold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
    >
      ↻
    </button>
  );
}

export function RecurrenceActionsLauncher({
  item,
  onFeedback,
}: {
  item: PayableListItem;
  onFeedback?: (message: string) => void;
}): ReactElement | null {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>('cancel');
  const [seriesReason, setSeriesReason] = useState('Ajuste operacional da série recorrente.');
  const [seriesCancelFutureTitles, setSeriesCancelFutureTitles] = useState(false);
  const [seriesError, setSeriesError] = useState('');
  const [revisionForm, setRevisionForm] = useState<RevisionFormState | null>(null);

  const recurrenceDetail = useQuery({
    queryKey: ['payables-series-detail', item.recurrenceId],
    queryFn: async () => (await httpClient.get<RecurrenceDetail>(`/api/v1/recurrences/${item.recurrenceId}`)).data,
    enabled: open && Boolean(item.recurrenceId),
  });

  const recurrencePreview = useQuery({
    queryKey: ['payables-series-preview', item.recurrenceId, mode, revisionForm?.effectiveDate],
    queryFn: async () => {
      const effectiveDate = dateOnly(revisionForm?.effectiveDate);
      const params = mode === 'revise' && isIsoDate(effectiveDate) ? { effectiveDate } : undefined;
      return (await httpClient.get<RecurrencePreview>(`/api/v1/recurrences/${item.recurrenceId}/cancellation-preview`, { params })).data;
    },
    enabled: open && Boolean(item.recurrenceId) && (mode === 'cancel' || isIsoDate(revisionForm?.effectiveDate)),
  });

  const cancelSeries = useMutation({
    mutationFn: async () => {
      if (!item.recurrenceId) throw new Error('Recorrência não selecionada.');
      return (await httpClient.post(`/api/v1/recurrences/${item.recurrenceId}/cancel`, {
        reason: seriesReason,
        cancelFutureTitles: seriesCancelFutureTitles,
      })).data as { cancelledFutureTitles: number; cancelledFutureTitlesRequested: boolean };
    },
    onMutate: () => setSeriesError(''),
    onSuccess: async (result) => {
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payables'] }),
        queryClient.invalidateQueries({ queryKey: ['recurrences'] }),
        queryClient.invalidateQueries({ queryKey: ['payable', item.id] }),
      ]);
      const base = result.cancelledFutureTitlesRequested ? `${result.cancelledFutureTitles} próximo(s) título(s) também cancelado(s).` : 'Os próximos títulos permanecem no fluxo atual.';
      onFeedback?.(`Série recorrente cancelada. ${base}`);
    },
    onError: (error) => {
      setSeriesError(error instanceof Error ? error.message : 'Não foi possível cancelar a série recorrente.');
    },
  });

  const reviseSeries = useMutation({
    mutationFn: async () => {
      if (!item.recurrenceId || !revisionForm) throw new Error('Revisão não preparada.');
      const payload = normalizeRevisionForm(revisionForm);
      if (!isIsoDate(payload.effectiveDate)) throw new Error('Informe uma data de vigência válida antes de salvar a revisão.');
      return (await httpClient.post(`/api/v1/recurrences/${item.recurrenceId}/revise`, {
        effectiveDate: payload.effectiveDate,
        description: payload.description,
        baseAmount: Number(payload.baseAmount),
        categoryId: payload.categoryId,
        costCenterId: payload.costCenterId || null,
        documentTypeId: payload.documentTypeId,
        paymentMethodId: payload.paymentMethodId,
        paymentTermId: payload.paymentTermId || null,
        dueDay: payload.dueDay ? Number(payload.dueDay) : null,
        endDate: payload.endDate || null,
        maxOccurrences: payload.maxOccurrences ? Number(payload.maxOccurrences) : null,
        isOpenEnded: payload.isOpenEnded,
        notes: payload.notes || null,
        reason: payload.reason,
        cancelFutureTitles: payload.cancelFutureTitles,
      })).data as { effectiveDate: string; cancelledFutureTitles: number };
    },
    onMutate: () => setSeriesError(''),
    onSuccess: async (result) => {
      setOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payables'] }),
        queryClient.invalidateQueries({ queryKey: ['recurrences'] }),
        queryClient.invalidateQueries({ queryKey: ['payable', item.id] }),
      ]);
      onFeedback?.(`Série revisada a partir de ${datePtBr(result.effectiveDate)}.`);
    },
    onError: (error) => {
      setSeriesError(recurrenceErrorMessage(error));
    },
  });

  useEffect(() => {
    if (!open) return;
    if (mode === 'cancel') {
      setSeriesReason('Ajuste operacional da série recorrente.');
      setSeriesCancelFutureTitles(false);
      return;
    }
    if (!recurrenceDetail.data) return;
    const effectiveDate = nextBusinessActionDate(item.firstDueDate || item.recurrenceOccurrenceDate);
    const fallbackEndDate = !recurrenceDetail.data.endDate && !recurrenceDetail.data.maxOccurrences && !recurrenceDetail.data.isOpenEnded
      ? defaultRevisionEndDate(effectiveDate)
      : '';
    setRevisionForm({
      effectiveDate,
      description: recurrenceDetail.data.description,
      baseAmount: String(recurrenceDetail.data.baseAmount),
      categoryId: recurrenceDetail.data.categoryId,
      costCenterId: recurrenceDetail.data.costCenterId || '',
      documentTypeId: recurrenceDetail.data.documentTypeId,
      paymentMethodId: recurrenceDetail.data.paymentMethodId,
      paymentTermId: recurrenceDetail.data.paymentTermId || '',
      dueDay: recurrenceDetail.data.dueDay ? String(recurrenceDetail.data.dueDay) : '',
      endDate: dateOnly(recurrenceDetail.data.endDate) || fallbackEndDate,
      maxOccurrences: recurrenceDetail.data.maxOccurrences ? String(recurrenceDetail.data.maxOccurrences) : '',
      isOpenEnded: Boolean(recurrenceDetail.data.isOpenEnded),
      notes: recurrenceDetail.data.notes || '',
      reason: 'Revisão operacional da série recorrente.',
      cancelFutureTitles: true,
    });
  }, [item.firstDueDate, item.recurrenceOccurrenceDate, mode, open, recurrenceDetail.data]);

  if (!item.recurrenceId) return null;

  function chooseAction(nextMode: DialogMode): void {
    if (isTerminalRecurrence(item.recurrenceStatusCode)) {
      onFeedback?.(`A série vinculada a este título já está encerrada (${recurrenceStatusLabel(item.recurrenceStatusCode).toLowerCase()}) e não pode ser revisada nem cancelada novamente.`);
      setMenuOpen(false);
      return;
    }
    setSeriesError('');
    setMode(nextMode);
    setMenuOpen(false);
    setOpen(true);
  }

  return (
    <>
      <span className="relative inline-grid">
        <RecurrenceActionsIconButton onClick={() => setMenuOpen((current) => !current)} />
        {menuOpen ? (
          <span className="absolute right-0 top-10 z-30 grid min-w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 text-sm font-semibold shadow-xl" role="menu" aria-label="Menu de ações da recorrência">
            <button type="button" role="menuitem" className="px-4 py-2 text-left text-slate-700 hover:bg-blue-50 hover:text-blue-700" onClick={() => chooseAction('revise')}>
              Revisar recorrência
            </button>
            <button type="button" role="menuitem" className="px-4 py-2 text-left text-red-700 hover:bg-red-50" onClick={() => chooseAction('cancel')}>
              Cancelar recorrência
            </button>
          </span>
        ) : null}
      </span>
      {open ? (
        <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Ações da recorrência">
          <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-950">Ações da recorrência</h2>
                <p className="mt-1 text-sm text-slate-500">{item.description} • {item.supplierName}</p>
              </div>
              <button type="button" className="text-2xl text-slate-400 hover:text-slate-700" onClick={() => setOpen(false)} aria-label="Fechar ações da recorrência">×</button>
            </div>
            <div className="mb-5 flex gap-2">
              <Button variant={mode === 'cancel' ? 'primary' : 'secondary'} onClick={() => setMode('cancel')}>Cancelar série</Button>
              <Button variant={mode === 'revise' ? 'primary' : 'secondary'} onClick={() => setMode('revise')}>Revisar a partir de data</Button>
            </div>
            {mode === 'cancel' ? <div className="grid gap-4">
              <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm text-rose-900">
                <p className="font-semibold">Cancelar série direto da conta</p>
                <p className="mt-1">Você está agindo sobre um título recorrente. A série pode ser encerrada aqui, com opção de também cancelar os próximos títulos ainda elegíveis.</p>
              </div>
              <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
                <span>Motivo</span>
                <textarea rows={4} value={seriesReason} onChange={(event) => setSeriesReason(event.target.value)} className="rounded-2xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
              </label>
              <label className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <input aria-label="Também cancelar próximos títulos elegíveis" type="checkbox" checked={seriesCancelFutureTitles} onChange={(event) => setSeriesCancelFutureTitles(event.target.checked)} />
                <span><span className="block font-semibold text-slate-900">Também cancelar próximos títulos elegíveis</span><span className="mt-1 block text-slate-500">A prévia abaixo mostra exatamente quais títulos futuros ainda em aberto podem ser afetados hoje, 23/07/2026.</span></span>
              </label>
              <SeriesPreview preview={recurrencePreview.data} loading={recurrencePreview.isLoading} error={recurrencePreview.isError} />
              {seriesError && <p role="alert" className="text-sm font-semibold text-red-700">{seriesError}</p>}
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setOpen(false)}>Fechar</Button>
                <Button variant="danger" disabled={cancelSeries.isPending || seriesReason.trim().length < 3} onClick={() => cancelSeries.mutate()}>{cancelSeries.isPending ? 'Cancelando...' : 'Cancelar série'}</Button>
              </div>
            </div> : <div className="grid gap-4">
              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <p className="font-semibold">Revisão com vigência futura</p>
                <p className="mt-1">A configuração atual será encerrada na véspera da data escolhida e uma nova recorrência será criada a partir dela. O histórico anterior permanece preservado.</p>
              </div>
              {!revisionForm || recurrenceDetail.isLoading ? <p className="text-sm text-slate-500">Carregando dados da recorrência...</p> : <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>Vigência a partir de</span><input type="date" value={revisionForm.effectiveDate} min={nextBusinessActionDate()} onChange={(event) => setRevisionForm((current) => {
                  if (!current) return current;
                  const nextEffectiveDate = event.target.value;
                  const previousDefaultEndDate = defaultRevisionEndDate(current.effectiveDate);
                  const shouldRefreshEndDate = !current.isOpenEnded && !current.maxOccurrences && (!current.endDate || current.endDate === previousDefaultEndDate);
                  return {
                    ...current,
                    effectiveDate: nextEffectiveDate,
                    endDate: shouldRefreshEndDate ? defaultRevisionEndDate(nextEffectiveDate) : current.endDate,
                  };
                })} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>Valor base</span><input type="number" min="0.01" step="0.01" value={revisionForm.baseAmount} onChange={(event) => setRevisionForm((current) => current ? { ...current, baseAmount: event.target.value } : current)} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2"><span>Descrição</span><input value={revisionForm.description} onChange={(event) => setRevisionForm((current) => current ? { ...current, description: event.target.value } : current)} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>Dia de vencimento</span><input type="number" min="1" max="31" value={revisionForm.dueDay} onChange={(event) => setRevisionForm((current) => current ? { ...current, dueDay: event.target.value } : current)} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>Data final</span><input type="date" value={revisionForm.endDate} disabled={revisionForm.isOpenEnded} onChange={(event) => setRevisionForm((current) => current ? { ...current, endDate: event.target.value } : current)} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" /></label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700"><span>Máx. ocorrências</span><input type="number" min="1" value={revisionForm.maxOccurrences} disabled={revisionForm.isOpenEnded} onChange={(event) => setRevisionForm((current) => current ? { ...current, maxOccurrences: event.target.value } : current)} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100" /></label>
                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 md:col-span-2"><input type="checkbox" checked={revisionForm.isOpenEnded} onChange={(event) => setRevisionForm((current) => {
                  if (!current) return current;
                  if (event.target.checked) return { ...current, isOpenEnded: true, endDate: '', maxOccurrences: '' };
                  const endDate = current.endDate || current.maxOccurrences ? current.endDate : defaultRevisionEndDate(current.effectiveDate);
                  return { ...current, isOpenEnded: false, endDate, maxOccurrences: current.maxOccurrences };
                })} /> Sem prazo final</label>
                {!revisionForm.isOpenEnded && !revisionForm.maxOccurrences ? <p className="text-xs text-slate-500 md:col-span-2">Quando a série nova não informa quantidade máxima, usamos uma data final inicial de 180 dias a partir da vigência para evitar bloqueios silenciosos. Você pode ajustar esse campo antes de salvar.</p> : null}
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2"><span>Observações</span><textarea rows={3} value={revisionForm.notes} onChange={(event) => setRevisionForm((current) => current ? { ...current, notes: event.target.value } : current)} className="rounded-2xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="grid gap-1.5 text-sm font-semibold text-slate-700 md:col-span-2"><span>Motivo da revisão</span><textarea rows={3} value={revisionForm.reason} onChange={(event) => setRevisionForm((current) => current ? { ...current, reason: event.target.value } : current)} className="rounded-2xl border border-slate-300 px-3 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                <label className="flex items-start gap-3 rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 md:col-span-2"><input aria-label="Também cancelar títulos futuros a partir da vigência" type="checkbox" checked={revisionForm.cancelFutureTitles} onChange={(event) => setRevisionForm((current) => current ? { ...current, cancelFutureTitles: event.target.checked } : current)} /><span><span className="block font-semibold text-slate-900">Também cancelar títulos futuros a partir da vigência</span><span className="mt-1 block text-slate-500">Use esta opção quando os próximos títulos da série antiga não devem mais permanecer válidos após a nova vigência.</span></span></label>
              </div>}
              <SeriesPreview preview={recurrencePreview.data} loading={recurrencePreview.isLoading} error={recurrencePreview.isError} />
              {seriesError && <p role="alert" className="text-sm font-semibold text-red-700">{seriesError}</p>}
              <div className="flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setOpen(false)}>Fechar</Button>
                <Button disabled={reviseSeries.isPending || !revisionForm || revisionForm.reason.trim().length < 3} onClick={() => reviseSeries.mutate()}>{reviseSeries.isPending ? 'Revisando...' : 'Salvar nova vigência'}</Button>
              </div>
            </div>}
          </div>
        </div>
      ) : null}
    </>
  );
}

function SeriesPreview({ preview, loading, error }: { preview?: RecurrencePreview; loading: boolean; error: boolean }): ReactElement {
  if (loading) return <div className="rounded-2xl border border-slate-200 px-4 py-6 text-sm text-slate-500">Carregando títulos futuros elegíveis...</div>;
  if (error) return <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">Não foi possível carregar a prévia dos títulos futuros.</div>;
  return <div className="overflow-hidden rounded-2xl border border-slate-200">
    <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-900">{preview?.total ?? 0} título(s) futuro(s) elegível(is)</div>
    <div className="divide-y divide-slate-100">
      {preview?.titles.map((title) => <div key={title.payableTitleId} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[120px_1fr_120px] md:items-center">
        <span className="font-semibold text-slate-700">{datePtBr(title.dueDate)}<span className="block text-xs text-slate-500">Seq. {title.sequenceNumber}</span></span>
        <span className="text-slate-900">{title.documentNumber}{title.documentSeries ? `/${title.documentSeries}` : ''}<span className="block text-xs text-slate-500">{title.description}</span></span>
        <span className="text-right font-black text-slate-900">{currency(title.openBalance)}</span>
      </div>)}
      {preview && preview.titles.length === 0 ? <div className="px-4 py-6 text-sm text-slate-500">Nenhum título futuro elegível encontrado para esta ação.</div> : null}
    </div>
  </div>;
}
