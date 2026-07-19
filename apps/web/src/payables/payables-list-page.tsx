import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { httpClient } from '../api/http-client';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { currency, statusLabel, type ListResponse, type PayableListItem } from './payables-types';

const statuses = ['OPEN', 'OVERDUE', 'IN_APPROVAL', 'APPROVED', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'] as const;

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

function datePtBr(value?: string | null): string {
  if (!value) return '—';
  const [year, month, day] = value.slice(0, 10).split('-');
  if (!year || !month || !day) return '—';
  return `${day}/${month}/${year}`;
}

function isDueToday(value?: string | null): boolean {
  if (!value) return false;
  return value.slice(0, 10) === new Date().toISOString().slice(0, 10);
}

function sum(items: PayableListItem[], selector: (item: PayableListItem) => string | number): number {
  return items.reduce((total, item) => total + Number(selector(item) || 0), 0);
}

function documentLabel(item: PayableListItem): string {
  return `${item.documentNumber}${item.documentSeries ? ` / ${item.documentSeries}` : ''}`;
}

export function PayablesListPage(): ReactElement {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const query = useQuery({
    queryKey: ['payables', page, search, status],
    queryFn: async () => {
      const response = await httpClient.get<ListResponse<PayableListItem>>('/api/v1/payables', {
        params: { page, pageSize: 20, search: search || undefined, status: status || undefined },
      });
      return response.data;
    },
  });

  const rows = useMemo(() => query.data?.data ?? [], [query.data?.data]);
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
          <Button variant="secondary" disabled title="Importação XML será conectada em etapa futura">
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
            <p className="mt-1 text-sm text-slate-500">A listagem usa a primeira parcela para exibir vencimento e forma de pagamento.</p>
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

        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_220px_auto_auto]">
          <label className="relative block">
            <span className="sr-only">Pesquisar contas a pagar</span>
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden="true">
              ⌕
            </span>
            <input
              aria-label="Pesquisar contas a pagar"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Buscar fornecedor, documento ou descrição…"
              className="min-h-11 w-full rounded-xl border border-slate-300 px-9 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </label>
          <select
            aria-label="Filtrar por status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="">Todos os status</option>
            {statuses.map((item) => (
              <option key={item} value={item}>
                {statusLabel(item)}
              </option>
            ))}
          </select>
          <Button
            variant="secondary"
            disabled={!search && !status}
            onClick={() => {
              setSearch('');
              setStatus('');
              setPage(1);
            }}
          >
            Limpar filtros
          </Button>
          <Button variant="secondary" disabled title="Filtros avançados serão adicionados quando a API expuser período e fornecedor">
            Mais filtros
          </Button>
        </div>

        {status && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-700">{statusLabel(status)}</span>
          </div>
        )}

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {query.isLoading ? (
            <p className="py-12 text-center text-slate-500">Carregando…</p>
          ) : query.isError ? (
            <p role="alert" className="py-12 text-center text-red-700">Não foi possível carregar as contas.</p>
          ) : (
            <>
              <div className="hidden grid-cols-[44px_116px_1.4fr_120px_150px_130px_120px_96px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
                <span />
                <span>Vencimento</span>
                <span>Fornecedor / Descrição</span>
                <span>Documento</span>
                <span>Categoria</span>
                <span>Forma</span>
                <span className="text-right">Valor</span>
                <span className="text-right">Ações</span>
              </div>

              <div className="divide-y divide-slate-100">
                {rows.map((item) => (
                  <div
                    key={item.id}
                    className="grid gap-3 px-4 py-3 text-sm hover:bg-slate-50 xl:grid-cols-[44px_116px_1.4fr_120px_150px_130px_120px_96px] xl:items-center"
                  >
                    <label className="hidden xl:block">
                      <span className="sr-only">Selecionar {documentLabel(item)}</span>
                      <input type="checkbox" className="size-4 rounded border-slate-300 text-blue-600" disabled title="Seleção em lote será conectada em etapa futura" />
                    </label>
                    <span className="font-semibold text-slate-700">{datePtBr(item.firstDueDate ?? item.issueDate)}</span>
                    <span className="min-w-0">
                      <Link to={`/payables/${item.id}`} className="block truncate font-bold text-slate-950 hover:text-blue-700 hover:underline">
                        {item.supplierName}
                      </Link>
                      <span className="block truncate text-xs text-slate-500">{item.description}</span>
                    </span>
                    <span className="font-semibold text-slate-700">{documentLabel(item)}</span>
                    <span className="truncate text-slate-600">{item.categoryName}</span>
                    <span className="truncate text-slate-600">{item.paymentMethodName ?? '—'}</span>
                    <span className="font-black text-slate-950 xl:text-right">{currency(item.openBalance)}</span>
                    <span className="flex items-center gap-3 xl:justify-end">
                      <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${statusStyle[item.statusCode] ?? statusStyle.OPEN}`}>
                        {statusLabel(item.statusCode)}
                      </span>
                      <Link className="font-bold text-blue-700 hover:underline" to={`/payables/${item.id}`}>
                        Ver
                      </Link>
                    </span>
                  </div>
                ))}
                {rows.length === 0 && <p className="py-12 text-center text-slate-500">Nenhuma conta encontrada.</p>}
              </div>
            </>
          )}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-slate-500">
            Exibindo página {page} • Total da página: <strong className="text-blue-700">{currency(summary.pageTotal)}</strong>
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>
              Anterior
            </Button>
            <span className="grid min-w-10 place-items-center rounded-lg bg-blue-600 text-sm font-bold text-white">{page}</span>
            <Button variant="secondary" disabled={!query.data || page * 20 >= query.data.total} onClick={() => setPage((value) => value + 1)}>
              Próxima
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}