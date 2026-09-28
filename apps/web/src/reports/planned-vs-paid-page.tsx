import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { httpClient } from "../api/http-client";
import { useAuth } from "../auth/auth-context";
import { Breadcrumb } from "../components/ui/breadcrumb";
import { Card } from "../components/ui/card";
import { useToast } from "../components/ui/toast-context";
import type {
  OptionResponse,
  PlannedVsPaidGroup,
  PlannedVsPaidResponse,
} from "../intelligence/contracts";
import { currency } from "../payables/payables-types";
import { buildPlannedVsPaidWorkbook } from "./planned-vs-paid-export";
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

function GroupTable({
  title,
  groups,
  byDate,
}: {
  title: string;
  groups: PlannedVsPaidGroup[];
  byDate: boolean;
}): ReactElement {
  return (
    <Card>
      <h2 className="text-xl font-black text-slate-950">{title}</h2>
      <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">{byDate ? "Data" : "Empresa"}</th>
              <th className="px-4 py-3 text-right">Previsto</th>
              <th className="px-4 py-3 text-right">Pago</th>
              <th className="px-4 py-3 text-right">Diferença</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {groups.map((group) => (
              <tr key={group.id ?? group.label}>
                <td className="px-4 py-3">
                  <strong className="block">
                    {byDate ? date(group.label) : group.label}
                  </strong>
                  <span className="text-xs text-slate-500">
                    {group.installmentCount} parcela(s) · {group.paymentCount}{" "}
                    pagamento(s)
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {currency(group.planned)}
                </td>
                <td className="px-4 py-3 text-right">{currency(group.paid)}</td>
                <td
                  className={`px-4 py-3 text-right font-black ${Number(group.difference) < 0 ? "text-red-700" : "text-teal-800"}`}
                >
                  {currency(group.difference)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {groups.length === 0 && (
          <p className="py-10 text-center text-sm text-slate-500">
            Nenhum lançamento no período selecionado.
          </p>
        )}
      </div>
    </Card>
  );
}

export function PlannedVsPaidPage(): ReactElement {
  const auth = useAuth();
  const { showToast } = useToast();
  const initial = rangeForForecastPreset("THIS_MONTH");
  const [preset, setPreset] = useState<ForecastPeriodPreset>("THIS_MONTH");
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);
  const [companyId, setCompanyId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [categoryId, setCategoryId] = useState("");
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
  };
  const report = useQuery({
    queryKey: ["planned-vs-paid", params],
    queryFn: async () =>
      (
        await httpClient.get<PlannedVsPaidResponse>(
          "/api/v1/reports/planned-vs-paid",
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
  };
  const exportSpreadsheet = async (): Promise<void> => {
    if (!report.data || exporting) return;
    setExporting(true);
    try {
      const company = companies.find((item) => item.id === companyId);
      const supplier = suppliers.data?.find((item) => item.id === supplierId);
      const category = categories.data?.find((item) => item.id === categoryId);
      const content = await buildPlannedVsPaidWorkbook({
        from,
        to,
        generatedAt: new Date(),
        company:
          company?.tradeName || company?.legalName || "Todas as empresas",
        supplier:
          supplier?.legalName || supplier?.name || "Todos os fornecedores",
        category: category?.name || "Todas as categorias",
        report: report.data,
      });
      const url = URL.createObjectURL(
        new Blob([Uint8Array.from(content)], {
          type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        }),
      );
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `previsto-x-pago-${from}-a-${to}.xlsx`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      showToast({
        type: "success",
        title: "Planilha gerada",
        description: "Comparativo exportado com os filtros atuais.",
      });
    } catch {
      showToast({
        type: "error",
        title: "Não foi possível exportar",
        description: "Tente novamente ou revise os filtros.",
      });
    } finally {
      setExporting(false);
    }
  };
  const summary = report.data?.summary;
  return (
    <div data-print-report className="grid gap-6">
      <div className="print:hidden">
        <Breadcrumb
          items={[{ label: "Relatórios" }, { label: "Previsto x pago" }]}
        />
      </div>
      <header className="rounded-3xl border border-teal-100 bg-[radial-gradient(circle_at_top_right,_rgba(20,184,166,0.18),_transparent_42%),linear-gradient(135deg,#f0fdfa_0%,#ffffff_58%,#eff6ff_100%)] p-6 shadow-sm lg:p-8">
        <div className="flex flex-wrap items-end justify-between gap-5">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.22em] text-teal-700">
              Comparativo financeiro
            </p>
            <h1 className="mt-2 text-3xl font-black text-slate-950 lg:text-4xl">
              Previsto x pago
            </h1>
            <p className="mt-3 text-slate-600">
              O que estava programado para vencer e o que efetivamente saiu da
              conta no mesmo período.
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
                Compromissos
              </Link>
              <Link
                to="/reports/payments"
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-teal-800"
              >
                Pagamentos
              </Link>
              <button
                type="button"
                onClick={() => setPanelOpen((value) => !value)}
                className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold"
              >
                {panelOpen ? "Ocultar filtros" : "Exibir filtros"}
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
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <label className="grid gap-1 text-sm font-semibold">
              Data inicial
              <input
                aria-label="Data inicial"
                type="date"
                value={from}
                onChange={(event) => {
                  setFrom(event.target.value);
                  setPreset("CUSTOM");
                }}
                className="min-h-11 rounded-xl border border-slate-300 px-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Data final
              <input
                aria-label="Data final"
                type="date"
                value={to}
                onChange={(event) => {
                  setTo(event.target.value);
                  setPreset("CUSTOM");
                }}
                className="min-h-11 rounded-xl border border-slate-300 px-3"
              />
            </label>
            <label className="grid gap-1 text-sm font-semibold">
              Empresa
              <select
                aria-label="Empresa"
                value={companyId}
                onChange={(event) => setCompanyId(event.target.value)}
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
                onChange={(event) => setSupplierId(event.target.value)}
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
                onChange={(event) => setCategoryId(event.target.value)}
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
          </div>
          {from > to && (
            <p role="alert" className="mt-4 text-sm font-bold text-red-700">
              A data inicial não pode ser posterior à data final.
            </p>
          )}
        </Card>
      )}
      <p className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-950">
        <strong>Como ler:</strong> previsto é o valor original das parcelas que
        vencem no período, inclusive as já pagas; pago é o valor efetivamente
        movimentado na data do pagamento, com encargos e descontos, sem
        estornos. A diferença é <strong>pago menos previsto</strong>; não
        representa saldo em atraso nem a conciliação de cada título.
      </p>
      {report.isError ? (
        <Card>
          <p role="alert" className="text-red-700">
            Não foi possível carregar o comparativo.
          </p>
        </Card>
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 print:hidden">
            {(
              [
                [
                  "Previsto por vencimento",
                  currency(summary?.planned ?? 0),
                  "bg-slate-950 text-white",
                ],
                [
                  "Pago no período",
                  currency(summary?.paid ?? 0),
                  "bg-emerald-50 text-emerald-900",
                ],
                [
                  "Diferença · pago - previsto",
                  currency(summary?.difference ?? 0),
                  Number(summary?.difference ?? 0) < 0
                    ? "bg-red-50 text-red-800"
                    : "bg-sky-50 text-sky-900",
                ],
                [
                  "Registros",
                  `${summary?.installmentCount ?? 0} parcelas · ${summary?.paymentCount ?? 0} pagamentos`,
                  "bg-white text-slate-900",
                ],
              ] as const
            ).map(([label, value, color]) => (
              <article
                key={label}
                className={`rounded-2xl border border-slate-200 p-5 shadow-sm ${color}`}
              >
                <span className="text-sm font-bold opacity-75">{label}</span>
                <strong className="mt-2 block text-xl font-black xl:text-2xl">
                  {value}
                </strong>
              </article>
            ))}
          </section>
          <section className="grid gap-4 xl:grid-cols-2">
            <GroupTable
              title="Por data"
              groups={report.data?.byDate ?? []}
              byDate
            />
            <GroupTable
              title="Por empresa"
              groups={report.data?.byCompany ?? []}
              byDate={false}
            />
          </section>
        </>
      )}
    </div>
  );
}
