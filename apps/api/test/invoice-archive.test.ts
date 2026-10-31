import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { buildInvoiceArchive, sha256, snapshot, unavailableReason, type InvoiceRow } from '../src/domains/intelligence/invoice-archive.js';
const raw = '<?xml version="1.0" encoding="UTF-8"?><nfeProc><NFe><nome>Ação &amp; peças</nome></NFe></nfeProc>';
const row: InvoiceRow = { id: '11111111-1111-4111-8111-111111111111', companyId: '22222222-2222-4222-8222-222222222222', companyName: '=HYPERLINK("bad")', companyDocument: '../../123', documentNumber: '1', documentSeries: '1', issueDate: '2026-09-29', supplierName: '@fornecedor', supplierDocument: '123', accessKey: '../evil', invoiceAmount: '12.34', sourceBytes: Buffer.byteLength(raw), sourceHash: sha256(raw), xmlAvailable: true, rawXml: raw };
describe('Invoice ZIP integrity', () => {
  it('preserves UTF-8 XML bytes, uses safe server names and writes a verifiable manifest', async () => {
    const result = await buildInvoiceArchive('package', [row], { from: '2026-09-01', to: '2026-09-30' }, []);
    const zip = await JSZip.loadAsync(result.bytes, { checkCRC32: true });
    const path = `empresa_123/2026-09/xml/${row.id}.xml`;
    expect(await zip.file(path)!.async('nodebuffer')).toEqual(Buffer.from(raw));
    const manifest = JSON.parse(await zip.file('manifesto.json')!.async('string')) as { includedCount: number; files: { path: string; sha256: string }[] };
    expect(manifest.includedCount).toBe(1);
    expect(manifest.files[0]).toMatchObject({ path, sha256: sha256(raw) });
    expect(result.hash).toBe(sha256(result.bytes));
    expect(await zip.file('resumo.csv')!.async('string')).toContain('"\'=HYPERLINK(');
    expect(await zip.file('resumo.csv')!.async('string')).toContain('"\'@fornecedor"');
  });
  it('rejects collisions instead of silently overwriting invoices', async () => {
    await expect(buildInvoiceArchive('package', [row, row], {}, [])).rejects.toThrow('COLLISION');
  });
  it('identifies missing and incompatible encodings, without altering the XML declaration', () => {
    expect(unavailableReason('')).toBeTruthy();
    expect(unavailableReason(raw.replace('UTF-8', 'ISO-8859-1'))).toContain('Codificação');
    expect(unavailableReason('<html>not invoice</html>')).toBeTruthy();
    expect(unavailableReason('\uFEFF' + raw)).toBeNull();
  });
  it('captures changes in company, value, date or stored content without storing raw XML in the snapshot', () => {
    const first = snapshot([row]);
    expect(JSON.stringify(first)).not.toContain(raw);
    expect(snapshot([{ ...row, companyId: 'other' }])[0]?.fingerprint).not.toBe(first[0]?.fingerprint);
    expect(snapshot([{ ...row, invoiceAmount: '99.99' }])[0]?.fingerprint).not.toBe(first[0]?.fingerprint);
    expect(snapshot([{ ...row, sourceHash: sha256('changed') }])[0]?.fingerprint).not.toBe(first[0]?.fingerprint);
  });
});
