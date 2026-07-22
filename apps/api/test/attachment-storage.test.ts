import { mkdtemp, readFile } from 'node:fs/promises';
import { Readable } from 'node:stream';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { AttachmentStorage } from '../src/infrastructure/storage/attachment-storage.js';

describe('AttachmentStorage', () => {
  it('stores payment receipts under a private relative path with sha256 hash', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'fincontrol-attachments-'));
    const storage = new AttachmentStorage(root);
    const saved = await storage.savePaymentReceipt('payment-id', {
      filename: 'Comprovante Pagamento.pdf',
      mimetype: 'application/pdf',
      file: Readable.from(Buffer.from('receipt-content')),
    }, new Date('2026-07-22T12:00:00.000Z'));

    expect(saved.relativePath).toMatch(/^attachments\/payments\/2026\/07\/payment-id\/.+-Comprovante-Pagamento\.pdf$/);
    expect(saved.mimeType).toBe('application/pdf');
    expect(saved.sizeBytes).toBe(15);
    expect(saved.fileHash).toBe('5dab5d78bf3ecbdf2fed414232ff640660346f505372baa9e5274b876ad744e2');
    await expect(readFile(saved.absolutePath, 'utf8')).resolves.toBe('receipt-content');
  });

  it('rejects unsupported file types', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'fincontrol-attachments-'));
    const storage = new AttachmentStorage(root);
    await expect(storage.savePaymentReceipt('payment-id', {
      filename: 'script.exe',
      mimetype: 'application/x-msdownload',
      file: Readable.from(Buffer.from('nope')),
    })).rejects.toMatchObject({ code: 'ATTACHMENT_TYPE_NOT_ALLOWED', statusCode: 400 });
  });
});
