import { useEffect, useRef, useState, type ReactNode, type ReactElement } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ApiError, httpClient } from '../api/http-client';
import { useAuth } from '../auth/auth-context';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { useToast } from '../components/ui/toast-context';
import { currency } from '../payables/payables-types';
import { importedInvoicesWorkbook, saveInvoiceFile } from './imported-invoices-export';
import { invoiceDate, invoiceMonthRange, type ImportedInvoice, type InvoiceExportPackage, type InvoicePeriod, type InvoiceReport } from './imported-invoices-types';

const inputClass = 'min-h-10 min-w-0 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm';
function message(error: unknown): string { return error instanceof ApiError ? error.message : 'Não foi possível concluir a operação. Tente novamente.'; }
function timestamp(value: string): string { return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); }
const stateLabel = { PREVIEW: 'Prévia', READY: 'Pronto', FAILED: 'Falhou', EXPIRED: 'Expirado' };

export function ImportedInvoicesPage(): ReactElement {
  const auth = useAuth();
  const { showToast } = useToast();
  const client = useQueryClient();
  const user = auth.session?.user;
  const canView = Boolean(user?.isMaster || user?.permissions.includes('XML_REPORT_VIEW'));
  const canExport = canView && Boolean(user?.isMaster || user?.permissions.includes('XML_EXPORT_MANAGE'));
  const companies = user?.companies ?? [];
  const initial = invoiceMonthRange();
  const [from, setFrom] = useState(initial.from), [to, setTo] = useState(initial.to);
  const [preset, setPreset] = useState<InvoicePeriod>('THIS_MONTH');
  const [companyId, setCompanyId] = useState(''), [search, setSearch] = useState('');
  const [page, setPage] = useState(1), [historyPage, setHistoryPage] = useState(1);
  const [tab, setTab] = useState<'notes' | 'history'>('notes');
  const [selection, setSelection] = useState<string[]>([]);
  const [drawer, setDrawer] = useState(false), [scope, setScope] = useState<'FILTERED' | 'SELECTED'>('FILTERED');
  const [previewKey, setPreviewKey] = useState(0), [allowPartial, setAllowPartial] = useState(false);
  const [ready, setReady] = useState<InvoiceExportPackage>();
  const [printData, setPrintData] = useState<Pick<InvoiceReport, 'data' | 'summary' | 'byCompany'> & { from: string; to: string; company: string }>();
  const [preparing, setPreparing] = useState(false), [busyDownload, setBusyDownload] = useState(false);
  const filters = { from, to, companyId: companyId || undefined, search: search.trim() || undefined };
  const valid = Boolean(from && to && from <= to && Date.parse(to) - Date.parse(from) <= 366 * 86400000);
  const report = useQuery({ queryKey: ['imported-invoices', filters, page], queryFn: async () => (await httpClient.get<InvoiceReport>('/api/v1/reports/imported-invoices', { params: { ...filters, page, pageSize: 20 } })).data, enabled: canView && valid });
  const history = useQuery({ queryKey: ['invoice-export-history', historyPage], queryFn: async () => (await httpClient.get<{ data: InvoiceExportPackage[]; total: number }>('/api/v1/xml-exports', { params: { page: historyPage } })).data, enabled: canExport && tab === 'history' });
  const preview = useQuery({ queryKey: ['invoice-export-preview', previewKey, scope, selection, filters], queryFn: async () => (await httpClient.post<InvoiceExportPackage>('/api/v1/xml-exports/preview', { ...filters, ...(scope === 'SELECTED' ? { ids: selection } : {}) })).data, enabled: canExport && drawer && valid && (scope === 'FILTERED' || selection.length > 0), retry: false, staleTime: Infinity, refetchOnWindowFocus: false });
  const generate = useMutation({ mutationFn: async () => (await httpClient.post<InvoiceExportPackage>(`/api/v1/xml-exports/${preview.data!.id}/generate`, { allowPartial })).data,
    onSuccess: async value => { setReady(value); await client.invalidateQueries({ queryKey: ['invoice-export-history'] }); showToast({ type: 'success', title: 'ZIP gerado e conferido. Pronto para download.' }); },
    onError: error => showToast({ type: 'error', title: message(error) }),
  });
  const companyLabel = companies.find(company => company.id === companyId)?.legalName ?? 'Todas as empresas permitidas';
  function changeFilters(): void { setSelection([]); setPage(1); setPrintData(undefined); }
  function choosePeriod(value: InvoicePeriod): void {
    setPreset(value);
    if (value !== 'CUSTOM') { const dates = invoiceMonthRange(value === 'PREVIOUS_MONTH'); setFrom(dates.from); setTo(dates.to); changeFilters(); }
  }
  function openExport(selected: boolean): void { setScope(selected ? 'SELECTED' : 'FILTERED'); setReady(undefined); setAllowPartial(false); setPreviewKey(value => value + 1); generate.reset(); setDrawer(true); }
  function closeExport(): void {
    if (generate.isPending) return;
    if (!ready && preview.data?.status === 'PREVIEW') void discard(preview.data);
    setDrawer(false);
  }
  async function discard(pkg: InvoiceExportPackage): Promise<void> {
    try { await httpClient.delete(`/api/v1/xml-exports/${pkg.id}`); await client.invalidateQueries({ queryKey: ['invoice-export-history'] }); }
    catch (error) { showToast({ type: 'error', title: message(error) }); }
  }
  async function download(pkg: InvoiceExportPackage): Promise<void> {
    setBusyDownload(true);
    try { const response = await httpClient.get<Blob>(`/api/v1/xml-exports/${pkg.id}/download`, { responseType: 'blob' }); saveInvoiceFile(response.data, `fincontrol_nfe_${pkg.id}.zip`); }
    catch (error) { showToast({ type: 'error', title: error instanceof ApiError ? error.message : 'Download indisponível. Confira a validade e tente novamente.' }); }
    finally { setBusyDownload(false); }
  }
  async function prepareReport(print: boolean): Promise<void> {
    setPreparing(true);
    try {
      const response = await httpClient.get<Pick<InvoiceReport, 'data' | 'summary' | 'byCompany'>>('/api/v1/reports/imported-invoices/export-data', { params: filters });
      if (print) { setTab('notes'); setPrintData({ ...response.data, from, to, company: companyLabel }); window.setTimeout(() => window.print(), 100); }
      else { const bytes = await importedInvoicesWorkbook(response.data.data, { from, to, company: companyLabel, search }, response.data.summary); saveInvoiceFile(new Blob([new Uint8Array(bytes)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), `notas_importadas_${from}_${to}.xlsx`); }
    } catch (error) { showToast({ type: 'error', title: message(error) }); }
    finally { setPreparing(false); }
  }
  useEffect(() => { const done = (): void => setPrintData(undefined); window.addEventListener('afterprint', done); return (): void => window.removeEventListener('afterprint', done); }, []);
  const rows = report.data?.data ?? [];
  const displayed = printData ?? report.data;
  const total = displayed?.summary.noteCount ?? 0;
  const pkg = ready ?? preview.data;
  if (!canView) return <Card><p role="alert">Você não tem permissão para consultar este relatório.</p></Card>;
  return <div className="invoice-report grid gap-6">
    <style>{`@media print { body * { visibility:hidden } .invoice-report,.invoice-report * { visibility:visible } .invoice-report { position:absolute;left:0;top:0;width:100%;padding:0 } .invoice-report .no-print,.invoice-report .no-print * { display:none!important } .invoice-report table { font-size:10px;width:100% } .invoice-report tr { break-inside:avoid } .invoice-report thead {display:table-header-group} .invoice-report .overflow-x-auto {overflow:visible} }`}</style>
    <header className="flex flex-wrap items-end justify-between gap-4"><div><Breadcrumb items={[{ label: 'Relatórios' }, { label: 'Notas fiscais importadas' }]} /><h1 className="mt-3 text-3xl font-bold text-slate-950">Notas fiscais importadas</h1><p className="mt-2 text-sm text-slate-500">Importações manuais · Emissão de {invoiceDate(printData?.from ?? from)} a {invoiceDate(printData?.to ?? to)} · {printData?.company ?? companyLabel}</p></div><div className="no-print flex flex-wrap gap-2"><Button variant="secondary" disabled={!valid || preparing || !total || report.isFetching} onClick={() => void prepareReport(true)}>Imprimir relatório</Button><Button variant="secondary" disabled={!valid || preparing || !total || report.isFetching} onClick={() => void prepareReport(false)}>Planilha XLSX</Button>{canExport && <Button disabled={!valid || !total || report.isFetching} onClick={() => openExport(false)}>Exportar XMLs</Button>}</div></header>
    <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">{[['Notas no período', total], ['Valor das notas', currency(displayed?.summary.invoiceAmount ?? 0)], ['Empresas', displayed?.summary.companyCount ?? 0], ['XMLs armazenados', `${displayed?.summary.availableCount ?? 0} de ${total}`]].map(([title, value]) => <Card key={title}><p className="text-xs font-semibold text-slate-500">{title}</p><p className="mt-3 text-2xl font-bold text-slate-950">{value}</p></Card>)}</div>
    <Card className="no-print"><div className="mb-5 flex gap-6 border-b border-slate-200 pb-3"><button type="button" className={tab === 'notes' ? 'font-bold text-blue-700' : 'text-slate-500'} onClick={() => setTab('notes')}>Notas importadas</button>{canExport && <button type="button" className={tab === 'history' ? 'font-bold text-blue-700' : 'text-slate-500'} onClick={() => setTab('history')}>Histórico de exportações</button>}</div>{tab === 'notes' ? <><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1.3fr_1.4fr_1fr_1fr]"><label className="grid gap-2 text-sm font-semibold">Empresa<select className={inputClass} value={companyId} onChange={event => { setCompanyId(event.target.value); changeFilters(); }}><option value="">Todas as empresas permitidas</option>{companies.map(company => <option key={company.id} value={company.id}>{company.legalName}</option>)}</select></label><div><p className="mb-2 text-sm font-semibold">Período de emissão</p><div className="flex flex-wrap gap-1">{([['THIS_MONTH', 'Mês atual'], ['PREVIOUS_MONTH', 'Mês anterior'], ['CUSTOM', 'Período']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={preset === value} className={`rounded-lg border px-2 py-2 text-sm ${preset === value ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200'}`} onClick={() => choosePeriod(value)}>{label}</button>)}</div></div><label className="grid gap-2 text-sm font-semibold">Data inicial<input className={inputClass} type="date" value={from} onChange={event => { setPreset('CUSTOM'); setFrom(event.target.value); changeFilters(); }} /></label><label className="grid gap-2 text-sm font-semibold">Data final<input className={inputClass} type="date" value={to} onChange={event => { setPreset('CUSTOM'); setTo(event.target.value); changeFilters(); }} /></label></div><div className="mt-4 flex flex-wrap gap-3"><input className={`${inputClass} flex-1`} aria-label="Buscar nota ou fornecedor" placeholder="Nota, série, fornecedor, CNPJ ou chave" value={search} onChange={event => { setSearch(event.target.value); changeFilters(); }} /><Button variant="secondary" onClick={() => { setCompanyId(''); setSearch(''); choosePeriod('THIS_MONTH'); changeFilters(); }}>Limpar filtros</Button></div>{!valid && <p role="alert" className="mt-3 text-red-700">Informe um período válido de até 366 dias.</p>}<p className="mt-3 text-xs text-slate-500">Datas de emissão · Horário de São Paulo · Somente importações manuais.</p></> : <><p className="mb-4 text-sm text-slate-500">Seus pacotes, sujeitos ao acesso atual às empresas. Validade padrão: {report.data?.limits.retentionHours ?? 48} horas. Os arquivos expirados são removidos automaticamente durante o uso do módulo.</p>{history.isLoading ? <p>Carregando histórico...</p> : history.isError ? <p role="alert">{message(history.error)}</p> : <><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th>Geração / pacote</th><th>Emissão</th><th>Notas / XMLs</th><th>Situação</th><th>Validade</th><th>Ações</th></tr></thead><tbody>{history.data?.data.map(item => <tr key={item.id} className="border-t border-slate-200"><td className="py-4">{timestamp(item.createdAt)}<small className="block text-slate-500">{item.id.slice(0, 8)}</small></td><td>{invoiceDate(item.filters.from)} a {invoiceDate(item.filters.to)}</td><td>{item.totalCount} / {item.includedCount}</td><td>{stateLabel[item.status]}{item.unavailableCount > 0 && <small className="block text-amber-700">Parcial: {item.unavailableCount} sem XML</small>}</td><td>{timestamp(item.expiresAt)}</td><td>{item.status === 'READY' && <Button variant="secondary" disabled={busyDownload} onClick={() => void download(item)}>Baixar ZIP</Button>}{item.status !== 'EXPIRED' && <Button variant="secondary" onClick={() => void discard(item)}>Descartar</Button>}</td></tr>)}</tbody></table></div>{!history.data?.data.length && <p className="py-8 text-center text-slate-500">Nenhuma exportação registrada.</p>}<div className="mt-4 flex justify-end gap-3"><Button variant="secondary" disabled={historyPage === 1} onClick={() => setHistoryPage(value => value - 1)}>Anterior</Button><span className="py-2">{historyPage} / {Math.max(1, Math.ceil((history.data?.total ?? 0) / 20))}</span><Button variant="secondary" disabled={historyPage * 20 >= (history.data?.total ?? 0)} onClick={() => setHistoryPage(value => value + 1)}>Próxima</Button></div></>}</>}</Card>
    {tab === 'notes' && <Card><h2 className="text-lg font-bold">Notas do período</h2>{Boolean(displayed?.summary.missingAmountCount) && <p className="mt-2 text-sm text-amber-800">{displayed?.summary.missingAmountCount} notas sem valor informado não compõem o total.</p>}<div className="my-4 flex flex-wrap gap-4 text-xs text-slate-600">{displayed?.byCompany.map(company => <span key={company.companyId}><strong>{company.companyName}</strong>: {company.noteCount} notas · {currency(company.invoiceAmount)}</span>)}</div>{canExport && <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-blue-100 bg-blue-50 p-3"><span>{selection.length} notas selecionadas</span><Button variant="secondary" disabled={!selection.length || report.isFetching} onClick={() => openExport(true)}>Exportar selecionadas</Button></div>}{report.isLoading ? <p>Carregando notas...</p> : report.isError ? <p role="alert">{message(report.error)}</p> : <><InvoiceTable rows={printData?.data ?? rows} selection={selection} setSelection={setSelection} canSelect={canExport && !report.isFetching} /><div className="no-print mt-5 flex flex-wrap items-center justify-between gap-3"><span className="text-sm text-slate-500">{total} notas · {selection.length} selecionadas entre as páginas</span><div className="flex gap-2"><Button variant="secondary" disabled={page === 1 || report.isFetching} onClick={() => setPage(value => value - 1)}>Anterior</Button><span className="p-2">{page} / {Math.max(1, Math.ceil(total / 20))}</span><Button variant="secondary" disabled={page * 20 >= total || report.isFetching} onClick={() => setPage(value => value + 1)}>Próxima</Button></div></div></>}</Card>}
    {drawer && <InvoiceDrawer onClose={closeExport}><h2 className="text-xl font-bold">Exportar XMLs</h2><p className="mt-2 text-sm text-slate-500">Revise o pacote antes de gerar. O envio será manual.</p><fieldset className="my-5 space-y-3" disabled={generate.isPending || Boolean(ready)}><legend className="mb-3 font-semibold">Quais notas exportar?</legend>{([['FILTERED', 'Todos os resultados deste filtro'], ['SELECTED', `Somente selecionadas (${selection.length})`]] as const).map(([value, label]) => <label className="block text-sm" key={value}><input type="radio" name="export-scope" checked={scope === value} disabled={value === 'SELECTED' && !selection.length} onChange={() => { if (preview.data?.status === 'PREVIEW') void discard(preview.data); setPreviewKey(key => key + 1); setScope(value); setAllowPartial(false); generate.reset(); }} /> {label}</label>)}</fieldset>{preview.isFetching ? <p>Preparando prévia...</p> : preview.isError ? <p role="alert" className="text-red-700">{message(preview.error)}</p> : pkg && <><div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm"><p><strong>Empresa:</strong> {companyLabel} ({pkg.companyIds.length})</p><p><strong>Emissão:</strong> {invoiceDate(pkg.filters.from)} a {invoiceDate(pkg.filters.to)}</p><p><strong>Notas:</strong> {pkg.totalCount} · <strong>XMLs incluídos:</strong> {pkg.includedCount}</p><p><strong>Volume XML:</strong> {(pkg.sourceBytes / 1048576).toFixed(2)} MiB</p><p><strong>Formato:</strong> ZIP, por empresa e mês</p><p><strong>Validade:</strong> {timestamp(pkg.expiresAt)}</p></div>{pkg.unavailableCount > 0 && <div className="mt-4 rounded-lg bg-amber-50 p-4 text-sm text-amber-900"><p>{pkg.unavailableCount} notas não podem ser incluídas.</p><ul className="my-3 max-h-40 overflow-auto">{preview.data?.unavailable?.map(item => <li className="mb-2" key={item.id}>Nota {item.documentNumber ?? item.id}: {item.reason}</li>)}</ul>{!ready && <label><input type="checkbox" checked={allowPartial} onChange={event => setAllowPartial(event.target.checked)} /> Confirmo gerar somente os XMLs disponíveis.</label>}</div>}<p className="my-4 text-sm text-slate-500">Inclui resumo CSV e manifesto com hashes para conferência. Limites: {report.data?.limits.maxNotes ?? 500} notas e {((report.data?.limits.maxBytes ?? 20971520) / 1048576).toFixed(0)} MiB de XML por pacote.</p>{generate.error && <p role="alert" className="mb-4 text-red-700">{message(generate.error)}</p>}{ready ? <><p role="status" className="my-4 font-semibold text-emerald-700">ZIP gerado e integridade conferida.</p><p className="mb-4 break-all text-xs text-slate-500">SHA-256: {ready.sha256}</p><Button disabled={busyDownload} onClick={() => void download(ready)}>Baixar ZIP ({((ready.archiveBytes ?? 0) / 1024).toFixed(1)} KiB)</Button></> : <Button disabled={preview.isFetching || generate.isPending || generate.isError || !pkg.includedCount || (pkg.unavailableCount > 0 && !allowPartial)} onClick={() => generate.mutate()}>{generate.isPending ? 'Gerando e conferindo...' : 'Gerar ZIP'}</Button>}</>}</InvoiceDrawer>}
  </div>;
}
function InvoiceTable({ rows, selection, setSelection, canSelect }: { rows: ImportedInvoice[]; selection: string[]; setSelection: (ids: string[]) => void; canSelect: boolean }): ReactElement {
  const all = rows.length > 0 && rows.every(row => selection.includes(row.id));
  return <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="no-print p-3">{canSelect && <input type="checkbox" aria-label="Selecionar página atual" checked={all} onChange={() => setSelection(all ? selection.filter(id => !rows.some(row => row.id === id)) : [...new Set([...selection, ...rows.map(row => row.id)])])} />}</th><th className="p-3">Nota / série</th><th className="p-3">Emissão</th><th className="p-3">Fornecedor</th><th className="p-3">Empresa</th><th className="p-3 text-right">Valor NFe</th><th className="p-3">XML armazenado</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="border-b border-slate-100"><td className="no-print p-3">{canSelect && <input aria-label={`Selecionar nota ${row.documentNumber ?? row.id}`} type="checkbox" checked={selection.includes(row.id)} onChange={event => setSelection(event.target.checked ? [...selection, row.id] : selection.filter(id => id !== row.id))} />}</td><td className="p-3">{row.documentNumber} / {row.documentSeries ?? '-'}</td><td className="whitespace-nowrap p-3">{invoiceDate(row.issueDate)}</td><td className="p-3">{row.supplierName}<small className="block text-slate-500">{row.supplierDocument}</small></td><td className="p-3">{row.companyName}<small className="block text-slate-500">{row.companyDocument}</small></td><td className="whitespace-nowrap p-3 text-right font-bold">{row.invoiceAmount === null ? 'Não informado' : currency(row.invoiceAmount)}</td><td className="p-3"><span className={`rounded-full px-2 py-1 text-xs ${row.xmlAvailable ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'}`}>{row.xmlAvailable ? 'Sim' : 'Não'}</span></td></tr>)}</tbody></table>{!rows.length && <p className="py-10 text-center text-slate-500">Nenhuma nota importada manualmente encontrada.</p>}</div>;
}
function InvoiceDrawer({ onClose, children }: { onClose: () => void; children: ReactNode }): ReactElement {
  const ref = useRef<HTMLDivElement>(null);
  const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const keyboard = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close.current();
      if (event.key !== 'Tab') return;
      const elements = Array.from(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),a[href]') ?? []);
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', keyboard);
    return (): void => { document.body.style.overflow = overflow; document.removeEventListener('keydown', keyboard); previous?.focus(); };
  }, []);
  return <div className="no-print fixed inset-0 z-50 flex justify-end bg-slate-950/40"><div ref={ref} role="dialog" aria-modal="true" aria-label="Exportar XMLs" className="h-full w-full max-w-lg overflow-y-auto bg-white p-6 shadow-2xl"><button type="button" className="float-right rounded p-2 text-xl" aria-label="Fechar exportação" onClick={onClose}>×</button>{children}</div></div>;
}
