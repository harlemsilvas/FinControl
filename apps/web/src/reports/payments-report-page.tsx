import { useDeferredValue, useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { httpClient } from "../api/http-client";
import { useAuth } from "../auth/auth-context";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Card } from "../components/ui/card";
import { useToast } from "../components/ui/toast-context";
import type {
  OptionResponse,
  PaymentsReportResponse,
} from "../intelligence/contracts";
import { currency } from "../payables/payables-types";
import { buildPaymentsReportWorkbook } from "./payments-report-export";
import {
  rangeForForecastPreset,
  type ForecastPeriodPreset,
} from "./payables-forecast-periods";

function date(value: string): string {
  return value
    ? new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(
        new Date(`${value}T00:00:00Z`),
      )
    : "Selecione uma data";
}

export function PaymentsReportPage(): ReactElement {
  const auth = useAuth();
  const { showToast } = useToast();
  const initial = rangeForForecastPreset("THIS_MONTH");
  const [preset, setPreset] = useState<ForecastPeriodPreset>("THIS_MONTH");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [companyId, setCompanyId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [panelOpen, setPanelOpen] = useState(true);
  const [exporting, setExporting] = useState(false);
  const companies = auth.session?.user.companies ?? [];
  const selectedCompany = companies.find((item) => item.id === companyId);
  const companyLabel = selectedCompany?.tradeName || selectedCompany?.legalName || "Todas as empresas";
  const params = {
    from,
    to,
    companyId: companyId || undefined,
    supplierId: supplierId || undefined,
    categoryId: categoryId || undefined,
    search: deferredSearch || undefined,
    page,
    pageSize,
  };
  const report = useQuery({
    queryKey: ["payments-report", params],
    queryFn: async () =>
      (
        await httpClient.get<PaymentsReportResponse>(
          "/api/v1/reports/payments",
          { params },
        )
      ).data,
    enabled: Boolean(from && to && from <= to),
  });
  const suppliers = useQuery({
    queryKey: ["reports-suppliers"],
    queryFn: async () =>
      (
        await httpClient.get<OptionResponse>("/api/v1/suppliers", {
          params: { pageSize: 100, active: true },
        })
      ).data.data,
  });
  const categories = useQuery({
    queryKey: ["reports-categories"],
    queryFn: async () =>
      (
        await httpClient.get<OptionResponse>("/api/v1/financial-categories", {
          params: { pageSize: 100, active: true },
        })
      ).data.data,
  });
  const choosePreset = (
    value: Exclude<ForecastPeriodPreset, "CUSTOM">,
  ): void => {
    const range = rangeForForecastPreset(value);
    setPreset(value);
    setFrom(range.from);
    setTo(range.to);
    setPage(1);
  };
  const exportSpreadsheet = async (): Promise<void> => {
    if (!report.data || exporting) return;
    setExporting(true);
    try {
      const totalPages = Math.max(
        1,
        Math.ceil(report.data.pagination.total / 100),
      );
      const responses = await Promise.all(
        Array.from({ length: totalPages }, (_, index) =>
          httpClient.get<PaymentsReportResponse>("/api/v1/reports/payments", {
            params: { ...params, page: index + 1, pageSize: 100 },
          }),
        ),
      );
      const items = responses.flatMap((response) => response.data.data);
      const company = companies.find((item) => item.id === companyId);
      const supplier = suppliers.data?.find((item) => item.id === supplierId);
      const category = categories.data?.find((item) => item.id === categoryId);
      const content = await buildPaymentsReportWorkbook({
        from,
        to,
        generatedAt: new Date(),
        company:
          company?.tradeName || company?.legalName || "Todas as empresas",
        supplier:
          supplier?.legalName || supplier?.name || "Todos os fornecedores",
        category: category?.name || "Todas as categorias",
        search: deferredSearch,
        report: report.data,
        items,
      });
      const url = URL.createObjectURL(
        new Blob([Uint8Array.from(content)], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `pagamentos-realizados-${from}-a-${to}.xlsx`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showToast({
        type: "success",
        title: "Planilha gerada",
        description: `${items.length} pagamento(s) exportados.`,
      });
    } catch {
      showToast({
        type: "error",
        title: "Não foi possível exportar",
        description: "Tente novamente ou revise os filtros do relatório.",
      });
    } finally {
      setExporting(false);
    }
  };

  return (
    <div data-print-report className="grid gap-6">
      <div className="print:hidden">
        <Breadcrumb
          items={[{ label: "Relatórios" }, { label: "Pagamentos realizados" }]}
        />
      </div>
      <header className="rounded-3xl border border-teal-100 bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.2),_transparent_42%),linear-gradient(135deg,#f0fdfa_0%,#ffffff_58%,#eff6ff_100%)] p-6 shadow-sm lg:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">
              Relatório financeiro
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 lg:text-4xl">
              Pagamentos realizados
            </h1>
            <p className="mt-3 text-slate-600">
              Valores efetivamente pagos no período, pela data da baixa.
              Estornos não entram nos totais.
            </p>
          </div>
          <div className="grid gap-3">
            <strong className="rounded-2xl border border-white bg-white/80 px-5 py-3 text-sm text-slate-900">
              {date(from)} a {date(to)}
            </strong>
            <p className="hidden text-sm text-slate-700 print:block">
              Empresa: {companyLabel}
            </p>
            <div className="flex flex-wrap gap-2 print:hidden">
              <Link
                to="/reports"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-teal-800"
              >
                Compromissos a pagar
              </Link>
              <button
                type="button"
                onClick={() => setPanelOpen((value) => !value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold"
              >
                {panelOpen ? "Ocultar painel" : "Exibir painel"}
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold"
              >
                Imprimir
              </button>
              <button
                type="button"
                disabled={exporting || !report.data}
                onClick={() => void exportSpreadsheet()}
                className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
              >
                {exporting ? "Exportando..." : "Exportar planilha"}
              </button>
            </div>
          </div>
        </div>
      </header>
      {panelOpen && (
        <Card className="print:hidden">
          <div className="flex flex-wrap gap-2 print:hidden">
            {(
              [
                ["THIS_MONTH", "Este mês"],
                ["NEXT_7_DAYS", "Próximos 7 dias"],
                ["NEXT_WEEK", "Próxima semana"],
                ["NEXT_MONTH", "Próximo mês"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => choosePreset(value)}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${preset === value ? "bg-teal-700 text-white" : "border border-slate-200 bg-white text-slate-600"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="grid gap-1 text-sm font-semibold">
              Data inicial do pagamento
              <input
                aria-label="Data inicial do pagamento"
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPreset("CUSTOM");
                  setPage(1);
                }}
                className="min-h-11 rounded-xl border border-slate-300 px-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Data final do pagamento
              <input
                aria-label="Data final do pagamento"
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPreset("CUSTOM");
                  setPage(1);
                }}
                className="min-h-11 rounded-xl border border-slate-300 px-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Empresa
              <select
                aria-label="Empresa"
                value={companyId}
                onChange={(event) => {
                  setCompanyId(event.target.value);
                  setPage(1);
                }}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3"
              >
                <option value="">Todas as empresas</option>
                {companies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.tradeName || item.legalName}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Fornecedor
              <select
                aria-label="Fornecedor"
                value={supplierId}
                onChange={(event) => {
                  setSupplierId(event.target.value);
                  setPage(1);
                }}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3"
              >
                <option value="">Todos os fornecedores</option>
                {suppliers.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.legalName || item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Categoria
              <select
                aria-label="Categoria"
                value={categoryId}
                onChange={(event) => {
                  setCategoryId(event.target.value);
                  setPage(1);
                }}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-3"
              >
                <option value="">Todas as categorias</option>
                {categories.data?.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name || item.legalName}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-semibold md:col-span-2">
              Busca
              <input
                aria-label="Busca"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Documento, descrição, fornecedor ou transação"
                className="min-h-11 rounded-xl border border-slate-300 px-3"
              />
            </label>
          </div>
          {from > to && (
            <p role="alert" className="mt-4 text-sm font-bold text-red-700">
              A data inicial não pode ser posterior à data final.
            </p>
          )}
        </Card>
      )}
      {report.isError ? (
        <Card>
          <p role="alert" className="text-red-700">
            Não foi possível carregar o relatório.
          </p>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
            {(
              [
                [
                  "Total pago",
                  currency(report.data?.summary.totalPaid ?? 0),
                  "bg-slate-950 text-white",
                ],
                [
                  "Principal",
                  currency(report.data?.summary.totalPrincipal ?? 0),
                  "bg-sky-50 text-sky-900",
                ],
                [
                  "Ajustes líquidos",
                  currency(report.data?.summary.totalAdjustments ?? 0),
                  "bg-amber-50 text-amber-900",
                ],
                [
                  "Pagamentos",
                  report.data?.summary.paymentCount ?? "0",
                  "bg-emerald-50 text-emerald-900",
                ],
              ] as const
            ).map(([label, value, color]) => (
              <article
                key={label}
                className={`rounded-2xl border border-slate-200 p-5 shadow-sm ${color}`}
              >
                <span className="text-sm font-bold opacity-75">{label}</span>
                <strong className="mt-2 block text-2xl font-black">
                  {value}
                </strong>
              </article>
            ))}
          </section>
          {panelOpen && (
            <section className="grid gap-4 xl:grid-cols-2 print:hidden">
              <Card>
                <h2 className="text-lg font-black">Por empresa</h2>
                <div className="mt-4 grid gap-3">
                  {report.data?.byCompany.map((item) => (
                    <div
                      key={item.id ?? item.label}
                      className="flex justify-between gap-4 text-sm"
                    >
                      <span>
                        {item.label} · {item.count} pagamento(s)
                      </span>
                      <strong>{currency(item.amount)}</strong>
                    </div>
                  ))}
                </div>
              </Card>
              <Card>
                <h2 className="text-lg font-black">Por data de pagamento</h2>
                <div className="mt-4 grid max-h-72 gap-3 overflow-auto">
                  {report.data?.byDate.map((item) => (
                    <div
                      key={item.label}
                      className="flex justify-between gap-4 text-sm"
                    >
                      <span>
                        {date(item.label)} · {item.count} pagamento(s)
                      </span>
                      <strong>{currency(item.amount)}</strong>
                    </div>
                  ))}
                </div>
              </Card>
            </section>
          )}
          <Card>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Detalhamento</h2>
                <p className="text-sm text-slate-500">
                  {report.data?.pagination.total ?? 0} pagamento(s) encontrados.
                </p>
              </div>
              <select
                aria-label="Registros por página"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setPage(1);
                }}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="10">10 por página</option>
                <option value="20">20 por página</option>
                <option value="50">50 por página</option>
              </select>
            </div>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full min-w-[940px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Pagamento</th>
                    <th className="px-4 py-3">Empresa / fornecedor</th>
                    <th className="px-4 py-3">Documento</th>
                    <th className="px-4 py-3">Categoria</th>
                    <th className="px-4 py-3">Conta / forma</th>
                    <th className="px-4 py-3 text-right">Pago</th>
                    <th className="px-4 py-3 print:hidden">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.data?.data.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3 font-bold">
                        {date(item.paymentDate)}
                      </td>
                      <td className="px-4 py-3">
                        <strong className="block">{item.companyName}</strong>
                        <span>{item.supplierName}</span>
                      </td>
                      <td className="px-4 py-3">
                        <strong className="block">{item.documentNumber}</strong>
                        <span className="text-xs text-slate-500">
                          Parcela {item.installmentNumber}/
                          {item.installmentCount}
                        </span>
                      </td>
                      <td className="px-4 py-3">{item.categoryName}</td>
                      <td className="px-4 py-3">
                        {item.bankAccountName} · {item.paymentMethodName}
                      </td>
                      <td className="px-4 py-3 text-right font-black">
                        {currency(item.movementAmount)}
                      </td>
                      <td className="px-4 py-3 print:hidden">
                        <Link
                          to={`/payables/${item.payableTitleId}`}
                          className="font-bold text-teal-700"
                        >
                          Ver título
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {report.data?.data.length === 0 && (
                <p className="py-12 text-center text-sm text-slate-500">
                  Nenhum pagamento efetivo encontrado.
                </p>
              )}
            </div>
            <div className="mt-4 flex justify-end gap-2 print:hidden">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((value) => value - 1)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
              >
                Anterior
              </button>
              <span className="px-2 py-2 text-sm">
                {page}/{report.data?.pagination.totalPages ?? 1}
              </span>
              <button
                type="button"
                disabled={page >= (report.data?.pagination.totalPages ?? 1)}
                onClick={() => setPage((value) => value + 1)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
