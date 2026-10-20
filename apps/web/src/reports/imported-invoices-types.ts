export interface ImportedInvoice {
  id: string; companyId: string; companyName: string; companyDocument: string;
  documentNumber: string | null; documentSeries: string | null; issueDate: string;
  supplierName: string | null; supplierDocument: string | null; accessKey: string | null;
  invoiceAmount: string | null; xmlAvailable: boolean;
}
export interface InvoiceReport {
  summary: { missingAmountCount: number; noteCount: number; invoiceAmount: string; companyCount: number; availableCount: number };
  byCompany: { companyId: string; companyName: string; noteCount: number; invoiceAmount: string }[];
  data: ImportedInvoice[]; page: number; pageSize: number;
  limits: { maxNotes: number; maxBytes: number; retentionHours: number };
}
export interface InvoiceExportPackage {
  id: string; createdAt: string; expiresAt: string; status: 'PREVIEW' | 'READY' | 'FAILED' | 'EXPIRED';
  filters: { from: string; to: string; companyId?: string; search?: string; ids?: string[] };
  companyIds: string[]; totalCount: number; includedCount: number; unavailableCount: number;
  sourceBytes: number; archiveBytes: number | null; sha256: string | null; failureCode: string | null;
  unavailable?: { id: string; documentNumber: string | null; reason: string }[];
}
export type InvoicePeriod = 'THIS_MONTH' | 'PREVIOUS_MONTH' | 'CUSTOM';
export function invoiceMonthRange(previous = false, now = new Date()): { from: string; to: string } {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit' }).formatToParts(now);
  const year = Number(parts.find(part => part.type === 'year')!.value);
  const month = Number(parts.find(part => part.type === 'month')!.value) - 1 - Number(previous);
  const start = new Date(Date.UTC(year, month, 1));
  const end = new Date(Date.UTC(year, month + 1, 0));
  return { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) };
}
export function invoiceDate(value: string): string { return value.slice(0, 10).split('-').reverse().join('/'); }
