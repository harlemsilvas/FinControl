import { createReadStream } from 'node:fs';
import { access, readdir, readFile, stat } from 'node:fs/promises';
import { basename, join, resolve } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { constants } from 'node:fs';
import { ApplicationError } from '../../common/errors/application-error.js';
import type { Database } from '../../infrastructure/database/database.js';

const execFileAsync = promisify(execFile);
const backupName = /^[A-Za-z0-9._-]+\.dump$/;
const systemEntityId = '00000000-0000-0000-0000-000000000000';

export interface BackupFile {
  name: string;
  sizeBytes: number;
  createdAt: string;
  checksum: string | null;
  metadata: Record<string, unknown> | null;
}

export interface BackupContext {
  userId: string;
  ip: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

export class BackupsService {
  constructor(
    private readonly database: Database,
    private readonly backupDirectory: string,
    private readonly backupScriptPath: string,
    private readonly useSudo: boolean,
  ) {}

  async list(): Promise<{ data: BackupFile[] }> {
    const directory = resolve(this.backupDirectory);
    try {
      await access(directory, constants.R_OK);
    } catch {
      return { data: [] };
    }
    const entries = await readdir(directory);
    const files = await Promise.all(entries.filter((name) => backupName.test(name)).map((name) => this.describeFile(name)));
    return { data: files.filter((file): file is BackupFile => Boolean(file)).sort((left, right) => right.createdAt.localeCompare(left.createdAt)) };
  }

  async create(context: BackupContext): Promise<{ backup: BackupFile; output: string }> {
    const command = this.useSudo ? 'sudo' : this.backupScriptPath;
    const args = this.useSudo ? ['-n', this.backupScriptPath, 'web'] : ['web'];
    const { stdout, stderr } = await execFileAsync(command, args, { timeout: 10 * 60 * 1000, maxBuffer: 1024 * 1024 });
    const output = `${stdout}${stderr ? `\n${stderr}` : ''}`.trim();
    const match = output.match(/Backup completed:\s*(.+\.dump)/);
    const fileName = match ? basename(match[1]!) : null;
    if (!fileName || !backupName.test(fileName)) {
      throw new ApplicationError({ code: 'BACKUP_OUTPUT_INVALID', message: 'Backup completed but the generated file could not be identified', statusCode: 500 });
    }
    const backup = await this.describeFile(fileName);
    if (!backup) throw new ApplicationError({ code: 'BACKUP_NOT_FOUND', message: 'Generated backup was not found', statusCode: 500 });
    await this.audit('BACKUP_CREATED', backup.name, context);
    return { backup, output };
  }

  async file(name: string, context: BackupContext): Promise<{ stream: NodeJS.ReadableStream; file: BackupFile }> {
    if (!backupName.test(name)) throw new ApplicationError({ code: 'VALIDATION_ERROR', message: 'Invalid backup file name', statusCode: 400 });
    const file = await this.describeFile(name);
    if (!file) throw new ApplicationError({ code: 'RESOURCE_NOT_FOUND', message: 'Backup file not found', statusCode: 404 });
    await this.audit('BACKUP_EXPORTED', name, context);
    return { file, stream: createReadStream(this.resolveBackup(name)) };
  }

  private resolveBackup(name: string): string {
    const directory = resolve(this.backupDirectory);
    const target = resolve(join(directory, name));
    if (!target.startsWith(`${directory}/`)) throw new ApplicationError({ code: 'VALIDATION_ERROR', message: 'Invalid backup file name', statusCode: 400 });
    return target;
  }

  private async describeFile(name: string): Promise<BackupFile | null> {
    const target = this.resolveBackup(name);
    try {
      const info = await stat(target);
      if (!info.isFile()) return null;
      const checksum = await this.readChecksum(`${target}.sha256`);
      const metadata = await this.readMetadata(`${target}.json`);
      return { name, sizeBytes: info.size, createdAt: info.mtime.toISOString(), checksum, metadata };
    } catch {
      return null;
    }
  }

  private async readChecksum(path: string): Promise<string | null> {
    try {
      const content = await readFile(path, 'utf8');
      return content.trim().split(/\s+/)[0] ?? null;
    } catch {
      return null;
    }
  }

  private async readMetadata(path: string): Promise<Record<string, unknown> | null> {
    try {
      const parsed: unknown = JSON.parse(await readFile(path, 'utf8'));
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null;
    } catch {
      return null;
    }
  }

  private async audit(action: string, backup: string, context: BackupContext): Promise<void> {
    await this.database.query(`INSERT INTO administracao.audit_events
      (domain_code,entity_name,entity_id,action_code,new_data,user_id,source_code,ip_address,user_agent,correlation_id)
      VALUES ('DOM-004','DATABASE_BACKUP',$1,$2,$3,$4,'WEB',$5,$6,$7)`, [
      systemEntityId,
      action,
      { backup },
      context.userId,
      context.ip,
      context.userAgent,
      context.correlationId,
    ]);
  }
}
