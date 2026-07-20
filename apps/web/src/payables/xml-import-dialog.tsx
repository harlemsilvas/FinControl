import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { ApiError, httpClient } from '../api/http-client';
import { Button } from '../components/ui/button';
import { currency } from './payables-types';
import { digitsOnly, parseNfeXml, type ParsedNfeXml } from './xml-import-parser';

type RecipientKind = 'MAIN' | 'BRANCH' | 'UNKNOWN';

interface XmlImportResult {
  id: string;
  supplier?: { id: string; legalName?: string; documentNumber?: string } | null;
  supplierWasCreated?: boolean;
}

function formatDocument(value?: string): string {
  const digits = digitsOnly(value);
  if (digits.length === 14) return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  if (digits.length === 11) return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  return value || '—';
}

function datePtBr(value?: string): string {
  if (!value) return '—';
  const [year, month, day] = value.split('-');
  return day && month && year ? `${day}/${month}/${year}` : '—';
}

function recipientKind(parsed: ParsedNfeXml | undefined, mainCompanyDocument: string): RecipientKind {
  const recipientDocument = digitsOnly(parsed?.recipient.documentNumber);
  const mainDocument = digitsOnly(mainCompanyDocument);
  if (!recipientDocument || !mainDocument) return 'UNKNOWN';
  return recipientDocument === mainDocument ? 'MAIN' : 'BRANCH';
}

export function XmlImportDialog({ open, onClose }: { open: boolean; onClose: () => void }): ReactElement | null {
  const queryClient = useQueryClient();
  const [mainCompanyDocument, setMainCompanyDocument] = useState(() => localStorage.getItem('fincontrol.mainCompanyDocument') ?? '');
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState<number>();
  const [parsed, setParsed] = useState<ParsedNfeXml>();
  const [parseError, setParseError] = useState<string>();
  const [importResult, setImportResult] = useState<XmlImportResult>();

  useEffect(() => {
    if (mainCompanyDocument) localStorage.setItem('fincontrol.mainCompanyDocument', digitsOnly(mainCompanyDocument));
  }, [mainCompanyDocument]);

  useEffect(() => {
    if (!open) setImportResult(undefined);
  }, [open]);

  const kind = recipientKind(parsed, mainCompanyDocument);
  const canImport = Boolean(parsed && /^\d{44}$/.test(parsed.accessKey) && digitsOnly(mainCompanyDocument) && !importResult);
  const mutation = useMutation({
    mutationFn: async () => {
      if (!parsed) throw new Error('Nenhum XML lido.');
      const response = await httpClient.post<XmlImportResult>('/api/v1/xml-imports', {
        accessKey: parsed.accessKey,
        rawXml: parsed.rawXml,
        sourceFileName: fileName || null,
        sourceMimeType: 'application/xml',
        sourceSizeBytes: fileSize ?? null,
        supplierLegalName: parsed.supplier.legalName ?? null,
        supplierTradeName: parsed.supplier.tradeName ?? null,
        supplierDocumentNumber: parsed.supplier.documentNumber ?? null,
        supplierStateRegistration: parsed.supplier.stateRegistration ?? null,
        supplierCityName: parsed.supplier.cityName ?? null,
        supplierStateCode: parsed.supplier.stateCode ?? null,
        recipientLegalName: parsed.recipient.legalName ?? null,
        recipientDocumentNumber: parsed.recipient.documentNumber ?? null,
        recipientStateRegistration: parsed.recipient.stateRegistration ?? null,
        recipientCityName: parsed.recipient.cityName ?? null,
        recipientStateCode: parsed.recipient.stateCode ?? null,
        recipientKind: kind,
        mainCompanyDocumentNumber: digitsOnly(mainCompanyDocument),
        documentModel: parsed.documentModel ?? null,
        documentNumber: parsed.documentNumber ?? null,
        documentSeries: parsed.documentSeries ?? null,
        issueDate: parsed.issueDate ?? null,
        operationDate: parsed.operationDate ?? null,
        dueDate: parsed.dueDate ?? null,
        productsAmount: parsed.productsAmount ?? null,
        freightAmount: parsed.freightAmount ?? null,
        insuranceAmount: parsed.insuranceAmount ?? null,
        discountAmount: parsed.discountAmount ?? null,
        otherAmount: parsed.otherAmount ?? null,
        invoiceTotalAmount: parsed.invoiceTotalAmount ?? null,
        paymentAmount: parsed.paymentAmount ?? null,
        parsedData: { itemsPreview: parsed.items },
        installments: parsed.installments,
      });
      return response.data;
    },
    onSuccess: async (data) => {
      setImportResult(data);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['payables'] }),
        queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
      ]);
    },
  });

  const error = mutation.error instanceof ApiError
    ? mutation.error.code === 'XML_IMPORT_DUPLICATE'
      ? 'Este XML já foi importado. A chave NFe é única no sistema.'
      : mutation.error.message
    : mutation.error
      ? 'Não foi possível importar o XML.'
      : undefined;

  async function handleFile(file: File | undefined): Promise<void> {
    setParseError(undefined);
    setImportResult(undefined);
    setParsed(undefined);
    setFileName(file?.name ?? '');
    setFileSize(file?.size);
    if (!file) return;
    try {
      setParsed(parseNfeXml(await file.text()));
    } catch (cause) {
      setParseError(cause instanceof Error ? cause.message : 'Não foi possível ler o XML.');
    }
  }

  const totals = useMemo(() => [
    ['Produtos', parsed?.productsAmount],
    ['Frete', parsed?.freightAmount],
    ['Desconto', parsed?.discountAmount],
    ['Outros', parsed?.otherAmount],
    ['Total NF', parsed?.invoiceTotalAmount],
  ] as const, [parsed]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-label="Importar XML de NFe">
      <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-950">Importar XML de NFe</h2>
            <p className="mt-1 text-sm text-slate-600">Leia o XML, confira chave, fornecedor, destinatário, valores e vencimentos antes de gravar.</p>
          </div>
          <button type="button" className="text-2xl text-slate-400 hover:text-slate-700" onClick={onClose} aria-label="Fechar">×</button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_260px]">
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            Arquivo XML
            <input type="file" accept=".xml,text/xml,application/xml" onChange={(event) => void handleFile(event.target.files?.[0])} className="min-h-11 rounded-xl border border-slate-300 px-3 py-2 text-sm" />
          </label>
          <label className="grid gap-1.5 text-sm font-semibold text-slate-700">
            CNPJ matriz do sistema
            <input value={mainCompanyDocument} onChange={(event) => setMainCompanyDocument(event.target.value)} placeholder="Somente números" className="min-h-11 rounded-xl border border-slate-300 px-3 text-sm" />
          </label>
        </div>

        {parseError && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{parseError}</p>}
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p>}
        {importResult && <div role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
          <strong>XML importado com sucesso.</strong>{' '}
          {importResult.supplier ? importResult.supplierWasCreated ? 'Fornecedor cadastrado automaticamente a partir do emitente da NFe.' : 'Fornecedor já cadastrado foi localizado pelo documento do emitente.' : 'Fornecedor não foi vinculado porque o XML não trouxe CNPJ/CPF válido do emitente.'}
          {importResult.supplier ? <span className="mt-1 block">Fornecedor: <strong>{importResult.supplier.legalName ?? '—'}</strong> · {formatDocument(importResult.supplier.documentNumber)}</span> : null}
        </div>}

        {parsed && (
          <div className="mt-6 grid gap-5">
            <div className="grid gap-4 lg:grid-cols-3">
              <section className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Chave NFe</p>
                <p className="mt-2 break-all text-sm font-bold text-slate-950">{parsed.accessKey}</p>
                <p className="mt-2 text-xs text-slate-500">Modelo {parsed.documentModel ?? '—'} • Série {parsed.documentSeries ?? '—'} • Nº {parsed.documentNumber ?? '—'}</p>
              </section>
              <section className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Fornecedor / Emitente</p>
                <p className="mt-2 font-bold text-slate-950">{parsed.supplier.legalName ?? '—'}</p>
                <p className="text-sm text-slate-600">{formatDocument(parsed.supplier.documentNumber)}</p>
              </section>
              <section className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Empresa destinatária</p>
                <p className="mt-2 font-bold text-slate-950">{parsed.recipient.legalName ?? '—'}</p>
                <p className="text-sm text-slate-600">{formatDocument(parsed.recipient.documentNumber)}</p>
                <span className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold ${kind === 'MAIN' ? 'bg-emerald-50 text-emerald-700' : kind === 'BRANCH' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{kind === 'MAIN' ? 'Matriz' : kind === 'BRANCH' ? 'Filial' : 'Não classificada'}</span>
              </section>
            </div>

            {kind === 'BRANCH' && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">O destinatário não bate com o CNPJ matriz informado. O XML será armazenado como filial para conferência.</p>}

            <div className="grid gap-4 lg:grid-cols-[1fr_1fr]">
              <section className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-950">Valores principais</h3>
                <div className="mt-3 grid gap-2 text-sm">
                  {totals.map(([label, value]) => <div key={label} className="flex justify-between gap-4"><span className="text-slate-500">{label}</span><strong>{currency(value ?? 0)}</strong></div>)}
                </div>
              </section>
              <section className="rounded-2xl border border-slate-200 p-4">
                <h3 className="font-bold text-slate-950">Vencimentos</h3>
                <div className="mt-3 grid gap-2 text-sm">
                  {parsed.installments.map((item) => <div key={`${item.installmentNumber}-${item.dueDate}`} className="flex justify-between gap-4"><span>{item.installmentNumber} • {datePtBr(item.dueDate)}</span><strong>{currency(item.amount)}</strong></div>)}
                  {parsed.installments.length === 0 && <p className="text-slate-500">Nenhum vencimento localizado.</p>}
                </div>
              </section>
            </div>

            <section className="rounded-2xl border border-slate-200 p-4">
              <h3 className="font-bold text-slate-950">Itens da NF — prévia simples</h3>
              <div className="mt-3 max-h-52 overflow-y-auto rounded-xl border border-slate-100">
                {parsed.items.map((item, index) => <div key={`${item.code}-${index}`} className="grid gap-2 border-b border-slate-100 px-3 py-2 text-sm last:border-0 sm:grid-cols-[100px_1fr_90px_120px]"><span>{item.code ?? '—'}</span><span className="truncate">{item.description ?? '—'}</span><span>{item.quantity ?? '—'}</span><strong>{currency(item.amount ?? 0)}</strong></div>)}
                {parsed.items.length === 0 && <p className="p-4 text-sm text-slate-500">Nenhum item localizado.</p>}
              </div>
            </section>
          </div>
        )}

        <div className="mt-6 flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
          <Button variant="secondary" onClick={onClose}>{importResult ? 'Fechar' : 'Cancelar'}</Button>
          {importResult ? <Button disabled title="Próxima etapa: confirmar categoria, tipo de documento e forma de pagamento antes de gerar os títulos.">Importar contas</Button> : <Button disabled={!canImport || mutation.isPending} onClick={() => mutation.mutate()}>{mutation.isPending ? 'Importando…' : 'Importar XML'}</Button>}
        </div>
      </div>
    </div>
  );
}