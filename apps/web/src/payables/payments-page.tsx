import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { useMemo, useState, type ReactElement } from 'react';
import { ApiError, httpClient } from '../api/http-client';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { currency, statusLabel, type ListResponse } from './payables-types';

type EligibleStatus = 'OPEN' | 'OVERDUE' | 'PARTIALLY_PAID';

interface EligibleInstallment {
  installmentId: string;
  payableTitleId: string;
  companyId?: string | null;
  companyName?: string | null;
  supplierId: string;
  supplierName: string;
  categoryName: string;
  documentNumber: string;
  documentSeries?: string | null;
  description: string;
  installmentNumber: number;
  installmentCount: number;
  amount: string | number;
  openBalance: string | number;
  dueDate: string;
  paymentMethodId: string;
  paymentMethodName?: string | null;
  installmentStatusCode: EligibleStatus;
}

interface LookupItem { id: string; name?: string; legalName?: string; tradeName?: string | null }
interface BankBalance {
  bankAccountId: string;
  accountName: string;
  accountNumber?: string | null;
  bankName: string;
  companyId: string;
  companyName?: string | null;
  officialBalance: string | number;
}
interface PaymentHistoryItem {
  id: string;
  paymentDate: string;
  movementAmount: string | number;
  principalAmount: string | number;
  statusCode: 'EFFECTIVE' | 'REVERSED';
  isReversed: boolean;
  supplierName: string;
  companyName?: string | null;
  documentNumber: string;
  documentSeries?: string | null;
  description: string;
  installmentNumber: number;
  installmentCount: number;
  bankName: string;
  accountName: string;
  paymentMethodName: string;
  transactionNumber?: string | null;
  reversalReason?: string | null;
}
interface PaymentBankMovement {
  id: string;
  movementType: string;
  direction: 'IN' | 'OUT';
  movementDate: string;
  amount: string | number;
  description: string;
  referenceNumber?: string | null;
  bankName?: string | null;
  accountName?: string | null;
}
interface PaymentAttachment {
  id: string;
  originalName: string;
  mimeType?: string | null;
  sizeBytes?: string | number | null;
  createdAt?: string | null;
}
interface PaymentDetail extends PaymentHistoryItem {
  payableInstallmentId: string;
  payableTitleId: string;
  categoryName: string;
  costCenterName?: string | null;
  installmentAmount: string | number;
  installmentOpenBalance: string | number;
  dueDate: string;
  interestAmount: string | number;
  penaltyAmount: string | number;
  discountAmount: string | number;
  additionalAmount: string | number;
  overpaymentConfirmed: boolean;
  createdAt: string;
  reversedAt?: string | null;
  bankMovements: PaymentBankMovement[];
  attachments: PaymentAttachment[];
}

const statuses: EligibleStatus[] = ['OPEN', 'OVERDUE', 'PARTIALLY_PAID'];
const statusStyle: Record<string, string> = {
  OPEN: 'border-blue-200 bg-blue-50 text-blue-700',
  OVERDUE: 'border-red-200 bg-red-50 text-red-700',
  PARTIALLY_PAID: 'border-amber-200 bg-amber-50 text-amber-700',
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function datePtBr(value?: string | null): string {
  if (!value) return '-';
  const [year, month, day] = value.slice(0, 10).split('-');
  return year && month && day ? `${day}/${month}/${year}` : '-';
}

function documentLabel(item: EligibleInstallment): string {
  return `${item.documentNumber}${item.documentSeries ? ` / ${item.documentSeries}` : ''}`;
}

function paymentDocumentLabel(item: PaymentHistoryItem): string {
  return `${item.documentNumber}${item.documentSeries ? ` / ${item.documentSeries}` : ''}`;
}

function dateTimePtBr(value?: string | null): string {
  if (!value) return '-';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value));
}

function optionLabel(item: LookupItem): string {
  return item.tradeName || item.legalName || item.name || item.id;
}

function movementAmount(principal: string, interest: string, penalty: string, discount: string, additional: string): number {
  return Number(principal || 0) + Number(interest || 0) + Number(penalty || 0) + Number(additional || 0) - Number(discount || 0);
}

export function PaymentsPage(): ReactElement {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [dueFrom, setDueFrom] = useState('');
  const [dueTo, setDueTo] = useState('');
  const [selected, setSelected] = useState<EligibleInstallment>();
  const [bankAccountId, setBankAccountId] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentDate, setPaymentDate] = useState(today());
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestAmount, setInterestAmount] = useState('0');
  const [penaltyAmount, setPenaltyAmount] = useState('0');
  const [discountAmount, setDiscountAmount] = useState('0');
  const [additionalAmount, setAdditionalAmount] = useState('0');
  const [transactionNumber, setTransactionNumber] = useState('');
  const [overpaymentConfirmed, setOverpaymentConfirmed] = useState(false);
  const [cashBalanceOpen, setCashBalanceOpen] = useState(false);
  const [cashBankAccountId, setCashBankAccountId] = useState('');
  const [cashMovementDate, setCashMovementDate] = useState(today());
  const [cashAmount, setCashAmount] = useState('');
  const [cashReference, setCashReference] = useState('');
  const [reverseFor, setReverseFor] = useState<PaymentHistoryItem>();
  const [reverseReason, setReverseReason] = useState('');
  const [detailFor, setDetailFor] = useState<PaymentHistoryItem>();
  const [receiptFile, setReceiptFile] = useState<File>();
  const [downloadError, setDownloadError] = useState('');

  const installments = useQuery({
    queryKey: ['payment-eligible-installments', page, pageSize, search, status, companyId, supplierId, dueFrom, dueTo],
    queryFn: async () => {
      const response = await httpClient.get<ListResponse<EligibleInstallment>>('/api/v1/payable-installments/eligible-for-payment', {
        params: {
          page,
          pageSize,
          search: search || undefined,
          status: status || undefined,
          companyId: companyId || undefined,
          supplierId: supplierId || undefined,
          dueFrom: dueFrom || undefined,
          dueTo: dueTo || undefined,
        },
      });
      return response.data;
    },
  });

  const companies = useLookup('/companies');
  const suppliers = useLookup('/suppliers');
  const paymentMethods = useLookup('/payment-methods');

  const bankBalances = useQuery({
    queryKey: ['payment-bank-balances', selected?.companyId],
    queryFn: async () => {
      const response = await httpClient.get<ListResponse<BankBalance>>('/api/v1/bank-account-balances', {
        params: { pageSize: 100, companyId: selected?.companyId },
      });
      return response.data.data;
    },
    enabled: Boolean(selected?.companyId),
  });

  const allBankBalances = useQuery({
    queryKey: ['payment-all-bank-balances'],
    queryFn: async () => (await httpClient.get<ListResponse<BankBalance>>('/api/v1/bank-account-balances', { params: { pageSize: 100 } })).data.data,
    staleTime: 30000,
  });

  const paymentHistory = useQuery({
    queryKey: ['payment-history', search, companyId, supplierId],
    queryFn: async () => {
      const response = await httpClient.get<ListResponse<PaymentHistoryItem>>('/api/v1/payments', {
        params: { pageSize: 10, search: search || undefined, companyId: companyId || undefined, supplierId: supplierId || undefined },
      });
      return response.data;
    },
  });

  const paymentDetail = useQuery({
    queryKey: ['payment-detail', detailFor?.id],
    queryFn: async () => (await httpClient.get<PaymentDetail>(`/api/v1/payments/${detailFor?.id}`)).data,
    enabled: Boolean(detailFor?.id),
  });

  const uploadReceipt = useMutation<object>({
    mutationFn: async () => {
      if (!detailFor || !receiptFile) throw new Error('Comprovante não selecionado.');
      const form = new FormData();
      form.append('file', receiptFile);
      const response = await httpClient.post<object>(`/api/v1/payments/${detailFor.id}/attachments`, form);
      return response.data;
    },
    onSuccess: async () => {
      setReceiptFile(undefined);
      await queryClient.invalidateQueries({ queryKey: ['payment-detail', detailFor?.id] });
    },
  });

  const payment = useMutation<object>({
    mutationFn: async () => {
      if (!selected) throw new Error('Parcela não selecionada.');
      const response = await httpClient.post<object>('/api/v1/payments', {
        installmentId: selected.installmentId,
        bankAccountId,
        paymentMethodId,
        paymentDate,
        principalAmount: Number(principalAmount),
        interestAmount: Number(interestAmount || 0),
        penaltyAmount: Number(penaltyAmount || 0),
        discountAmount: Number(discountAmount || 0),
        additionalAmount: Number(additionalAmount || 0),
        transactionNumber: transactionNumber || null,
        overpaymentConfirmed,
      });
      return response.data;
    },
    onSuccess: async () => {
      closeDialog();
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payment-eligible-installments'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-history'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-bank-balances'] }),
        queryClient.invalidateQueries({ queryKey: ['payables'] }),
      ]);
    },
  });

  const cashBalance = useMutation<object>({
    mutationFn: async () => {
      const response = await httpClient.post<object>('/api/v1/bank-account-movements/manual-entry', {
        bankAccountId: cashBankAccountId,
        movementType: 'CASH_BALANCE',
        movementDate: cashMovementDate,
        amount: Number(cashAmount),
        description: 'Saldo de Caixa',
        referenceNumber: cashReference || null,
      });
      return response.data;
    },
    onSuccess: async () => {
      setCashBalanceOpen(false);
      setCashBankAccountId('');
      setCashAmount('');
      setCashReference('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payment-all-bank-balances'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-bank-balances'] }),
      ]);
    },
  });

  const reversePayment = useMutation<object>({
    mutationFn: async () => {
      if (!reverseFor) throw new Error('Pagamento não selecionado.');
      const response = await httpClient.post<object>(`/api/v1/payments/${reverseFor.id}/reverse`, { reason: reverseReason });
      return response.data;
    },
    onSuccess: async () => {
      setReverseFor(undefined);
      setReverseReason('');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payment-history'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-eligible-installments'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-all-bank-balances'] }),
        queryClient.invalidateQueries({ queryKey: ['payment-bank-balances'] }),
      ]);
    },
  });

  const rows = useMemo(() => installments.data?.data ?? [], [installments.data?.data]);
  const totalPages = Math.max(1, Math.ceil((installments.data?.total ?? 0) / pageSize));
  const firstItem = installments.data?.total ? (page - 1) * pageSize + 1 : 0;
  const lastItem = installments.data?.total ? Math.min(page * pageSize, installments.data.total) : 0;
  const hasFilters = Boolean(search || status || companyId || supplierId || dueFrom || dueTo || pageSize !== 20);
  const selectedAccount = bankBalances.data?.find((item) => item.bankAccountId === bankAccountId);
  const totalMovement = movementAmount(principalAmount, interestAmount, penaltyAmount, discountAmount, additionalAmount);
  const exceedsOpenBalance = selected ? Number(principalAmount || 0) > Number(selected.openBalance) : false;
  const insufficientBalance = selectedAccount ? Number(selectedAccount.officialBalance) < totalMovement : false;
  const canSubmit = Boolean(selected && bankAccountId && paymentMethodId && paymentDate && Number(principalAmount) > 0 && totalMovement > 0 && (!exceedsOpenBalance || overpaymentConfirmed));
  const canCreateCashBalance = Boolean(cashBankAccountId && cashMovementDate && Number(cashAmount) > 0);

  const summary = useMemo(() => ({
    openTotal: rows.reduce((sum, item) => sum + Number(item.openBalance || 0), 0),
    overdueTotal: rows.filter((item) => item.installmentStatusCode === 'OVERDUE').reduce((sum, item) => sum + Number(item.openBalance || 0), 0),
    partialCount: rows.filter((item) => item.installmentStatusCode === 'PARTIALLY_PAID').length,
  }), [rows]);

  function openDialog(item: EligibleInstallment): void {
    setSelected(item);
    setBankAccountId('');
    setPaymentMethodId(item.paymentMethodId);
    setPaymentDate(today());
    setPrincipalAmount(String(Number(item.openBalance || 0)));
    setInterestAmount('0');
    setPenaltyAmount('0');
    setDiscountAmount('0');
    setAdditionalAmount('0');
    setTransactionNumber('');
    setOverpaymentConfirmed(false);
  }

  function closeDialog(): void {
    setSelected(undefined);
    setBankAccountId('');
    setPaymentMethodId('');
    setPrincipalAmount('');
    setOverpaymentConfirmed(false);
    payment.reset();
  }

  function clearFilters(): void {
    setSearch('');
    setStatus('');
    setCompanyId('');
    setSupplierId('');
    setDueFrom('');
    setDueTo('');
    setPage(1);
    setPageSize(20);
  }

  function openReverseDialog(item: PaymentHistoryItem): void {
    setReverseFor(item);
    setReverseReason('');
    reversePayment.reset();
  }

  function closeDetailDialog(): void {
    setDetailFor(undefined);
    setReceiptFile(undefined);
    setDownloadError('');
    uploadReceipt.reset();
  }

  async function downloadAttachment(attachment: PaymentAttachment): Promise<void> {
    setDownloadError('');
    try {
      const response = await httpClient.get<Blob>(`/api/v1/attachments/${attachment.id}/download`, { responseType: 'blob' });
      const url = URL.createObjectURL(response.data);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.originalName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setDownloadError('Não foi possível baixar o comprovante.');
    }
  }

  return (
    <div className="grid gap-6">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Breadcrumb items={[{ label: 'Financeiro', to: '/payables' }, { label: 'Pagamentos' }]} />
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950">Baixa de Pagamentos</h1>
          <p className="mt-2 text-slate-600">Baixe parcelas individualmente usando somente contas bancárias da empresa do título.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={() => setCashBalanceOpen(true)}>Lançar saldo inicial</Button>
          <Button variant="secondary" onClick={() => void installments.refetch()}>Atualizar fila</Button>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <Card><p className="text-sm font-semibold text-slate-500">Aberto na fila</p><p className="mt-2 text-2xl font-black text-slate-950">{currency(summary.openTotal)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Atrasado na fila</p><p className="mt-2 text-2xl font-black text-red-700">{currency(summary.overdueTotal)}</p></Card>
        <Card><p className="text-sm font-semibold text-slate-500">Pagamentos parciais</p><p className="mt-2 text-2xl font-black text-amber-700">{summary.partialCount}</p></Card>
      </section>

      <Card>
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Parcelas elegíveis</h2>
            <p className="mt-1 text-sm text-slate-500">A lista traz parcelas em aberto, atrasadas ou parcialmente pagas.</p>
          </div>
          <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">{installments.data?.total ?? 0} parcela{(installments.data?.total ?? 0) === 1 ? '' : 's'}</span>
        </div>

        <div className="grid gap-3 xl:grid-cols-[minmax(260px,1fr)_220px_220px_170px]">
          <input aria-label="Pesquisar parcelas" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar fornecedor, documento ou descrição..." className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
          <select aria-label="Filtrar por empresa" value={companyId} onChange={(event) => { setCompanyId(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
            <option value="">Todas as empresas</option>
            {companies.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
          </select>
          <select aria-label="Filtrar por fornecedor" value={supplierId} onChange={(event) => { setSupplierId(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
            <option value="">Todos os fornecedores</option>
            {suppliers.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
          </select>
          <select aria-label="Filtrar por status" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
            <option value="">Todos os status</option>
            {statuses.map((item) => <option key={item} value={item}>{statusLabel(item)}</option>)}
          </select>
        </div>

        <div className="mt-3 grid gap-3 xl:grid-cols-[170px_170px_160px_auto]">
          <input aria-label="Vencimento inicial" type="date" value={dueFrom} onChange={(event) => { setDueFrom(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
          <input aria-label="Vencimento final" type="date" value={dueTo} onChange={(event) => { setDueTo(event.target.value); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
          <select aria-label="Registros por página" value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
            <option value={10}>10 por página</option>
            <option value={20}>20 por página</option>
            <option value={50}>50 por página</option>
          </select>
          <Button variant="secondary" disabled={!hasFilters} onClick={clearFilters}>Limpar filtros</Button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
          {installments.isLoading ? <p className="py-12 text-center text-slate-500">Carregando parcelas...</p> : installments.isError ? <p role="alert" className="py-12 text-center text-red-700">Não foi possível carregar parcelas elegíveis.</p> : <>
            <div className="hidden grid-cols-[116px_1.4fr_150px_130px_130px_110px] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500 xl:grid">
              <span>Vencimento</span><span>Fornecedor / Documento</span><span>Empresa</span><span>Parcela</span><span className="text-right">Saldo aberto</span><span className="text-right">Ação</span>
            </div>
            <div className="divide-y divide-slate-100">
              {rows.map((item) => <div key={item.installmentId} className="grid gap-3 px-4 py-3 text-sm hover:bg-slate-50 xl:grid-cols-[116px_1.4fr_150px_130px_130px_110px] xl:items-center">
                <span className="font-semibold text-slate-700">{datePtBr(item.dueDate)}</span>
                <span className="min-w-0"><span className="block truncate font-bold text-slate-950">{item.supplierName}</span><span className="block truncate text-xs text-slate-500">{documentLabel(item)} - {item.description}</span></span>
                <span className="truncate font-semibold text-slate-600">{item.companyName ?? 'Sem empresa'}</span>
                <span className="flex items-center gap-2"><span>{item.installmentNumber}/{item.installmentCount}</span><span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${statusStyle[item.installmentStatusCode]}`}>{statusLabel(item.installmentStatusCode)}</span></span>
                <span className="font-black text-slate-950 xl:text-right">{currency(item.openBalance)}</span>
                <span className="xl:text-right"><Button disabled={!item.companyId} onClick={() => openDialog(item)}>Baixar</Button></span>
              </div>)}
              {rows.length === 0 && <p className="py-12 text-center text-slate-500">Nenhuma parcela elegível encontrada.</p>}
            </div>
          </>}
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-5 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-sm text-slate-500">Exibindo {firstItem}-{lastItem} de {installments.data?.total ?? 0}</p>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" disabled={page === 1} onClick={() => setPage((value) => value - 1)}>Anterior</Button>
            <span className="grid min-w-10 place-items-center rounded-lg bg-teal-700 text-sm font-bold text-white">{page}/{totalPages}</span>
            <Button variant="secondary" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}>Próxima</Button>
          </div>
        </div>
      </Card>

      <Card>
        <div className="mb-5 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-950">Pagamentos realizados</h2>
            <p className="mt-1 text-sm text-slate-500">Histórico recente para conferência e estorno auditado.</p>
          </div>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{paymentHistory.data?.total ?? 0} pagamento{(paymentHistory.data?.total ?? 0) === 1 ? '' : 's'}</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          {paymentHistory.isLoading ? <p className="py-12 text-center text-slate-500">Carregando pagamentos...</p> : paymentHistory.isError ? <p role="alert" className="py-12 text-center text-red-700">Não foi possível carregar pagamentos.</p> : <div className="divide-y divide-slate-100">
            {(paymentHistory.data?.data ?? []).map((item) => <div key={item.id} className="grid gap-3 px-4 py-3 text-sm hover:bg-slate-50 xl:grid-cols-[116px_1.4fr_150px_140px_120px_160px] xl:items-center">
              <span className="font-semibold text-slate-700">{datePtBr(item.paymentDate)}</span>
              <span className="min-w-0"><span className="block truncate font-bold text-slate-950">{item.supplierName}</span><span className="block truncate text-xs text-slate-500">{paymentDocumentLabel(item)} - {item.description}</span></span>
              <span className="truncate text-slate-600">{item.companyName ?? '-'}</span>
              <span className="truncate text-slate-600">{item.bankName} - {item.accountName}</span>
              <span className="font-black text-slate-950 xl:text-right">{currency(item.movementAmount)}</span>
              <span className="flex items-center justify-end gap-2">
                <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${item.isReversed ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{item.isReversed ? 'Estornado' : statusLabel(item.statusCode)}</span>
                <Button variant="secondary" onClick={() => setDetailFor(item)}>Ver</Button>
                <Button variant="danger" disabled={item.isReversed} onClick={() => openReverseDialog(item)}>Estornar</Button>
              </span>
            </div>)}
            {(paymentHistory.data?.data ?? []).length === 0 && <p className="py-12 text-center text-slate-500">Nenhum pagamento registrado.</p>}
          </div>}
        </div>
      </Card>

      {selected ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="presentation">
        <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="Baixar parcela">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Baixar parcela</h2>
              <p className="mt-1 text-sm text-slate-600">{documentLabel(selected)} - {selected.supplierName}</p>
            </div>
            <button className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100" onClick={closeDialog} aria-label="Fechar">X</button>
          </div>

          <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
            <Summary label="Empresa" value={selected.companyName ?? 'Sem empresa'} />
            <Summary label="Parcela" value={`${selected.installmentNumber}/${selected.installmentCount}`} />
            <Summary label="Vencimento" value={datePtBr(selected.dueDate)} />
            <Summary label="Saldo aberto" value={currency(selected.openBalance)} strong />
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="grid gap-1 text-sm font-bold text-slate-700">Conta bancária
              <select aria-label="Conta bancária" value={bankAccountId} onChange={(event) => setBankAccountId(event.target.value)} className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
                <option value="">Selecione</option>
                {bankBalances.data?.map((item) => <option key={item.bankAccountId} value={item.bankAccountId}>{item.bankName} - {item.accountName} - saldo {currency(item.officialBalance)}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-slate-700">Forma de pagamento
              <select aria-label="Forma de pagamento" value={paymentMethodId} onChange={(event) => setPaymentMethodId(event.target.value)} className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
                <option value="">Selecione</option>
                {paymentMethods.data?.map((item) => <option key={item.id} value={item.id}>{optionLabel(item)}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-bold text-slate-700">Data do pagamento
              <input aria-label="Data do pagamento" type="date" value={paymentDate} onChange={(event) => setPaymentDate(event.target.value)} className="min-h-12 rounded-xl border border-slate-300 px-3 font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
            </label>
            <label className="grid gap-1 text-sm font-bold text-slate-700">Número da transação
              <input aria-label="Número da transação" value={transactionNumber} onChange={(event) => setTransactionNumber(event.target.value)} placeholder="Opcional" className="min-h-12 rounded-xl border border-slate-300 px-3 font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
            </label>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-5">
            <MoneyField label="Valor principal" value={principalAmount} onChange={setPrincipalAmount} />
            <MoneyField label="Juros" value={interestAmount} onChange={setInterestAmount} />
            <MoneyField label="Multa" value={penaltyAmount} onChange={setPenaltyAmount} />
            <MoneyField label="Acréscimos" value={additionalAmount} onChange={setAdditionalAmount} />
            <MoneyField label="Desconto" value={discountAmount} onChange={setDiscountAmount} />
          </div>

          <div className="mt-5 rounded-2xl border border-teal-100 bg-teal-50 p-4">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm font-bold text-teal-900">Valor que sairá da conta</p>
                <p className="text-xs text-teal-800">Principal + juros + multa + acréscimos - desconto.</p>
              </div>
              <p className="text-2xl font-black text-teal-900">{currency(totalMovement)}</p>
            </div>
            {selectedAccount ? <p className={`mt-2 text-sm font-bold ${insufficientBalance ? 'text-red-700' : 'text-teal-800'}`}>Saldo da conta selecionada: {currency(selectedAccount.officialBalance)}</p> : null}
            {exceedsOpenBalance ? <label className="mt-3 flex items-center gap-2 text-sm font-bold text-amber-800"><input type="checkbox" checked={overpaymentConfirmed} onChange={(event) => setOverpaymentConfirmed(event.target.checked)} /> Confirmo pagamento acima do saldo aberto.</label> : null}
            {insufficientBalance ? <p role="alert" className="mt-3 text-sm font-bold text-red-700">Saldo insuficiente. A baixa será bloqueada pela API.</p> : null}
            {payment.error ? <p role="alert" className="mt-3 text-sm font-bold text-red-700">{payment.error instanceof ApiError ? payment.error.message : 'Não foi possível registrar a baixa.'}</p> : null}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={closeDialog}>Cancelar</Button>
            <Button disabled={!canSubmit || payment.isPending || insufficientBalance} onClick={() => payment.mutate()}>{payment.isPending ? 'Baixando...' : 'Confirmar baixa'}</Button>
          </div>
        </div>
      </div> : null}

      {cashBalanceOpen ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="presentation">
        <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="Lançar saldo inicial">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-2xl font-black text-slate-950">Lançar saldo inicial</h2><p className="mt-1 text-sm text-slate-600">Cria um movimento de entrada do tipo Saldo de Caixa.</p></div>
            <button className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100" onClick={() => setCashBalanceOpen(false)} aria-label="Fechar saldo inicial">X</button>
          </div>
          <div className="mt-5 grid gap-4">
            <label className="grid gap-1 text-sm font-bold text-slate-700">Conta bancária
              <select aria-label="Conta para saldo inicial" value={cashBankAccountId} onChange={(event) => setCashBankAccountId(event.target.value)} className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100">
                <option value="">Selecione</option>
                {allBankBalances.data?.map((item) => <option key={item.bankAccountId} value={item.bankAccountId}>{item.companyName ?? '-'} - {item.bankName} - {item.accountName} - saldo {currency(item.officialBalance)}</option>)}
              </select>
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <MoneyField label="Valor inicial" value={cashAmount} onChange={setCashAmount} />
              <label className="grid gap-1 text-sm font-bold text-slate-700">Data do saldo
                <input aria-label="Data do saldo inicial" type="date" value={cashMovementDate} onChange={(event) => setCashMovementDate(event.target.value)} className="min-h-12 rounded-xl border border-slate-300 px-3 font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
              </label>
            </div>
            <label className="grid gap-1 text-sm font-bold text-slate-700">Referência
              <input aria-label="Referência do saldo inicial" value={cashReference} onChange={(event) => setCashReference(event.target.value)} placeholder="Opcional" className="min-h-12 rounded-xl border border-slate-300 px-3 font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
            </label>
            {cashBalance.error ? <p role="alert" className="text-sm font-bold text-red-700">{cashBalance.error instanceof ApiError ? cashBalance.error.message : 'Não foi possível lançar o saldo inicial.'}</p> : null}
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setCashBalanceOpen(false)}>Cancelar</Button>
            <Button disabled={!canCreateCashBalance || cashBalance.isPending} onClick={() => cashBalance.mutate()}>{cashBalance.isPending ? 'Lançando...' : 'Lançar saldo'}</Button>
          </div>
        </div>
      </div> : null}

      {reverseFor ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="presentation">
        <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="Estornar pagamento">
          <div className="flex items-start justify-between gap-4">
            <div><h2 className="text-2xl font-black text-slate-950">Estornar pagamento</h2><p className="mt-1 text-sm text-slate-600">{paymentDocumentLabel(reverseFor)} - {currency(reverseFor.movementAmount)}</p></div>
            <button className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100" onClick={() => setReverseFor(undefined)} aria-label="Fechar estorno">X</button>
          </div>
          <label className="mt-5 grid gap-1 text-sm font-bold text-slate-700">Motivo do estorno
            <textarea aria-label="Motivo do estorno" value={reverseReason} onChange={(event) => setReverseReason(event.target.value)} rows={4} className="rounded-xl border border-slate-300 px-3 py-2 font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
          </label>
          {reversePayment.error ? <p role="alert" className="mt-3 text-sm font-bold text-red-700">{reversePayment.error instanceof ApiError ? reversePayment.error.message : 'Não foi possível estornar o pagamento.'}</p> : null}
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setReverseFor(undefined)}>Cancelar</Button>
            <Button variant="danger" disabled={reverseReason.trim().length < 3 || reversePayment.isPending} onClick={() => reversePayment.mutate()}>{reversePayment.isPending ? 'Estornando...' : 'Confirmar estorno'}</Button>
          </div>
        </div>
      </div> : null}

      {detailFor ? <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4" role="presentation">
        <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl" role="dialog" aria-modal="true" aria-label="Detalhe do pagamento">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-950">Detalhe do pagamento</h2>
              <p className="mt-1 text-sm text-slate-600">{paymentDocumentLabel(detailFor)} - {detailFor.supplierName}</p>
            </div>
            <button className="rounded-lg px-3 py-2 text-xl text-slate-400 hover:bg-slate-100" onClick={closeDetailDialog} aria-label="Fechar detalhe">X</button>
          </div>

          {paymentDetail.isLoading ? <p className="py-10 text-center text-slate-500">Carregando detalhe...</p> : paymentDetail.isError ? <p role="alert" className="py-10 text-center text-red-700">Não foi possível carregar o detalhe do pagamento.</p> : paymentDetail.data ? <>
            <div className="mt-5 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
              <Summary label="Empresa" value={paymentDetail.data.companyName ?? '-'} />
              <Summary label="Parcela" value={`${paymentDetail.data.installmentNumber}/${paymentDetail.data.installmentCount}`} />
              <Summary label="Pagamento" value={datePtBr(paymentDetail.data.paymentDate)} />
              <Summary label="Valor pago" value={currency(paymentDetail.data.movementAmount)} strong />
            </div>

            <section className="mt-5 grid gap-4 md:grid-cols-2">
              <Card>
                <h3 className="font-black text-slate-950">Composição da baixa</h3>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  <DetailRow label="Principal" value={currency(paymentDetail.data.principalAmount)} />
                  <DetailRow label="Juros" value={currency(paymentDetail.data.interestAmount)} />
                  <DetailRow label="Multa" value={currency(paymentDetail.data.penaltyAmount)} />
                  <DetailRow label="Acréscimos" value={currency(paymentDetail.data.additionalAmount)} />
                  <DetailRow label="Desconto" value={currency(paymentDetail.data.discountAmount)} />
                </div>
              </Card>
              <Card>
                <h3 className="font-black text-slate-950">Origem operacional</h3>
                <div className="mt-3 grid gap-2 text-sm text-slate-700">
                  <DetailRow label="Conta" value={`${paymentDetail.data.bankName} - ${paymentDetail.data.accountName}`} />
                  <DetailRow label="Forma" value={paymentDetail.data.paymentMethodName} />
                  <DetailRow label="Categoria" value={paymentDetail.data.categoryName} />
                  <DetailRow label="Centro de custo" value={paymentDetail.data.costCenterName ?? '-'} />
                  <DetailRow label="Transação" value={paymentDetail.data.transactionNumber ?? '-'} />
                </div>
              </Card>
            </section>

            <section className="mt-5 rounded-2xl border border-slate-200 p-4">
              <h3 className="font-black text-slate-950">Movimentos de tesouraria</h3>
              <div className="mt-3 divide-y divide-slate-100">
                {paymentDetail.data.bankMovements.map((movement) => <div key={movement.id} className="grid gap-2 py-3 text-sm md:grid-cols-[100px_90px_1fr_130px] md:items-center">
                  <span className="font-semibold text-slate-700">{datePtBr(movement.movementDate)}</span>
                  <span className={`w-fit rounded-full border px-2 py-0.5 text-xs font-bold ${movement.direction === 'OUT' ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{movement.direction === 'OUT' ? 'Saída' : 'Entrada'}</span>
                  <span className="text-slate-600">{movement.description}</span>
                  <span className="font-black text-slate-950 md:text-right">{currency(movement.amount)}</span>
                </div>)}
                {paymentDetail.data.bankMovements.length === 0 && <p className="py-4 text-sm text-slate-500">Nenhum movimento de tesouraria vinculado.</p>}
              </div>
            </section>

            {paymentDetail.data.isReversed ? <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
              <h3 className="font-black text-amber-950">Pagamento estornado</h3>
              <p className="mt-2 text-sm text-amber-900">{paymentDetail.data.reversalReason ?? 'Sem motivo informado.'}</p>
              <p className="mt-1 text-xs font-semibold text-amber-800">Estornado em {dateTimePtBr(paymentDetail.data.reversedAt)}</p>
            </section> : null}

            <section className="mt-5 rounded-2xl border border-slate-200 p-4">
              <h3 className="font-black text-slate-950">Comprovantes</h3>
              <div className="mt-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4">
                <label className="grid gap-1 text-sm font-bold text-slate-700">Novo comprovante
                  <input aria-label="Arquivo do comprovante" type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => setReceiptFile(event.target.files?.[0])} className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 py-2 font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
                </label>
                <div className="mt-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <p className="text-xs text-slate-500">Aceita PDF, JPG, PNG ou WEBP. O arquivo fica salvo no storage local privado da API.</p>
                  <Button disabled={!receiptFile || uploadReceipt.isPending} onClick={() => uploadReceipt.mutate()}>{uploadReceipt.isPending ? 'Anexando...' : 'Anexar comprovante'}</Button>
                </div>
                {uploadReceipt.error ? <p role="alert" className="mt-3 text-sm font-bold text-red-700">{uploadReceipt.error instanceof ApiError ? uploadReceipt.error.message : 'Não foi possível anexar o comprovante.'}</p> : null}
              </div>
              <div className="mt-3 divide-y divide-slate-100">
                {paymentDetail.data.attachments.map((attachment) => <div key={attachment.id} className="flex flex-col gap-1 py-3 text-sm md:flex-row md:items-center md:justify-between">
                  <div>
                    <span className="font-semibold text-slate-700">{attachment.originalName}</span>
                    <span className="mt-1 block text-xs text-slate-500">{attachment.mimeType ?? 'arquivo'} - {dateTimePtBr(attachment.createdAt)}</span>
                  </div>
                  <Button variant="secondary" onClick={() => void downloadAttachment(attachment)}>Baixar</Button>
                </div>)}
                {paymentDetail.data.attachments.length === 0 && <p className="py-4 text-sm text-slate-500">Nenhum comprovante anexado.</p>}
              </div>
              {downloadError ? <p role="alert" className="mt-3 text-sm font-bold text-red-700">{downloadError}</p> : null}
            </section>
          </> : null}
        </div>
      </div> : null}
    </div>
  );
}

function useLookup(path: string): UseQueryResult<LookupItem[]> {
  return useQuery({
    queryKey: ['payment-lookup', path],
    queryFn: async () => (await httpClient.get<ListResponse<LookupItem>>(`/api/v1${path}`, { params: { pageSize: 100, active: true } })).data.data,
    staleTime: 60000,
  });
}

function Summary({ label, value, strong = false }: { label: string; value: string; strong?: boolean }): ReactElement {
  return <div><p className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className={`mt-1 truncate ${strong ? 'text-lg font-black text-slate-950' : 'font-semibold text-slate-700'}`}>{value}</p></div>;
}

function MoneyField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }): ReactElement {
  return <label className="grid gap-1 text-sm font-bold text-slate-700">{label}<input aria-label={label} type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} className="min-h-12 rounded-xl border border-slate-300 px-3 font-medium outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></label>;
}

function DetailRow({ label, value }: { label: string; value: string }): ReactElement {
  return <div className="flex items-center justify-between gap-3"><span className="text-slate-500">{label}</span><span className="text-right font-bold text-slate-900">{value}</span></div>;
}
