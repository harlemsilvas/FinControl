import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { httpClient } from '../api/http-client';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import type { OptionResponse } from '../intelligence/contracts';
import { currency, statusLabel, type ListResponse, type PayableListItem } from './payables-types';

const statuses = ['OPEN', 'OVERDUE', 'IN_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'] as const;
type PeriodPreset = 'day' | 'week' | 'month' | 'year' | 'custom';

const statusStyle: Record<string, string> = {
  DRAFT: 'border-slate-200 bg-slate-50 text-slate-700',
  OPEN: 'border-blue-200 bg-blue-50 text-blue-700',
  IN_APPROVAL: 'border-purple-200 bg-purple-50 text-purple-700',
  APPROVED: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  SCHEDULED: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  PARTIALLY_PAID: 'border-amber-200 bg-amber-50 text-amber-700',
  PAID: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  OVERDUE: 'border-red-200 bg-red-50 text-red-700',
  REJECTED: 'border-red-200 bg-red-50 text-red-700',
  CANCELLED: 'border-slate-200 bg-slate-100 text-slate-600',
};

function iso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function rangeForPreset(preset: PeriodPreset, reference = new Date()): { from: string; to: string } {
  if (preset === 'day') return { from: iso(reference), to: iso(reference) };
  if (preset === 'week') {
    const day = reference.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = addDays(reference, mondayOffset);
    return { from: iso(monday), to: iso(addDays(monday, 6)) };
  }
  if (preset === 'year') return { from: iso(new Date(reference.getFullYear(), 0, 1)), to: iso(new Date(reference.getFullYear(), 11, 31)) };
  return { from: iso(new Date(reference.getFullYear(), reference.getMonth(), 1)), to: iso(new Date(reference.getFullYear(), reference.getMonth() + 1, 0)) };
}

function datePtBr(value?: string | null): string {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
}

function isDueToday(value?: string | null): boolean {
  if (!value) return false;
  return value.slice(0, 10) === iso(new Date());
}

function sum(items: PayableListItem[], selector: (item: PayableListItem) => string | number): number {
  return items.reduce((total, item) => total + Number(selector(item) || 0), 0);
}

function documentLabel(item: PayableListItem): string {
  return `${item.documentNumber}${item.documentSeries ? ` / ${item.documentSeries}` : ''}`;
}

function optionLabel(item: { name?: string; legalName?: string; id: string }): string {
  return item.legalName ?? item.name ?? item.id;
}

export function PayablesListPage(): ReactElement {
  const initialRange = rangeForPreset('month');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [period, setPeriod] = useState<PeriodPreset>('month');
  const [dueFrom, setDueFrom] = useState(initialRange.from);
  const [dueTo, setDueTo] = useState(initialRange.to);
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');

  const query = useQuery({
    queryKey: ['payables', page, pageSize, search, status, dueFrom, dueTo, supplierId, categoryId],
    queryFn: async () => {
      const response = await httpClient.get<ListResponse<PayableListItem>>('/api/v1/payables', {
        params: {
          page,
          pageSize,
          search: search || undefined,
          status: status || undefined,
          dueFrom: dueFrom || undefined,
          dueTo: dueTo || undefined,
          supplierId: supplierId || undefined,
          categoryId: categoryId || undefined,
        },
      });
      return response.data;
    },
  });

  const suppliers = useQuery({
    queryKey: ['payables-filter-suppliers'],
    queryFn: async () => (await httpClient.get<OptionResponse>('/api/v1/suppliers', { params: { pageSize: 100, active: true } })).data.data,
    staleTime: 60000,
  });

  const categories = useQuery({
    queryKey: ['payables-filter-categories'],
    queryFn: async () => (await httpClient.get<OptionResponse>('/api/v1/financial-categories', { params: { pageSize: 100, active: true } })).data.data,
    staleTime: 60000,
  });

  const rows = useMemo(() => query.data?.data ?? [], [query.data?.data]);
  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / pageSize));
  const firstItem = query.data?.total ? (page - 1) * pageSize + 1 : 0;
  const lastItem = query.data?.total ? Math.min(page * pageSize, query.data.total) : 0;
  const hasFilters = Boolean(search || status || supplierId || categoryId || dueFrom || dueTo || period !== 'month');
  const summary = useMemo(() => {
    const openRows = rows.filter((item) => item.statusCode !== 'PAID' && item.statusCode !== 'CANCELLED');
    const overdueRows = rows.filter((item) => item.statusCode === 'OVERDUE');
    const paidRows = rows.filter((item) => item.statusCode === 'PAID');
    const todayRows = rows.filter((item) => isDueToday(item.firstDueDate));

    return {
      openTotal: sum(openRows, (item) => item.openBalance),
      openCount: openRows.length,
      todayTotal: sum(todayRows, (item) => item.openBalance),
      todayCount: todayRows.length,
      overdueTotal: sum(overdueRows, (item) => item.openBalance),
      overdueCount: overdueRows.length,
      paidTotal: sum(paidRows, (item) => item.totalAmount),
      paidCount: paidRows.length,
      pageTotal: sum(rows, (item) => item.openBalance),
    };
  }, [rows]);

  function applyPreset(nextPeriod: PeriodPreset): void {
    setPeriod(nextPeriod);
    setPage(1);
    if (nextPeriod === 'custom') return;
    const nextRange = rangeForPreset(nextPeriod);
    setDueFrom(nextRange.from);
    setDueTo(nextRange.to);
  }

  function clearFilters(): void {
    const nextRange = rangeForPreset('month');
    setSearch('');
    setStatus('');
    setSupplierId('');
    setCategoryId('');
    setPeriod('month');
    setDueFrom(nextRange.from);
    setDueTo(nextRange.to);
    setPage(1);
    setPageSize(20);
  }

  const metricCards = [
    { label: 'Total em aberto', value: summary.openTotal, helper: `${summary.openCount} título${summary.openCount === 1 ? '' : 's'}`, icon: '▣', accent: 'border-blue-100 bg-blue-50 text-blue-700' },
    { label: 'Vence hoje', value: summary.todayTotal, helper: `${summary.todayCount} título${summary.todayCount === 1 ? '' : 's'}`, icon: '◷', accent: 'border-amber-100 bg-amber-50 text-amber-700' },
    { label: 'Vencido', value: summary.overdueTotal, helper: `${summary.overdueCount} título${summary.overdueCount === 1 ? '' : 's'}`, icon: '△', accent: 'border-red-100 bg-red-50 text-red-700' },
    { label: 'Pago na página', value: summary.paidTotal, helper: `${summary.paidCount} título${summary.paidCount === 1 ? '' : 's'}`, icon: '✓', accent: 'border-emerald-100 bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Breadcrumb items={[{ label: 'Financeiro', to: '/dashboard' }, { label: 'Contas a Pagar' }]} />
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Contas a Pagar</h1>
          <p className="mt-2 text-slate-600">Consulte, filtre e acompanhe títulos, saldos e documentos do contas a pagar.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" disabled title="Importação XML será conectada após a etapa de armazenamento e leitura do XML">
            Importar XML
          </Button>
          <Button variant="secondary" disabled title="Ações em lote serão conectadas em etapa futura">
            Mais ações
          </Button>
          <Link to="/payables/new">
            <Button>+ Nova conta a pagar</Button>
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => (
          <Card key={metric.label}>
            <div className="flex items-center gap-4">
              <span className={`grid size-12 shrink-0 place-items-center rounded-full border text-xl ${metric.accent}`} aria-hidden="true">
                {metric.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-500">{metric.label}</p>
                <p className="mt-1 truncate text-2xl font-black text-slate-950">{query.isLoading ? '—' : currency(metric.value)}</p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{metric.helper}</p>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <Card>
        <div className="mb-5 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-bold text-slate-950">Títulos a pagar</h2>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {query.data?.total ?? 0} registro{(query.data?.total ?? 0) === 1 ? '' : 's'}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">Filtros aplicados sobre o vencimento da primeira parcela do título.</p>
          </div>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button type="button" className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white" aria-pressed="true">
              Lista
            </button>
            <button type="button" className="rounded-lg px-3 py-2 text-sm font-bold text-slate-400" disabled title="Calendário será conectado em etapa futura">
              Calendário
            </button>
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_190px_190px_190px]">
          <label className="relative block">
            <span className="sr-only">Pesquisar contas a pagar</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">⌕</span>
            <input
              aria-label="Pesquisar contas a pagar"
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="Buscar fornecedor, documento ou descrição…"
              className="min-h-11 w-full rounded-xl border border-slate-300 px-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <select aria-label="Filtrar por período" value={period} onChange={(event) => applyPreset(event.target.value as PeriodPreset)} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="day">Hoje</option>
            <option value="week">Semana atual</option>
            <option value="month">Mês atual</option>
            <option value="year">Ano atual</option>
            <option value="custom">Período personalizado</option>
          </select>
          <input aria-label="Vencimento inicial" type="date" value={dueFrom} onChange={(event) => { setDueFrom(event.target.value); setPeriod('custom'); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          <input aria-label="Vencimento final" type="date" value={dueTo} onChange={(event) => { setDueTo(event.target.value); setPeriod('custom'); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[220px_220px_180px_150px_auto]">
          <select aria-label="Filtrar por fornecedor" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">Todos os fornecedores</option>
            {suppliers.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
          </select>
          <select aria-label="Filtrar por categoria" value={categoryId} onChange={(event) => { setCategoryId(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">Todas as categorias</option>
            {categories.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
          </select>
          <select aria-label="Filtrar por status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">Todos os status</option>
            {statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
          <select aria-label="Registros por página" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
          </select>
          <Button variant="secondary" disabled={!hasFilters} onClick={clearFilters}>Limpar filtros</Button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {query.isLoading ? <p className="py-12 text-center text-slate-500">Carregando…</p> : query.isError ? <p role="alert" className="py-12 text-center text-red-700">Não foi possível carregar as contas.</p> : <>
            <div className="hidden grid-cols-[44px_116px_1.4fr_120px_150px_130px_120px_96px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
              <span /><span>Vencimento</span><span>Fornecedor / Descrição</span><span>Documento</span><span>Categoria</span><span>Forma</span><span className="text-right">Valor</span><span className="text-right">Ações</span>
            </div>
            <div className="divide-y divide-slate-100">
              {rows.map((item) => <div key={item.id} className="grid gap-3 px-4 py-3 text-sm hover:bg-slate-50 xl:grid-cols-[44px_116px_1.4fr_120px_150px_130px_120px_96px] xl:items-center">
                <label className="hidden xl:block"><span className="sr-only">Selecionar {documentLabel(item)}</span><input type="checkbox" className="size-4 rounded border-slate-300 text-blue-600" disabled title="Seleção em lote será conectada em etapa futura" /></label>
                <span className="font-semibold text-slate-700">{datePtBr(item.firstDueDate ?? item.issueDate)}</span>
                <span className="min-w-0"><Link to={`/payables/${item.id}`} className="block truncate font-bold text-slate-950 hover:text-blue-700 hover:underline">{item.supplierName}</Link><span className="block truncate text-xs text-slate-500">{item.description}</span></span>
                <span className="font-semibold text-slate-700">{documentLabel(item)}</span>
                <span className="truncate text-slate-600">{item.categoryName}</span>
                <span className="truncate text-slate-600">{item.paymentMethodName ?? '—'}</span>
                <span className="font-black text-slate-950 xl:text-right">{currency(item.openBalance)}</span>
                <span className="flex items-center gap-3 xl:justify-end"><span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle[item.statusCode] ?? statusStyle.OPEN}`}>{statusLabel(item.statusCode)}</span><Link className="font-bold text-blue-700 hover:underline" to={`/payables/${item.id}`}>Ver</Link></span>
              </div>)}
              {rows.length === 0 && <p className="py-12 text-center text-slate-500">Nenhuma conta encontrada.</p>}
            </div>
          </>}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-slate-500">Exibindo {firstItem}–{lastItem} de {query.data?.total ?? 0} • Total da página: <strong className="text-blue-700">{currency(summary.pageTotal)}</strong></p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
            <span className="grid min-w-10 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">{page}/{totalPages}</span>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
          </div>
        </div>
      </Card>
    </div>
  );
}