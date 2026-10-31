import type { ImportedInvoice, InvoiceReport } from './imported-invoices-types';
import { invoiceDate } from './imported-invoices-types';
export async function importedInvoicesWorkbook(rows: ImportedInvoice[], filters: { from: string; to: string; company: string; search: string }, summary: InvoiceReport['summary']): Promise<Uint8Array> {
  const { Workbook } = await import('exceljs');
  const workbook = new Workbook();
  workbook.creator = 'FinControl';
  workbook.created = new Date();
  const sheet = workbook.addWorksheet('Notas importadas', { views: [{ state: 'frozen', ySplit: 5 }] });
  sheet.columns = [{ width: 32 }, { width: 20 }, { width: 16 }, { width: 12 }, { width: 15 }, { width: 36 }, { width: 20 }, { width: 48 }, { width: 18 }, { width: 18 }];
  const text = (value: string | null): string => /^[\s\p{Cc}]*[=+\-@]/u.test(value ?? '') ? `'${value}` : value ?? '';
  sheet.addRow(['FINCONTROL · NOTAS FISCAIS IMPORTADAS MANUALMENTE']);
  sheet.addRow([`Emissão: ${invoiceDate(filters.from)} a ${invoiceDate(filters.to)} · ${filters.company}`]);
  sheet.addRow([`Busca: ${text(filters.search)} · ${summary.noteCount} notas · Total NFe: ${summary.invoiceAmount}`]);
  sheet.addRow([]);
  sheet.addRow(['Empresa', 'CNPJ destinatário', 'Nota', 'Série', 'Emissão', 'Fornecedor', 'CNPJ fornecedor', 'Chave', 'Valor NFe', 'XML armazenado']);
  for (const row of rows) {
    const added = sheet.addRow([text(row.companyName), text(row.companyDocument), text(row.documentNumber), text(row.documentSeries), invoiceDate(row.issueDate), text(row.supplierName), text(row.supplierDocument), text(row.accessKey), row.invoiceAmount === null ? null : Number(row.invoiceAmount), row.xmlAvailable ? 'Sim' : 'Não']);
    added.getCell(9).numFmt = '"R$" #,##0.00';
  }
  sheet.getRow(5).font = { bold: true };
  sheet.autoFilter = { from: 'A5', to: 'J5' };
  return new Uint8Array(await workbook.xlsx.writeBuffer());
}
export function saveInvoiceFile(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}
