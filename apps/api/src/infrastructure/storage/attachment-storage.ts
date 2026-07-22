import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, unlink } from 'node:fs/promises';
import path from 'node:path';
import { ApplicationError } from '../../common/errors/application-error.js';

const allowedMimeTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

export interface IncomingAttachmentFile {
  filename: string;
  mimetype: string;
  file: NodeJS.ReadableStream;
}

export interface StoredAttachment {
  originalName: string;
  storedName: string;
  relativePath: string;
  absolutePath: string;
  mimeType: string;
  sizeBytes: number;
  fileHash: string;
}

export class AttachmentStorage {
  constructor(private readonly root: string) {}

  async savePaymentReceipt(paymentId: string, input: IncomingAttachmentFile, now = new Date()): Promise<StoredAttachment> {
    if (!allowedMimeTypes.has(input.mimetype)) {
      throw new ApplicationError({ code: 'ATTACHMENT_TYPE_NOT_ALLOWED', message: 'Attachment must be a PDF or image file', statusCode: 400 });
    }
    const originalName = path.basename(input.filename).slice(0, 255) || 'comprovante';
    const storedName = `${randomUUID()}-${this.safeFileName(originalName)}`.slice(0, 255);
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const relativePath = path.posix.join('attachments', 'payments', year, month, paymentId, storedName);
    const absolutePath = this.absolutePath(relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });

    const hash = createHash('sha256');
    let sizeBytes = 0;
    await new Promise<void>((resolve, reject) => {
      const output = createWriteStream(absolutePath, { flags: 'wx' });
      input.file.on('data', (chunk: Buffer) => {
        sizeBytes += chunk.length;
        hash.update(chunk);
      });
      input.file.on('error', reject);
      output.on('error', reject);
      output.on('finish', resolve);
      input.file.pipe(output);
    });
    if (sizeBytes <= 0) {
      await unlink(absolutePath).catch(() => undefined);
      throw new ApplicationError({ code: 'ATTACHMENT_EMPTY_FILE', message: 'Attachment file is empty', statusCode: 400 });
    }

    return {
      originalName,
      storedName,
      relativePath,
      absolutePath,
      mimeType: input.mimetype,
      sizeBytes,
      fileHash: hash.digest('hex'),
    };
  }

  absolutePath(relativePath: string): string {
    const resolvedRoot = path.resolve(this.root);
    const resolvedFile = path.resolve(resolvedRoot, relativePath);
    if (!resolvedFile.startsWith(`${resolvedRoot}${path.sep}`)) {
      throw new ApplicationError({ code: 'INVALID_ATTACHMENT_PATH', message: 'Invalid attachment path', statusCode: 400 });
    }
    return resolvedFile;
  }

  stream(relativePath: string): NodeJS.ReadableStream {
    return createReadStream(this.absolutePath(relativePath));
  }

  async delete(relativePath: string): Promise<void> {
    await unlink(this.absolutePath(relativePath)).catch(() => undefined);
  }

  private safeFileName(value: string): string {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'comprovante';
  }
}
