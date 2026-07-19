/* eslint-disable @typescript-eslint/no-base-to-string */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { Controller, useFieldArray, useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ApiError, httpClient } from '../api/http-client';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { CurrencyInput } from '../components/ui/currency-input';
import { currency, statusLabel, type Installment, type ListResponse, type PayableDetail } from './payables-types';
import { payableTabs } from './payable-form-contract';

interface Lookup {
  id: string;
  name?: string;
  legalName?: string;
  code?: string;
}

type OccurrenceType = 'SINGLE' | 'INSTALLMENT';
type SaveMode = 'close' | 'new';

interface Values {
  supplierId: string;
  categoryId: string;
  documentTypeId: string;
  paymentTermId?: string;
  costCenterId?: string;
  documentNumber: string;
  documentSeries?: string;
  description: string;
  issueDate: string;
  baseDueDate: string;
  originalAmount: number;
  discountAmount: number;
  additionalAmount: number;
  defaultPaymentMethodId: string;
  occurrenceType: OccurrenceType;
  dueDay: number;
  installmentCount: number;
  notes?: string;
  draft: boolean;
  installments: Installment[];
}

type Tab = (typeof payableTabs)[number];

const tabs = payableTabs;
const inputClass =
  'min-h-10 rounded-lg border border-slate-300 bg-white px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100';
const textareaClass =
  'rounded-lg border border-slate-300 bg-white p-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function optionLabel(item: Lookup): string {
  return item.legalName ?? item.name ?? item.code ?? item.id;
}

function useLookup(path: string): UseQueryResult<Lookup[]> {
  return useQuery({
    queryKey: ['payable-lookup', path],
    queryFn: async () => {
      const response = await httpClient.get<ListResponse<Lookup>>(`/api/v1${path}`, {
        params: { pageSize: 100, active: true }
      });
      return response.data.data;
    },
    staleTime: 60000
  });
}

function toDateOnly(value?: string): string {
  return value ? value.slice(0, 10) : '';
}

function normalizeCount(value: number | undefined): number {
  const count = Number(value || 1);
  if (!Number.isFinite(count) || count < 1) return 1;
  return Math.min(Math.trunc(count), 120);
}

function normalizeDay(value: number | undefined, fallbackDate: string): number {
  const fallback = Number(fallbackDate.slice(8, 10)) || 1;
  const day = Number(value || fallback);
  if (!Number.isFinite(day)) return fallback;
  return Math.min(Math.max(Math.trunc(day), 1), 31);
}

function dueDateFrom(baseDate: string, monthOffset: number, dueDay: number): string {
  if (!baseDate) return '';

  const parts = baseDate.split('-').map(Number);
  const year = parts[0] ?? new Date().getFullYear();
  const month = parts[1] ?? 1;
  const fallbackDay = parts[2] ?? 1;
  const target = new Date(year, month - 1 + monthOffset, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  const safeDay = Math.min(normalizeDay(dueDay, baseDate || today()) || fallbackDay, lastDay);
  target.setDate(safeDay);
  const yyyy = String(target.getFullYear()).padStart(4, '0');
  const mm = String(target.getMonth() + 1).padStart(2, '0');
  const dd = String(target.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function splitAmount(total: number, count: number): number[] {
  const normalizedCount = normalizeCount(count);
  const cents = Math.round(Number(total || 0) * 100);
  const base = Math.trunc(cents / normalizedCount);
  const remainder = cents - base * normalizedCount;
  return Array.from({ length: normalizedCount }, (_, index) => (base + (index < remainder ? 1 : 0)) / 100);
}

function buildInstallments({
  total,
  baseDueDate,
  paymentMethodId,
  occurrenceType,
  dueDay,
  installmentCount
}: {
  total: number;
  baseDueDate: string;
  paymentMethodId: string;
  occurrenceType: OccurrenceType;
  dueDay: number;
  installmentCount: number;
}): Installment[] {
  const count = occurrenceType === 'INSTALLMENT' ? normalizeCount(installmentCount) : 1;
  const amounts = splitAmount(total, count);

  return amounts.map((amount, index) => ({
    installmentNumber: index + 1,
    installmentCount: count,
    amount,
    dueDate: dueDateFrom(baseDueDate, index, dueDay),
    paymentMethodId
  }));
}

function formatDatePtBr(value?: string): string {
  if (!value) return '\u2014';
  const [year, month, day] = value.split('-');
  if (!year || !month || !day) return '\u2014';
  return `${day}/${month}/${year}`;
}

function dueBadge(baseDueDate: string): { label: string; className: string } {
  if (!baseDueDate) {
    return { label: 'Sem vencimento', className: 'bg-slate-100 text-slate-700' };
  }

  const todayAtMidnight = new Date(`${today()}T00:00:00`);
  const dueAtMidnight = new Date(`${baseDueDate}T00:00:00`);
  const days = Math.round((dueAtMidnight.getTime() - todayAtMidnight.getTime()) / 86400000);

  if (days < 0) return { label: 'Vencida', className: 'bg-red-50 text-red-700' };
  if (days === 0) return { label: 'Vencendo hoje', className: 'bg-amber-50 text-amber-700' };
  if (days === 1) return { label: 'Vence amanhã', className: 'bg-blue-50 text-blue-700' };
  return { label: `Vence em ${days} dias`, className: 'bg-emerald-50 text-emerald-700' };
}

function defaultValues(): Values {
  const currentDate = today();

  return {
    supplierId: '',
    categoryId: '',
    documentTypeId: '',
    paymentTermId: '',
    costCenterId: '',
    documentNumber: '',
    documentSeries: '',
    description: '',
    issueDate: currentDate,
    baseDueDate: currentDate,
    originalAmount: 0,
    discountAmount: 0,
    additionalAmount: 0,
    defaultPaymentMethodId: '',
    occurrenceType: 'SINGLE',
    dueDay: Number(currentDate.slice(8, 10)),
    installmentCount: 1,
    notes: '',
    draft: false,
    installments: [
      {
        installmentNumber: 1,
        installmentCount: 1,
        amount: 0,
        dueDate: currentDate,
        paymentMethodId: ''
      }
    ]
  };
}

export function PayableFormPage(): ReactElement {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('Dados da Conta');
  const [duplicatePayload, setDuplicatePayload] = useState<Values>();
  const [saveMode, setSaveMode] = useState<SaveMode>('close');

  const suppliers = useLookup('/suppliers');
  const categories = useLookup('/financial-categories');
  const documentTypes = useLookup('/document-types');
  const methods = useLookup('/payment-methods');
  const terms = useLookup('/payment-terms');
  const costCenters = useLookup('/cost-centers');

  const detail = useQuery({
    queryKey: ['payable', id],
    queryFn: async () => {
      const response = await httpClient.get<PayableDetail>(`/api/v1/payables/${id}`);
      return response.data;
    },
    enabled: editing
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors }
  } = useForm<Values>({
    defaultValues: defaultValues()
  });

  const installments = useFieldArray({ control, name: 'installments' });

  useEffect(() => {
    if (!detail.data) return;

    const existingInstallments = detail.data.installments.map(item => ({
      ...item,
      amount: Number(item.amount),
      dueDate: toDateOnly(item.dueDate)
    }));
    const firstInstallment = existingInstallments[0];
    const firstDueDate = firstInstallment?.dueDate || today();

    reset({
      supplierId: detail.data.supplierId,
      categoryId: detail.data.categoryId,
      documentTypeId: detail.data.documentTypeId,
      paymentTermId: detail.data.paymentTermId ?? '',
      costCenterId: detail.data.costCenterId ?? '',
      documentNumber: detail.data.documentNumber,
      documentSeries: detail.data.documentSeries ?? '',
      description: detail.data.description,
      issueDate: toDateOnly(detail.data.issueDate),
      baseDueDate: firstDueDate,
      originalAmount: Number(detail.data.originalAmount),
      discountAmount: Number(detail.data.discountAmount),
      additionalAmount: Number(detail.data.additionalAmount),
      defaultPaymentMethodId: firstInstallment?.paymentMethodId ?? '',
      occurrenceType: existingInstallments.length > 1 ? 'INSTALLMENT' : 'SINGLE',
      dueDay: Number(firstDueDate.slice(8, 10)) || Number(today().slice(8, 10)),
      installmentCount: existingInstallments.length || 1,
      notes: detail.data.notes ?? '',
      draft: detail.data.statusCode === 'DRAFT',
      installments: existingInstallments
    });
  }, [detail.data, reset]);

  const original = watch('originalAmount') || 0;
  const discount = watch('discountAmount') || 0;
  const additional = watch('additionalAmount') || 0;
  const total = useMemo(() => Number(original) - Number(discount) + Number(additional), [original, discount, additional]);
  const baseDueDate = watch('baseDueDate');
  const defaultPaymentMethodId = watch('defaultPaymentMethodId');
  const occurrenceType = watch('occurrenceType');
  const dueDay = normalizeDay(watch('dueDay'), baseDueDate || today());
  const occurrenceInstallmentCount = occurrenceType === 'INSTALLMENT' ? normalizeCount(watch('installmentCount')) : 1;
  const installmentValues = watch('installments');
  const installmentTotal = installmentValues.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const badge = dueBadge(baseDueDate);

  useEffect(() => {
    if (editing) return;

    installments.replace(
      buildInstallments({
        total,
        baseDueDate,
        paymentMethodId: defaultPaymentMethodId,
        occurrenceType,
        dueDay,
        installmentCount: occurrenceInstallmentCount
      })
    );
  }, [baseDueDate, defaultPaymentMethodId, dueDay, editing, installments, occurrenceInstallmentCount, occurrenceType, total]);

  const mutation = useMutation({
    mutationFn: async ({ values, confirmed = false }: { values: Values; confirmed?: boolean }) => {
      if (editing) {
        await httpClient.patch(`/api/v1/payables/${id}`, {
          supplierId: values.supplierId,
          categoryId: values.categoryId,
          documentTypeId: values.documentTypeId,
          paymentTermId: values.paymentTermId || null,
          costCenterId: values.costCenterId || null,
          documentNumber: values.documentNumber,
          documentSeries: values.documentSeries || null,
          description: values.description,
          issueDate: values.issueDate,
          originalAmount: values.originalAmount,
          discountAmount: values.discountAmount,
          additionalAmount: values.additionalAmount,
          notes: values.notes || null
        });

        for (const item of values.installments) {
          if (item.id) {
            await httpClient.patch(`/api/v1/payable-installments/${item.id}`, {
              amount: item.amount,
              dueDate: item.dueDate,
              paymentMethodId: item.paymentMethodId
            });
          }
        }

        return id;
      }

      const response = await httpClient.post<{ id: string }>('/api/v1/payables', {
        supplierId: values.supplierId,
        categoryId: values.categoryId,
        documentTypeId: values.documentTypeId,
        paymentTermId: values.paymentTermId || null,
        costCenterId: values.costCenterId || null,
        documentNumber: values.documentNumber,
        documentSeries: values.documentSeries || null,
        description: values.description,
        issueDate: values.issueDate,
        originalAmount: values.originalAmount,
        discountAmount: values.discountAmount,
        additionalAmount: values.additionalAmount,
        notes: values.notes || null,
        draft: values.draft,
        installments: values.installments,
        duplicateConfirmed: confirmed
      });

      return response.data.id;
    },
    onSuccess: async savedId => {
      setDuplicatePayload(undefined);
      await queryClient.invalidateQueries({ queryKey: ['payables'] });

      if (saveMode === 'new') {
        reset(defaultValues());
        setTab('Dados da Conta');
        await navigate('/payables/new', { replace: true });
        return;
      }

      await navigate(`/payables/${savedId}`, { replace: true });
    },
    onError: (error, variables) => {
      if (error instanceof ApiError && error.code === 'POSSIBLE_DUPLICATE') setDuplicatePayload(variables.values);
    }
  });

  const submit = handleSubmit(async values => {
    if (Math.round(installmentTotal * 100) !== Math.round(total * 100)) {
      setTab('Parcelas');
      return;
    }

    await mutation.mutateAsync({ values }).catch(() => undefined);
  });

  const cancelTitle = async (): Promise<void> => {
    if (!id) return;

    const reason = window.prompt('Informe a justificativa do cancelamento:');
    if (!reason) return;

    await httpClient.post(`/api/v1/payables/${id}/cancel`, { reason });
    await queryClient.invalidateQueries({ queryKey: ['payables'] });
    await navigate('/payables');
  };

  if (editing && detail.isLoading) {
    return <p className="py-20 text-center text-slate-500">Carregando t?tulo?</p>;
  }

  return (
    <form className="grid gap-6" onSubmit={event => void submit(event)}>
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            <Link to="/dashboard" className="font-medium text-slate-600 hover:text-teal-700">
              Financeiro
            </Link>
            <span aria-hidden="true">?</span>
            <Link to="/payables" className="font-medium text-slate-600 hover:text-teal-700">
              Contas a Pagar
            </Link>
            <span aria-hidden="true">?</span>
            <span className="font-semibold text-slate-800">{editing ? 'Editar Conta' : 'Nova Conta'}</span>
          </nav>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold">{editing ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${badge.className}`}>{badge.label}</span>
          </div>
          {detail.data && (
            <p className="mt-2 text-sm text-slate-600">
              {detail.data.documentNumber} ? {statusLabel(detail.data.statusCode)}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          {editing && detail.data?.statusCode !== 'CANCELLED' && (
            <Button type="button" variant="danger" onClick={() => void cancelTitle()}>
              Cancelar t?tulo
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={() => void navigate('/payables')}>
            Cancelar
          </Button>
          <Button type="submit" variant="secondary" disabled={mutation.isPending} onClick={() => setSaveMode('new')}>
            Salvar e Novo
          </Button>
          <Button type="submit" disabled={mutation.isPending} onClick={() => setSaveMode('close')}>
            {mutation.isPending ? 'Salvando?' : 'Salvar'}
          </Button>
        </div>
      </header>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {tabs.map(item => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${
              tab === item ? 'border-teal-700 text-teal-800' : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {item}
          </button>
        ))}
      </div>

      {tab === 'Dados da Conta' && (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <Card>
            <section className="grid gap-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Dados da Conta</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Informe os dados principais. Parcelas e vencimentos ser?o preparados automaticamente para a conta.
                </p>
              </div>

              <div className="grid gap-5 lg:grid-cols-2">
                <Select
                  label="Forma de Pagamento"
                  required
                  items={methods.data}
                  registration={register('defaultPaymentMethodId', { required: true })}
                />
                <Select label="Fornecedor" required items={suppliers.data} registration={register('supplierId', { required: true })} />
                <Field label="Vencimento" required>
                  <input type="date" className={inputClass} {...register('baseDueDate', { required: true })} />
                </Field>
                <Field label="Valor" required>
                  <Controller
                    control={control}
                    name="originalAmount"
                    rules={{ required: true, min: 0.01 }}
                    render={({ field }) => (
                      <CurrencyInput className={inputClass} value={field.value} onValueChange={value => field.onChange(value ?? 0)} onBlur={field.onBlur} />
                    )}
                  />
                </Field>
                <Field label="Data de Emiss?o" required>
                  <input type="date" className={inputClass} {...register('issueDate', { required: true })} />
                </Field>
                <Field label="N? do Documento" required>
                  <input className={inputClass} {...register('documentNumber', { required: true })} />
                </Field>
                <Field label="Histórico / Descrição" required className="lg:col-span-2">
                  <textarea rows={3} className={textareaClass} {...register('description', { required: true })} />
                </Field>
                <Select label="Categoria" required items={categories.data} registration={register('categoryId', { required: true })} />
                <Select label="Tipo de Documento" required items={documentTypes.data} registration={register('documentTypeId', { required: true })} />
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-base font-bold text-slate-950">Ocorr?ncia</h3>
                <div className="mt-4 grid gap-5 lg:grid-cols-3">
                  <Field label="Tipo de Ocorr?ncia" required>
                    <select className={inputClass} {...register('occurrenceType', { required: true })}>
                      <option value="SINGLE">?nica</option>
                      <option value="INSTALLMENT">Parcelada</option>
                      <option value="RECURRENT" disabled>
                        Recorrente ? em modelagem
                      </option>
                    </select>
                  </Field>
                  <Field label="Dia do Vencimento">
                    <input type="number" min="1" max="31" className={inputClass} {...register('dueDay', { valueAsNumber: true, min: 1, max: 31 })} />
                  </Field>
                  <Field label="N?mero de Parcelas">
                    <input
                      type="number"
                      min="1"
                      max="120"
                      disabled={occurrenceType !== 'INSTALLMENT'}
                      className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-500`}
                      {...register('installmentCount', { valueAsNumber: true, min: 1, max: 120 })}
                    />
                  </Field>
                </div>
                <div className="mt-4 grid gap-3 lg:grid-cols-2">
                  <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm font-medium text-slate-500">
                    <input type="checkbox" disabled className="size-4" />
                    Alterar conta recorrente
                  </label>
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
                    <span className="font-semibold text-slate-700">Marcadores:</span> seleção será conectada na próxima onda.
                  </div>
                </div>
              </div>

              <details className="rounded-2xl border border-slate-200 p-5">
                <summary className="cursor-pointer text-sm font-bold text-slate-800">Detalhes adicionais preservados</summary>
                <div className="mt-5 grid gap-5 lg:grid-cols-2">
                  <Field label="S?rie">
                    <input className={inputClass} {...register('documentSeries')} />
                  </Field>
                  <Select label="Condição de Pagamento" items={terms.data} registration={register('paymentTermId')} />
                  <Field label="Desconto">
                    <Controller
                      control={control}
                      name="discountAmount"
                      rules={{ min: 0 }}
                      render={({ field }) => (
                        <CurrencyInput className={inputClass} value={field.value} onValueChange={value => field.onChange(value ?? 0)} onBlur={field.onBlur} />
                      )}
                    />
                  </Field>
                  <Field label="Acr?scimo">
                    <Controller
                      control={control}
                      name="additionalAmount"
                      rules={{ min: 0 }}
                      render={({ field }) => (
                        <CurrencyInput className={inputClass} value={field.value} onValueChange={value => field.onChange(value ?? 0)} onBlur={field.onBlur} />
                      )}
                    />
                  </Field>
                </div>
              </details>

              {Object.keys(errors).length > 0 && <p className="text-sm text-red-700">Revise os campos obrigat?rios.</p>}
            </section>
          </Card>

          <div className="h-fit">
            <Card>
              <aside className="grid gap-5">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Resumo</h2>
                <p className="mt-1 text-sm text-slate-500">Pr?via calculada antes de salvar.</p>
              </div>
              <SummaryItem label="Vencimento" value={formatDatePtBr(baseDueDate)} />
              <SummaryItem label="Valor" value={currency(total)} />
              <SummaryItem label="Ocorr?ncia" value={occurrenceInstallmentCount === 1 ? '?nica' : `${occurrenceInstallmentCount} parcelas`} />
              <SummaryItem label="Total das parcelas" value={currency(installmentTotal)} />
              <Link to="/agenda" className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-center text-sm font-bold text-teal-800 hover:bg-teal-100">
                Ver Agenda Financeira
              </Link>
              </aside>
            </Card>
          </div>
        </div>
      )}

      {tab === 'Parcelas' && (
        <Card>
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Parcelas</h2>
              <p className="text-sm text-slate-600">A soma deve ser igual a {currency(total)}.</p>
            </div>
            {!editing && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  installments.append({
                    installmentNumber: installments.fields.length + 1,
                    installmentCount: installments.fields.length + 1,
                    amount: 0,
                    dueDate: '',
                    paymentMethodId: defaultPaymentMethodId
                  })
                }
              >
                Adicionar parcela
              </Button>
            )}
          </div>
          <div className="grid gap-4">
            {installments.fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 rounded-xl border border-slate-200 p-4 md:grid-cols-[100px_130px_1fr_1fr_auto]">
                <Field label="Parcela" small>
                  <input readOnly className={inputClass} {...register(`installments.${index}.installmentNumber`, { valueAsNumber: true })} />
                </Field>
                <Field label="Total" small>
                  <input className={inputClass} {...register(`installments.${index}.installmentCount`, { valueAsNumber: true, min: 1 })} />
                </Field>
                <Field label="Valor" small>
                  <Controller
                    control={control}
                    name={`installments.${index}.amount`}
                    rules={{ required: true, min: 0.01 }}
                    render={({ field: amountField }) => (
                      <CurrencyInput
                        className={inputClass}
                        value={amountField.value}
                        onValueChange={value => amountField.onChange(value ?? 0)}
                        onBlur={amountField.onBlur}
                      />
                    )}
                  />
                </Field>
                <Field label="Vencimento" small>
                  <input type="date" className={inputClass} {...register(`installments.${index}.dueDate`, { required: true })} />
                </Field>
                <div className="md:col-span-2">
                  <Select label="Forma de Pagamento" required items={methods.data} registration={register(`installments.${index}.paymentMethodId`, { required: true })} />
                </div>
                {!editing && installments.fields.length > 1 && (
                  <button type="button" className="self-end text-sm font-semibold text-red-700" onClick={() => installments.remove(index)}>
                    Remover
                  </button>
                )}
              </div>
            ))}
          </div>
          <div
            className={`mt-5 rounded-lg p-3 text-sm font-semibold ${
              Math.round(installmentTotal * 100) === Math.round(total * 100) ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
            }`}
          >
            Total das parcelas: {currency(installmentTotal)}{' '}
            {Math.round(installmentTotal * 100) !== Math.round(total * 100) && '? ajuste necess?rio'}
          </div>
        </Card>
      )}

      {tab === 'Impostos' && (
        <Card>
          <Empty title="Impostos" text="As regras de impostos e retenções permanecem pendentes de decisão funcional. Nenhum valor fiscal será presumido nesta etapa." />
        </Card>
      )}

      {tab === 'Aprova\u00e7\u00f5es' && (
        <Card>
          {detail.data?.approvals.length ? (
            <div className="grid gap-3">
              {detail.data.approvals.map((item, index) => (
                <div key={index} className="rounded-lg border border-slate-200 p-4 text-sm">
                  Nível {String(item.approvalLevel ?? '—')} • {statusLabel(String(item.statusCode ?? 'PENDING'))}
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Aprovações" text={editing ? 'Nenhuma aprovação registrada para este título.' : 'Salve o título antes de iniciar o fluxo de aprovação.'} />
          )}
        </Card>
      )}

      {tab === 'Anexos' && (
        <Card>
          {detail.data?.attachments.length ? (
            <div className="grid gap-3">
              {detail.data.attachments.map((item, index) => (
                <div key={index} className="rounded-lg border border-slate-200 p-4 text-sm font-medium">
                  {String(item.originalName ?? 'Arquivo')}
                </div>
              ))}
            </div>
          ) : (
            <Empty title="Anexos" text="O armazenamento bin?rio aguarda a pol?tica de arquivos. Metadados existentes ser?o exibidos aqui." />
          )}
        </Card>
      )}

      {tab === 'Observa\u00e7\u00f5es' && (
        <Card>
          <div className="grid gap-5">
            <Select label="Centro de Custo" items={costCenters.data} registration={register('costCenterId')} />
            <Field label="Observações">
              <textarea rows={6} className={textareaClass} {...register('notes')} />
            </Field>
            <label className="flex items-center gap-3 text-sm font-medium">
              <input type="checkbox" className="size-4 accent-teal-700" {...register('draft')} />
              Salvar como rascunho
            </label>
          </div>
        </Card>
      )}

      {mutation.error && !(mutation.error instanceof ApiError && mutation.error.code === 'POSSIBLE_DUPLICATE') && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-800">
          {mutation.error instanceof ApiError ? mutation.error.message : 'N?o foi poss?vel salvar o t?tulo.'}
        </p>
      )}

      {duplicatePayload && (
        <div className="fixed inset-0 z-30 grid place-items-center bg-slate-950/60 p-4">
          <div role="alertdialog" aria-modal="true" className="max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h2 className="text-xl font-bold">Poss?vel duplicidade</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              J? existe um t?tulo com o mesmo fornecedor, documento e s?rie. Revise os dados ou confirme conscientemente a continuidade.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setDuplicatePayload(undefined)}>
                Revisar
              </Button>
              <Button onClick={() => mutation.mutate({ values: duplicatePayload, confirmed: true })}>Confirmar e salvar</Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function Field({
  label,
  children,
  required = false,
  small = false,
  className = ''
}: {
  label: string;
  children: ReactElement;
  required?: boolean;
  small?: boolean;
  className?: string;
}): ReactElement {
  return (
    <label className={`grid gap-1.5 ${small ? 'text-xs' : 'text-sm'} font-medium ${className}`}>
      <span>
        {label}
        {required && <span className="text-red-600"> *</span>}
      </span>
      {children}
    </label>
  );
}

function Select({
  label,
  items,
  registration,
  required = false
}: {
  label: string;
  items: Lookup[] | undefined;
  registration: UseFormRegisterReturn;
  required?: boolean;
}): ReactElement {
  return (
    <Field label={label} required={required}>
      <select className={inputClass} aria-required={required} {...registration}>
        <option value="">Selecione</option>
        {items?.map(item => (
          <option key={item.id} value={item.id}>
            {optionLabel(item)}
          </option>
        ))}
      </select>
    </Field>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }): ReactElement {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-bold text-slate-950">{value}</p>
    </div>
  );
}

function Empty({ title, text }: { title: string; text: string }): ReactElement {
  return (
    <div className="py-12 text-center">
      <h2 className="font-bold">{title}</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-600">{text}</p>
    </div>
  );
}
