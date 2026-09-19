import { useDeferredValue, useState, type ReactElement } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { httpClient } from '../api/http-client';
import { useAuth } from '../auth/auth-context';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Card } from '../components/ui/card';
import { useToast } from '../components/ui/toast-context';
import type { OptionResponse, PayablesForecastResponse } from '../intelligence/contracts';
import { currency } from '../payables/payables-types';
import { buildPayablesForecastWorkbook } from './payables-forecast-export';
import { rangeForForecastPreset, type ForecastPeriodPreset } from './payables-forecast-periods';

type ForecastStatus = 'ALL_PENDING' | 'UPCOMING' | 'OVERDUE';

function fullDate(value: string): string {
  return new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${value}T00:00:00Z`));
}

const statusStyle = {
  OVERDUE: { label: 'Vencido', className: 'border-red-200 bg-red-50 text-red-700' },
  TODAY: { label: 'Vence hoje', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  UPCOMING: { label: 'A vencer', className: 'border-sky-200 bg-sky-50 text-sky-700' },
} as const;

export function PayablesForecastPage(): ReactElement {
  const auth = useAuth();
  const { showToast } = useToast();
  const initialRange = rangeForForecastPreset('NEXT_7_DAYS');
  const [preset, setPreset] = useState<ForecastPeriodPreset>('NEXT_7_DAYS');
  const [from, setFrom] = useState(initialRange.from);
  const [to, setTo] = useState(initialRange.to);
  const [companyId, setCompanyId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState<ForecastStatus>('ALL_PENDING');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [panelOpen, setPanelOpen] = useState(true);
  const [exporting, setExporting] = useState(false);
  const deferredSearch = useDeferredValue(search.trim());
  const companies = auth.session?.user.companies ?? [];

  const changePreset = (nextPreset: Exclude<ForecastPeriodPreset, 'CUSTOM'>): void => {
    const range = rangeForForecastPreset(nextPreset);
    setPreset(nextPreset);
    setFrom(range.from);
    setTo(range.to);
    setPage(1);
  };

  const report = useQuery({
    queryKey: ['payables-forecast', from, to, companyId, supplierId, categoryId, status, deferredSearch, page, pageSize],
    queryFn: async () => (await httpClient.get<PayablesForecastResponse>('/api/v1/reports/payables-forecast', {
      params: { from, to, companyId: companyId || undefined, supplierId: supplierId || undefined, categoryId: categoryId || undefined, status, search: deferredSearch || undefined, page, pageSize },
    })).data,
    enabled: Boolean(from && to && from <= to),
  });
  const suppliers = useQuery({
    queryKey: ['reports-suppliers'],
    queryFn: async () => (await httpClient.get<OptionResponse>('/api/v1/suppliers', { params: { pageSize: 100, active: true } })).data.data,
  });
  const categories = useQuery({
    queryKey: ['reports-categories'],
    queryFn: async () => (await httpClient.get<OptionResponse>('/api/v1/financial-categories', { params: { pageSize: 100, active: true } })).data.data,
  });
  const summary = report.data?.summary;
  const maximumCompany = Math.max(1, ...(report.data?.byCompany.map(item => Number(item.amount)) ?? [1]));
  const maximumDate = Math.max(1, ...(report.data?.byDate.map(item => Number(item.amount)) ?? [1]));

  const exportSpreadsheet = async (): Promise<void> => {
    if (!report.data || exporting) return;
    setExporting(true);
    try {
      const exportPageSize = 100;
      const totalPages = Math.max(1, Math.ceil(report.data.pagination.total / exportPageSize));
      const requests = Array.from({ length: totalPages }, (_, index) => httpClient.get<PayablesForecastResponse>('/api/v1/reports/payables-forecast', {
        params: { from, to, companyId: companyId || undefined, supplierId: supplierId || undefined, categoryId: categoryId || undefined, status, search: deferredSearch || undefined, page: index + 1, pageSize: exportPageSize },
      }));
      const responses = await Promise.all(requests);
      const items = responses.flatMap(response => response.data.data);
      const company = companyId ? companies.find(item => item.id === companyId) : null;
      const supplier = supplierId ? suppliers.data?.find(item => item.id === supplierId) : null;
      const category = categoryId ? categories.data?.find(item => item.id === categoryId) : null;
      const content = await buildPayablesForecastWorkbook({
        from, to, generatedAt: new Date(),
        filters: {
          company: company?.tradeName || company?.legalName || 'Todas as empresas',
          supplier: supplier?.legalName || supplier?.name || 'Todos os fornecedores',
          category: category?.name || category?.legalName || 'Todas as categorias',
          status: status === 'OVERDUE' ? 'Vencidas' : status === 'UPCOMING' ? 'A vencer' : 'Todas as pendentes',
          search: deferredSearch,
        },
        summary: report.data.summary,
        byCompany: report.data.byCompany,
        byDate: report.data.byDate,
        items,
      });
      const url = URL.createObjectURL(new Blob([Uint8Array.from(content)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `compromissos-a-pagar-${from}-a-${to}.xlsx`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showToast({ type: 'success', title: 'Planilha gerada', description: `${items.length} compromisso(s) exportados com os filtros atuais.` });
    } catch {
      showToast({ type: 'error', title: 'Não foi possível exportar', description: 'Tente novamente ou revise os filtros do relatório.' });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid gap-6">
      <div className="print:hidden"><Breadcrumb items={[{ label: 'Relatórios' }, { label: 'Compromissos a pagar' }]} /></div>

      <header className="overflow-hidden rounded-3xl border border-teal-100 bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.2),_transparent_42%),linear-gradient(135deg,#f0fdfa_0%,#ffffff_58%,#eff6ff_100%)] p-6 shadow-sm lg:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">Previsão financeira</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 lg:text-4xl">Compromissos a pagar</h1>
            <p className="mt-3 text-slate-600">Veja o que exigirá caixa no período, por empresa ou na visão consolidada.</p>
          </div>
          <div className="grid gap-3 print:block">
            <div className="rounded-2xl border border-white/80 bg-white/80 px-5 py-3 text-right shadow-sm backdrop-blur">
              <span className="block text-xs font-bold uppercase tracking-wide text-slate-500">Período consultado</span>
              <strong className="mt-1 block text-slate-900">{fullDate(from)} a {fullDate(to)}</strong>
            </div>
            <div className="flex flex-wrap justify-end gap-2 print:hidden">
              <button type="button" onClick={() => setPanelOpen(current => !current)} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-teal-400 hover:text-teal-800">{panelOpen ? 'Ocultar painel' : 'Exibir painel'}</button>
              <button type="button" onClick={() => window.print()} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm hover:border-teal-400 hover:text-teal-800">Imprimir</button>
              <button type="button" disabled={exporting || !report.data} onClick={() => void exportSpreadsheet()} className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50">{exporting ? 'Exportando...' : 'Exportar planilha'}</button>
            </div>
          </div>
        </div>
      </header>

      {!panelOpen && <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-3 shadow-sm print:hidden"><span className="text-sm font-semibold text-slate-600">Painel recolhido · {summary?.installmentCount ?? 0} parcela(s) · {currency(summary?.totalPending ?? 0)}</span><button type="button" onClick={() => setPanelOpen(true)} className="text-sm font-bold text-teal-700 hover:underline">Exibir filtros e resumo</button></div>}

      <div className={panelOpen ? 'contents' : 'hidden print:contents'}>
      <div className="print:hidden"><Card>
        <div className="flex flex-wrap gap-2" aria-label="Períodos rápidos">
          {([
            ['NEXT_7_DAYS', 'Próximos 7 dias'],
            ['NEXT_WEEK', 'Próxima semana'],
            ['THIS_MONTH', 'Este mês'],
            ['NEXT_MONTH', 'Próximo mês'],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" onClick={() => changePreset(value)} className={`rounded-xl px-4 py-2 text-sm font-bold transition ${preset === value ? 'bg-teal-700 text-white shadow-sm' : 'border border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:text-teal-800'}`}>{label}</button>
          ))}
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Data inicial
            <input aria-label="Data inicial" type="date" value={from} onChange={event => { setFrom(event.target.value); setPreset('CUSTOM'); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Data final
            <input aria-label="Data final" type="date" value={to} onChange={event => { setTo(event.target.value); setPreset('CUSTOM'); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Empresa
            <select aria-label="Empresa" value={companyId} onChange={event => { setCompanyId(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-600">
              <option value="">Todas as empresas</option>
              {companies.map(company => <option key={company.id} value={company.id}>{company.tradeName || company.legalName}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Situação
            <select aria-label="Situação" value={status} onChange={event => { setStatus(event.target.value as ForecastStatus); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-600">
              <option value="ALL_PENDING">Todas as pendentes</option>
              <option value="UPCOMING">A vencer</option>
              <option value="OVERDUE">Vencidas</option>
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700 md:col-span-2">Busca
            <input aria-label="Busca" value={search} onChange={event => { setSearch(event.target.value); setPage(1); }} placeholder="Documento, descrição ou fornecedor" className="min-h-11 rounded-xl border border-slate-300 px-3 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Fornecedor
            <select aria-label="Fornecedor" value={supplierId} onChange={event => { setSupplierId(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-600">
              <option value="">Todos os fornecedores</option>
              {suppliers.data?.map(item => <option key={item.id} value={item.id}>{item.legalName ?? item.name}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm font-semibold text-slate-700">Categoria
            <select aria-label="Categoria" value={categoryId} onChange={event => { setCategoryId(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 outline-none focus:border-teal-600">
              <option value="">Todas as categorias</option>
              {categories.data?.map(item => <option key={item.id} value={item.id}>{item.name ?? item.legalName}</option>)}
            </select>
          </label>
        </div>
        {from > to && <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">A data inicial não pode ser posterior à data final.</p>}
      </Card></div>

      {report.isError ? <Card><p role="alert" className="font-semibold text-red-700">Não foi possível carregar o relatório. Revise os filtros e tente novamente.</p></Card> : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {[
              ['Total pendente', summary?.totalPending, 'bg-slate-950 text-white'],
              ['Vencido no período', summary?.overdue, 'bg-red-50 text-red-800'],
              ['A vencer', summary?.upcoming, 'bg-sky-50 text-sky-800'],
              ['Parcelas', summary?.installmentCount ?? '0', 'bg-emerald-50 text-emerald-800'],
            ].map(([label, value, color], index) => <article key={label} className={`rounded-2xl border border-slate-200 p-5 shadow-sm ${color}`}><span className="text-sm font-bold opacity-75">{label}</span><strong className="mt-2 block text-2xl font-black">{index === 3 ? value : currency(value ?? 0)}</strong>{index === 3 && <span className="mt-1 block text-xs font-semibold opacity-70">em {summary?.companyCount ?? 0} empresa(s)</span>}</article>)}
          </section>

          <section className="grid gap-4 xl:grid-cols-2 print:hidden">
            <Card><h2 className="text-lg font-black text-slate-950">Distribuição por empresa</h2><div className="mt-5 grid gap-4">{report.data?.byCompany.map(item => <div key={item.id ?? item.label}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="truncate text-slate-600">{item.label} · {item.count} parcela(s)</span><strong>{currency(item.amount)}</strong></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-teal-600" style={{ width: `${Math.max(3, Number(item.amount) / maximumCompany * 100)}%` }} /></div></div>)}{report.data?.byCompany.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Sem compromissos no período.</p>}</div></Card>
            <Card><h2 className="text-lg font-black text-slate-950">Calendário de desembolsos</h2><div className="mt-5 grid max-h-72 gap-3 overflow-auto pr-2">{report.data?.byDate.map(item => <div key={item.label} className="grid grid-cols-[90px_1fr_auto] items-center gap-3 text-sm"><span className="font-semibold text-slate-500">{fullDate(item.label)}</span><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-blue-500" style={{ width: `${Math.max(3, Number(item.amount) / maximumDate * 100)}%` }} /></div><strong>{currency(item.amount)}</strong></div>)}{report.data?.byDate.length === 0 && <p className="py-8 text-center text-sm text-slate-500">Sem vencimentos no período.</p>}</div></Card>
          </section>

        </>
      )}
      </div>

      {!report.isError && <Card>
            <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-black">Detalhamento</h2><p className="mt-1 text-sm text-slate-500">{report.data?.pagination.total ?? 0} parcela(s) encontradas.</p></div><select aria-label="Registros por página" value={pageSize} onChange={event => { setPageSize(Number(event.target.value)); setPage(1); }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"><option value="10">10 por página</option><option value="20">20 por página</option><option value="50">50 por página</option></select></div>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[940px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Vencimento</th><th className="px-4 py-3">Empresa / fornecedor</th><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Categoria</th><th className="px-4 py-3 text-right">Saldo</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3 text-right print:hidden">Ação</th></tr></thead><tbody className="divide-y divide-slate-100">{report.data?.data.map(item => { const visual=statusStyle[item.status]; return <tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-bold">{fullDate(item.dueDate)}</td><td className="px-4 py-3"><strong className="block text-slate-900">{item.companyName}</strong><span className="text-slate-500">{item.supplierName}</span></td><td className="px-4 py-3"><strong className="block">{item.documentNumber}</strong><span className="text-xs text-slate-500">Parcela {item.installmentNumber}/{item.installmentCount}</span></td><td className="px-4 py-3 text-slate-600">{item.categoryName}</td><td className="px-4 py-3 text-right font-black">{currency(item.openBalance)}</td><td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-bold ${visual.className}`}>{visual.label}</span></td><td className="px-4 py-3 text-right print:hidden"><Link to={`/payables/${item.payableTitleId}`} className="font-bold text-teal-700 hover:underline">Ver título</Link></td></tr>; })}</tbody></table>
              {report.data?.data.length === 0 && <p className="py-12 text-center text-sm text-slate-500">Nenhum compromisso encontrado com os filtros selecionados.</p>}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2 print:hidden"><button type="button" disabled={page <= 1} onClick={() => setPage(current => current - 1)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-40">Anterior</button><span className="px-2 text-sm font-bold text-slate-600">{page}/{report.data?.pagination.totalPages ?? 1}</span><button type="button" disabled={page >= (report.data?.pagination.totalPages ?? 1)} onClick={() => setPage(current => current + 1)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold disabled:opacity-40">Próxima</button></div>
          </Card>}
    </div>
  );
}
