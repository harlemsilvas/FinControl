import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { httpClient } from '../api/http-client';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { currency } from '../payables/payables-types';
import { iso, shortDate, type AgendaItem, type AgendaResponse, type DashboardResponse, type OptionResponse } from './contracts';

type View = 'day' | 'week' | 'month';

interface CalendarDay {
  date: Date;
  key: string;
  isCurrentMonth: boolean;
  isToday: boolean;
}

const viewLabels: Record<View, string> = { day: 'Diario', week: 'Semanal', month: 'Mensal' };
const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
const todayKey = iso(new Date());

function parseDate(value: string): Date {
  return new Date(`${value}T12:00:00`);
}

function addDays(date: Date, amount: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function startOfWeek(date: Date): Date {
  return addDays(date, -date.getDay());
}

function endOfWeek(date: Date): Date {
  return addDays(startOfWeek(date), 6);
}

function range(view: View, value: string): { from: string; to: string } {
  const date = parseDate(value);
  if (view === 'day') return { from: value, to: value };
  if (view === 'week') return { from: iso(startOfWeek(date)), to: iso(endOfWeek(date)) };
  return { from: iso(new Date(date.getFullYear(), date.getMonth(), 1)), to: iso(new Date(date.getFullYear(), date.getMonth() + 1, 0)) };
}

function calendarDays(view: View, reference: string): CalendarDay[] {
  const date = parseDate(reference);
  const currentMonth = date.getMonth();
  const start = view === 'month' ? startOfWeek(new Date(date.getFullYear(), date.getMonth(), 1)) : view === 'week' ? startOfWeek(date) : date;
  const end = view === 'month' ? endOfWeek(new Date(date.getFullYear(), date.getMonth() + 1, 0)) : view === 'week' ? endOfWeek(date) : date;
  const days: CalendarDay[] = [];

  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    const key = iso(cursor);
    days.push({ date: new Date(cursor), key, isCurrentMonth: view !== 'month' || cursor.getMonth() === currentMonth, isToday: key === todayKey });
  }

  return days;
}

function moveReference(reference: string, view: View, direction: -1 | 1): string {
  const date = parseDate(reference);
  if (view === 'day') return iso(addDays(date, direction));
  if (view === 'week') return iso(addDays(date, direction * 7));
  return iso(new Date(date.getFullYear(), date.getMonth() + direction, 1));
}

function periodTitle(view: View, reference: string): string {
  const date = parseDate(reference);
  if (view === 'day') return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
  if (view === 'week') {
    const period = range('week', reference);
    return `${shortDate(period.from)} a ${shortDate(period.to)}`;
  }
  const value = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function amountOf(items: AgendaItem[], highlight: AgendaItem['highlight']): string {
  return items.reduce((total, item) => total + (item.highlight === highlight ? Number(item.openBalance) : 0), 0).toFixed(2);
}

function groupByDueDate(items: AgendaItem[]): Map<string, AgendaItem[]> {
  const grouped = new Map<string, AgendaItem[]>();
  for (const item of items) {
    grouped.set(item.dueDate, [...(grouped.get(item.dueDate) ?? []), item]);
  }
  return grouped;
}

function compactName(value: string): string {
  const cleaned = value.replace(/\s+/g, ' ').trim();
  if (cleaned.length <= 24) return cleaned;
  return `${cleaned.slice(0, 23).trimEnd()}...`;
}

const itemStyle: Record<AgendaItem['highlight'], string> = {
  OVERDUE: 'border-red-500 bg-red-50 text-red-950',
  TODAY: 'border-amber-500 bg-amber-50 text-amber-950',
  UPCOMING: 'border-blue-600 bg-blue-50 text-blue-950',
};

const dotStyle: Record<AgendaItem['highlight'] | 'PAID', string> = {
  PAID: 'bg-emerald-600',
  UPCOMING: 'bg-blue-600',
  TODAY: 'bg-amber-500',
  OVERDUE: 'bg-red-600',
};

function SummaryCard({ title, amount, count, tone, icon }: { title: string; amount: string | number; count: number; tone: string; icon: string }): ReactElement {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <span className={`grid h-14 w-14 place-items-center rounded-2xl text-2xl ${tone}`} aria-hidden="true">{icon}</span>
        <div>
          <p className="text-sm font-medium text-slate-600">{title}</p>
          <p className="mt-1 text-2xl font-black tracking-tight text-slate-950">{currency(amount)}</p>
          <p className="mt-1 text-sm text-slate-500">{count} documento{count === 1 ? '' : 's'}</p>
        </div>
      </div>
    </section>
  );
}

function CalendarItem({ item }: { item: AgendaItem }): ReactElement {
  const supplierName = compactName(item.supplierName);

  return (
    <Link
      to={`/payables/${item.payableTitleId}`}
      title={`${item.supplierName} - ${item.documentNumber} - Parcela ${item.installmentNumber}/${item.installmentCount}`}
      className={`block max-w-full overflow-hidden rounded-lg border-l-4 p-2 text-[0.72rem] leading-tight shadow-sm transition hover:shadow-md ${itemStyle[item.highlight]}`}
    >
      <strong className="block min-w-0 truncate">{supplierName}</strong>
      <span className="block font-semibold">{currency(item.openBalance)}</span>
      <span className="block min-w-0 truncate text-slate-600">{item.documentNumber} · Parcela {item.installmentNumber}/{item.installmentCount}</span>
    </Link>
  );
}

export function AgendaPage(): ReactElement {
  const [view, setView] = useState<View>('month');
  const [reference, setReference] = useState(iso(new Date()));
  const [supplierId, setSupplier] = useState('');
  const [categoryId, setCategory] = useState('');
  const period = useMemo(() => range(view, reference), [view, reference]);
  const days = useMemo(() => calendarDays(view, reference), [view, reference]);

  const query = useQuery({
    queryKey: ['agenda', view, reference, supplierId, categoryId],
    queryFn: async () => (await httpClient.get<AgendaResponse>('/api/v1/agenda', { params: { ...period, supplierId: supplierId || undefined, categoryId: categoryId || undefined } })).data,
  });
  const dashboard = useQuery({
    queryKey: ['agenda-dashboard', view, reference, supplierId, categoryId],
    queryFn: async () => (await httpClient.get<DashboardResponse>('/api/v1/dashboard', { params: { ...period, supplierId: supplierId || undefined, categoryId: categoryId || undefined } })).data,
  });
  const suppliers = useQuery({
    queryKey: ['agenda-suppliers'],
    queryFn: async () => (await httpClient.get<OptionResponse>('/api/v1/suppliers', { params: { pageSize: 100, active: true } })).data.data,
  });
  const categories = useQuery({
    queryKey: ['agenda-categories'],
    queryFn: async () => (await httpClient.get<OptionResponse>('/api/v1/financial-categories', { params: { pageSize: 100, active: true } })).data.data,
  });

  const items = useMemo(() => query.data?.data ?? [], [query.data?.data]);
  const grouped = useMemo(() => groupByDueDate(items), [items]);
  const overdueCount = items.filter((item) => item.highlight === 'OVERDUE').length;
  const todayCount = items.filter((item) => item.highlight === 'TODAY').length;
  const upcomingCount = items.filter((item) => item.highlight === 'UPCOMING').length;
  const isCalendarLoading = query.isLoading || dashboard.isLoading;

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Breadcrumb items={[{ label: 'Financeiro', to: '/dashboard' }, { label: 'Agenda' }]} />
          <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-950">Agenda Financeira</h1>
          <p className="mt-2 text-slate-600">Visao dos vencimentos entre {shortDate(period.from)} e {shortDate(period.to)}.</p>
        </div>
        <Link to="/payables/new" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-blue-700 px-5 text-sm font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-800">
          + Nova conta a pagar
        </Link>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard title="Vencimentos no periodo" amount={dashboard.data?.summary.totalPayable ?? query.data?.total ?? 0} count={query.data?.count ?? 0} tone="bg-blue-50 text-blue-700 ring-1 ring-blue-100" icon="□" />
        <SummaryCard title="Pago" amount={dashboard.data?.summary.paid ?? 0} count={0} tone="bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" icon="✓" />
        <SummaryCard title="A vencer" amount={dashboard.data?.summary.upcoming ?? amountOf(items, 'UPCOMING')} count={upcomingCount + todayCount} tone="bg-sky-50 text-sky-700 ring-1 ring-sky-100" icon="○" />
        <SummaryCard title="Vencido" amount={dashboard.data?.summary.overdue ?? amountOf(items, 'OVERDUE')} count={overdueCount} tone="bg-red-50 text-red-700 ring-1 ring-red-100" icon="!" />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setReference(moveReference(reference, view, -1))} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-lg font-bold text-slate-700 transition hover:bg-slate-50" aria-label="Periodo anterior">‹</button>
            <button type="button" onClick={() => setReference(moveReference(reference, view, 1))} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 text-lg font-bold text-slate-700 transition hover:bg-slate-50" aria-label="Proximo periodo">›</button>
            <button type="button" onClick={() => setReference(iso(new Date()))} className="min-h-10 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50">Hoje</button>
            <input aria-label="Data de referencia" type="date" value={reference} onChange={(event) => setReference(event.target.value)} className="min-h-10 rounded-xl border border-slate-200 px-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
          </div>
          <h2 className="text-center text-2xl font-black text-slate-950">{periodTitle(view, reference)}</h2>
          <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
            {(['month', 'week', 'day'] as const).map((value) => (
              <button key={value} type="button" onClick={() => setView(value)} className={`rounded-lg px-4 py-2 text-sm font-bold transition ${view === value ? 'bg-blue-700 text-white shadow-sm' : 'text-slate-600 hover:bg-white'}`}>
                {viewLabels[value]}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 border-b border-slate-200 bg-white p-4 xl:grid-cols-[1fr_180px_220px_auto]">
          <label className="relative block">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">⌕</span>
            <select aria-label="Fornecedor" value={supplierId} onChange={(event) => setSupplier(event.target.value)} className="min-h-11 w-full rounded-xl border border-slate-200 bg-white px-9 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              <option value="">Todos os fornecedores</option>
              {suppliers.data?.map((item) => <option key={item.id} value={item.id}>{item.legalName}</option>)}
            </select>
          </label>
          <select aria-label="Status" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" disabled>
            <option>Todos os status</option>
          </select>
          <select aria-label="Categoria" value={categoryId} onChange={(event) => setCategory(event.target.value)} className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
            <option value="">Todas as categorias</option>
            {categories.data?.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
            {([['PAID', 'Pago'], ['UPCOMING', 'A vencer'], ['TODAY', 'Vence hoje'], ['OVERDUE', 'Vencido']] as const).map(([status, label]) => (
              <span key={status} className="inline-flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${dotStyle[status]}`} />{label}</span>
            ))}
          </div>
        </div>

        {query.isError ? (
          <p role="alert" className="p-12 text-center font-semibold text-red-700">Nao foi possivel carregar a agenda.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className={view === 'day' ? 'min-w-[360px]' : 'min-w-[980px]'}>
              {view !== 'day' && (
                <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-sm font-bold text-slate-700">
                  {weekdays.map((weekday) => <div key={weekday} className="px-3 py-3">{weekday}</div>)}
                </div>
              )}
              <div className={view === 'day' ? 'grid grid-cols-1' : 'grid grid-cols-7'}>
                {days.map((day) => {
                  const dayItems = grouped.get(day.key) ?? [];
                  const visibleItems = dayItems.slice(0, 3);
                  const hiddenCount = dayItems.length - visibleItems.length;

                  return (
                    <article key={day.key} className={`min-h-32 min-w-0 overflow-hidden border-b border-r border-slate-200 p-2 ${day.isCurrentMonth ? 'bg-white' : 'bg-slate-50 text-slate-400'} ${day.isToday ? 'ring-2 ring-inset ring-blue-500' : ''}`}>
                      <div className="mb-2 flex justify-end">
                        <span className={`grid h-7 w-7 place-items-center rounded-full text-sm font-bold ${day.isToday ? 'bg-blue-700 text-white' : 'text-slate-700'}`}>{day.date.getDate()}</span>
                      </div>
                      <div className="grid min-w-0 gap-1.5">
                        {isCalendarLoading && day.key === days[0]?.key ? <p className="p-2 text-xs text-slate-500">Carregando...</p> : null}
                        {visibleItems.map((item) => <CalendarItem key={item.id} item={item} />)}
                        {hiddenCount > 0 && <span className="px-2 text-xs font-bold text-blue-700">+{hiddenCount} conta{hiddenCount === 1 ? '' : 's'}</span>}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        <footer className="flex flex-col gap-2 border-t border-slate-200 bg-white px-4 py-4 text-sm text-slate-700 sm:flex-row sm:items-center sm:justify-between">
          <span>Total previsto no periodo: <strong className="text-blue-700">{currency(dashboard.data?.summary.totalPayable ?? query.data?.total ?? 0)}</strong></span>
          <span>{query.data?.count ?? 0} documento{(query.data?.count ?? 0) === 1 ? '' : 's'}</span>
        </footer>
      </section>
    </div>
  );
}
