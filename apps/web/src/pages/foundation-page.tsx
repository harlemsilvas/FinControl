import { useQuery } from '@tanstack/react-query';
import { useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { httpClient } from '../api/http-client';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Card } from '../components/ui/card';
import { monthRange, shortDate, type DashboardResponse, type OptionResponse, type UpcomingItem } from '../intelligence/contracts';
import { currency } from '../payables/payables-types';

const highlightStyles = {
  OVERDUE: {
    row: 'border-red-100 bg-red-50/65',
    pill: 'border-red-200 bg-red-50 text-red-700',
    label: 'Vencido',
  },
  TODAY: {
    row: 'border-amber-100 bg-amber-50/65',
    pill: 'border-amber-200 bg-amber-50 text-amber-700',
    label: 'Vence hoje',
  },
  UPCOMING: {
    row: 'border-sky-100 bg-sky-50/55',
    pill: 'border-sky-200 bg-sky-50 text-sky-700',
    label: 'A vencer',
  },
} as const;

const metricAccent = {
  blue: 'border-blue-100 bg-blue-50 text-blue-700',
  amber: 'border-amber-100 bg-amber-50 text-amber-700',
  purple: 'border-purple-100 bg-purple-50 text-purple-700',
  red: 'border-red-100 bg-red-50 text-red-700',
  emerald: 'border-emerald-100 bg-emerald-50 text-emerald-700',
} as const;

function amountByHighlight(items: UpcomingItem[], highlight: UpcomingItem['highlight']): number {
  return items.filter((item) => item.highlight === highlight).reduce((sum, item) => sum + Number(item.openBalance), 0);
}

function countByHighlight(items: UpcomingItem[], highlight: UpcomingItem['highlight']): number {
  return items.filter((item) => item.highlight === highlight).length;
}

export function FoundationPage(): ReactElement {
  const initial = monthRange();
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [supplierId, setSupplier] = useState('');
  const [categoryId, setCategory] = useState('');

  const query = useQuery({
    queryKey: ['dashboard', from, to, supplierId, categoryId],
    queryFn: async () =>
      (
        await httpClient.get<DashboardResponse>('/api/v1/dashboard', {
          params: { from, to, supplierId: supplierId || undefined, categoryId: categoryId || undefined },
        })
      ).data,
  });

  const suppliers = useQuery({
    queryKey: ['dashboard-suppliers'],
    queryFn: async () =>
      (await httpClient.get<OptionResponse>('/api/v1/suppliers', { params: { pageSize: 100, active: true } })).data.data,
  });

  const categories = useQuery({
    queryKey: ['dashboard-categories'],
    queryFn: async () =>
      (await httpClient.get<OptionResponse>('/api/v1/financial-categories', { params: { pageSize: 100, active: true } })).data.data,
  });

  const summary = query.data?.summary;
  const upcomingItems = query.data?.upcoming ?? [];
  const categoryPoints = query.data?.categories ?? [];
  const dueSeries = query.data?.dueSeries ?? [];
  const todayAmount = amountByHighlight(upcomingItems, 'TODAY');
  const todayCount = countByHighlight(upcomingItems, 'TODAY');
  const upcomingCount = countByHighlight(upcomingItems, 'UPCOMING');
  const overdueCount = countByHighlight(upcomingItems, 'OVERDUE');
  const maximumCategory = Math.max(1, ...categoryPoints.map((item) => Number(item.amount)));
  const maximumSeries = Math.max(1, ...dueSeries.map((item) => Number(item.amount)));

  const metrics = [
    {
      label: 'Total em aberto',
      value: summary?.totalPayable,
      helper: 'Carteira filtrada',
      icon: '▣',
      accent: metricAccent.blue,
    },
    {
      label: 'Vence hoje',
      value: todayAmount,
      helper: `${todayCount} documento${todayCount === 1 ? '' : 's'}`,
      icon: '◷',
      accent: metricAccent.amber,
    },
    {
      label: 'A vencer',
      value: summary?.upcoming,
      helper: `${upcomingCount} compromisso${upcomingCount === 1 ? '' : 's'} na lista`,
      icon: '□',
      accent: metricAccent.purple,
    },
    {
      label: 'Vencido',
      value: summary?.overdue,
      helper: `${overdueCount} compromisso${overdueCount === 1 ? '' : 's'} na lista`,
      icon: '△',
      accent: metricAccent.red,
    },
    {
      label: 'Pago no período',
      value: summary?.paid,
      helper: 'Pagamentos efetivados',
      icon: '✓',
      accent: metricAccent.emerald,
    },
  ];

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Breadcrumb items={[{ label: 'Inteligência', to: '/dashboard' }, { label: 'Visão Geral' }]} />
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Visão geral</h1>
          <p className="mt-2 text-slate-600">Resumo financeiro, vencimentos e compromissos do período selecionado.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/payables/new"
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-blue-700"
          >
            + Nova conta a pagar
          </Link>
          <Link
            to="/payables"
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            Ver contas a pagar
          </Link>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <div className="flex items-center gap-4">
              <span className={`grid size-12 shrink-0 place-items-center rounded-full border text-xl ${metric.accent}`} aria-hidden="true">
                {metric.icon}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-slate-500">{metric.label}</p>
                <p className="mt-1 truncate text-2xl font-black text-slate-950">
                  {query.isLoading ? '—' : currency(metric.value ?? 0)}
                </p>
                <p className="mt-1 truncate text-xs font-semibold text-slate-500">{metric.helper}</p>
              </div>
            </div>
          </Card>
        ))}
      </section>

      <Card>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <h2 className="text-lg font-bold">Filtros do dashboard</h2>
            <p className="mt-1 text-sm text-slate-500">Os indicadores abaixo respeitam período, fornecedor e categoria.</p>
          </div>
          <Link className="text-sm font-bold text-blue-700 hover:underline" to="/agenda">
            Abrir agenda financeira
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Vencimento inicial
            <input
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Vencimento final
            <input
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Fornecedor
            <select
              value={supplierId}
              onChange={(event) => setSupplier(event.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Todos os fornecedores</option>
              {suppliers.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.legalName}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">
            Categoria
            <select
              value={categoryId}
              onChange={(event) => setCategory(event.target.value)}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Todas as categorias</option>
              {categories.data?.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </Card>

      {query.isError ? (
        <Card>
          <p role="alert" className="font-semibold text-red-700">
            Não foi possível carregar o dashboard.
          </p>
        </Card>
      ) : (
        <section className="grid gap-4 2xl:grid-cols-[1.1fr_0.9fr]">
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">Próximos compromissos</h2>
                <p className="mt-1 text-sm text-slate-500">Títulos destacados por vencimento e saldo em aberto.</p>
              </div>
              <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                {upcomingItems.length} lançamento{upcomingItems.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
              <div className="hidden grid-cols-[110px_1.4fr_0.8fr_0.8fr_120px_70px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 lg:grid">
                <span>Vencimento</span>
                <span>Fornecedor</span>
                <span>Documento</span>
                <span className="text-right">Valor</span>
                <span>Status</span>
                <span className="text-right">Ações</span>
              </div>

              <div className="divide-y divide-slate-100">
                {upcomingItems.map((item) => {
                  const style = highlightStyles[item.highlight];

                  return (
                    <div
                      key={`${item.id}-${item.dueDate}`}
                      className={`grid gap-3 border-l-4 px-4 py-3 lg:grid-cols-[110px_1.4fr_0.8fr_0.8fr_120px_70px] lg:items-center ${style.row}`}
                    >
                      <span className="text-sm font-bold text-slate-700">{shortDate(item.dueDate)}</span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-slate-950">{item.supplierName}</span>
                        <span className="block truncate text-xs text-slate-500">Conta a pagar</span>
                      </span>
                      <span className="text-sm text-slate-700">{item.documentNumber}</span>
                      <span className="text-sm font-black text-slate-950 lg:text-right">{currency(item.openBalance)}</span>
                      <span>
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${style.pill}`}>{style.label}</span>
                      </span>
                      <span className="lg:text-right">
                        <Link className="text-sm font-bold text-blue-700 hover:underline" to={`/payables/${item.id}`}>
                          Ver
                        </Link>
                      </span>
                    </div>
                  );
                })}
                {upcomingItems.length === 0 && (
                  <p className="px-4 py-12 text-center text-sm text-slate-500">Nenhum compromisso no período selecionado.</p>
                )}
              </div>
            </div>
          </Card>

          <div className="grid gap-4">
            <Card>
              <h2 className="text-xl font-bold">Saldo por categoria</h2>
              <div className="mt-6 grid gap-4">
                {categoryPoints.map((item) => (
                  <div key={item.label}>
                    <div className="mb-1 flex justify-between gap-4 text-sm">
                      <span className="truncate text-slate-600">{item.label}</span>
                      <strong className="shrink-0 text-slate-950">{currency(item.amount)}</strong>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${Math.max(3, (Number(item.amount) / maximumCategory) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                {categoryPoints.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Sem valores no período.</p>}
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-bold">Vencimentos por período</h2>
              <div className="mt-6 grid gap-3">
                {dueSeries.map((item) => (
                  <div key={item.label} className="grid grid-cols-[88px_1fr_auto] items-center gap-3 text-sm">
                    <span className="font-semibold text-slate-500">{item.label}</span>
                    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-emerald-500"
                        style={{ width: `${Math.max(3, (Number(item.amount) / maximumSeries) * 100)}%` }}
                      />
                    </div>
                    <strong className="text-slate-950">{currency(item.amount)}</strong>
                  </div>
                ))}
                {dueSeries.length === 0 && <p className="py-10 text-center text-sm text-slate-500">Sem vencimentos no período.</p>}
              </div>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}