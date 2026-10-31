import { createHash } from 'node:crypto';
import JSZip from 'jszip';

export interface InvoiceRow extends Record<string, unknown> {
  id: string; companyId: string; companyName: string; companyDocument: string;
  documentNumber: string | null; documentSeries: string | null; issueDate: string;
  supplierName: string | null; supplierDocument: string | null; accessKey: string | null;
  invoiceAmount: string | null; sourceBytes: number; sourceHash: string | null;
  xmlAvailable: boolean; rawXml?: string | null;
}
export interface InvoiceSnapshot { id: string; fingerprint: string; available: boolean; reason: string | null }
export const sha256 = (data: string | Buffer): string => createHash('sha256').update(data).digest('hex');
export function unavailableReason(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return 'Conteúdo XML não armazenado; anexo legado exige recuperação do arquivo original.';
  const encoding = /^\uFEFF?\s*<\?xml\b[^?]*\bencoding\s*=\s*["']([^"']+)/i.exec(raw)?.[1];
  if (encoding && !/^utf-?8$/i.test(encoding)) return 'Codificação diferente de UTF-8; necessário recuperar o arquivo original.';
  if (!/<(?:[\w-]+:)?(?:NFe|nfeProc)(?:\s|>)/.test(raw)) return 'Conteúdo armazenado não identificado como XML NFe.';
  return null;
}
export function snapshot(rows: InvoiceRow[]): InvoiceSnapshot[] {
  return rows.map(row => {
    const { rawXml, ...metadata } = row;
    const reason = unavailableReason(rawXml);
    return { id: row.id, fingerprint: sha256(JSON.stringify(metadata)), available: reason === null, reason };
  });
}
function csv(value: string | null): string {
  let safe = value ?? '';
  if (/^[\s\p{Cc}]*[=+\-@]/u.test(safe)) safe = `'${safe}`;
  return `"${safe.replaceAll('"', '""')}"`;
}
export async function buildInvoiceArchive(id: string, rows: InvoiceRow[], filters: unknown, omitted: InvoiceSnapshot[]): Promise<{ bytes: Buffer; hash: string }> {
  const zip = new JSZip();
  const files: { id: string; path: string; sha256: string; bytes: number }[] = [];
  const summary = [['Empresa', 'CNPJ destinatário', 'Nota', 'Série', 'Emissão', 'Fornecedor', 'CNPJ fornecedor', 'Chave', 'Valor NFe'].map(csv).join(';')];
  for (const row of rows) {
    const reason = unavailableReason(row.rawXml);
    if (reason) throw new Error('XML_UNAVAILABLE');
    const company = row.companyDocument.replace(/\D/g, '') || row.companyId;
    const key = /^\d{44}$/.test(row.accessKey ?? '') ? row.accessKey! : row.id;
    const path = `empresa_${company}/${row.issueDate.slice(0, 7)}/xml/${key}.xml`;
    if (zip.file(path)) throw new Error('XML_ARCHIVE_NAME_COLLISION');
    const bytes = Buffer.from(row.rawXml!, 'utf8');
    zip.file(path, bytes, { date: new Date('2000-01-01T00:00:00Z') });
    files.push({ id: row.id, path, sha256: sha256(bytes), bytes: bytes.length });
    summary.push([row.companyName, row.companyDocument, row.documentNumber, row.documentSeries, row.issueDate, row.supplierName, row.supplierDocument, row.accessKey, row.invoiceAmount].map(csv).join(';'));
  }
  zip.file('resumo.csv', '\uFEFF' + summary.join('\r\n'));
  zip.file('manifesto.json', JSON.stringify({ version: 1, packageId: id, source: 'MANUAL', timezone: 'America/Sao_Paulo', filters, includedCount: files.length, omitted, files }, null, 2));
  const bytes = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
  const verified = await JSZip.loadAsync(bytes, { checkCRC32: true });
  for (const file of files) {
    const entry = verified.file(file.path);
    if (!entry || sha256(await entry.async('nodebuffer')) !== file.sha256) throw new Error('XML_ARCHIVE_VERIFICATION_FAILED');
  }
  if (Object.values(verified.files).filter(entry => !entry.dir).length !== files.length + 2) throw new Error('XML_ARCHIVE_VERIFICATION_FAILED');
  return { bytes, hash: sha256(bytes) };
}
