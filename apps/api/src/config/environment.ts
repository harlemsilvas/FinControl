import { z } from 'zod';

const optionalText = z.preprocess((value) => value === '' ? undefined : value, z.string().min(1).optional());
const optionalEmail = z.preprocess((value) => value === '' ? undefined : value, z.email().optional());
const envBoolean = z.preprocess((value) => {
  if (value === undefined) return false;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value.toLowerCase() === 'true';
  return value;
}, z.boolean()).default(false);

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  API_HOST: z.string().min(1).default('127.0.0.1'),
  API_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
  DB_HOST: z.string().min(1),
  DB_PORT: z.coerce.number().int().min(1).max(65535),
  DB_NAME: z.string().min(1),
  DB_USER: z.string().min(1),
  DB_PASSWORD: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().positive().default(10),
  DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30_000),
  DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5_000),
  AUTH_ACCESS_TOKEN_SECRET: z.string().min(32),
  AUTH_ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(900),
  AUTH_REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  AUTH_ISSUER: z.string().min(1).default('fincontrol-api'),
  AUTH_AUDIENCE: z.string().min(1).default('fincontrol'),
  AUTH_PASSWORD_RESET_TTL_MINUTES: z.coerce.number().int().min(15).max(1440).default(60),
  PASSWORD_RESET_BASE_URL: z.url().default('http://localhost:5173/password-reset'),
  SMTP_ENABLED: envBoolean,
  SMTP_HOST: optionalText,
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).default(587),
  SMTP_SECURE: envBoolean,
  SMTP_USER: optionalText,
  SMTP_PASSWORD: optionalText,
  SMTP_FROM_EMAIL: optionalEmail,
  SMTP_FROM_NAME: z.string().min(1).default('FinControl'),
  ATTACHMENT_STORAGE_ROOT: z.string().min(1).default('/opt/fincontrol/storage'),
  ATTACHMENT_MAX_FILE_SIZE_BYTES: z.coerce.number().int().positive().default(10 * 1024 * 1024),
}).superRefine((environment, context) => {
  if (!environment.SMTP_ENABLED) return;
  if (!environment.SMTP_HOST) {
    context.addIssue({ code: 'custom', path: ['SMTP_HOST'], message: 'Required when SMTP_ENABLED is true' });
  }
  if (!environment.SMTP_FROM_EMAIL) {
    context.addIssue({ code: 'custom', path: ['SMTP_FROM_EMAIL'], message: 'Required when SMTP_ENABLED is true' });
  }
  if (environment.SMTP_PASSWORD && !environment.SMTP_USER) {
    context.addIssue({ code: 'custom', path: ['SMTP_USER'], message: 'Required when SMTP_PASSWORD is set' });
  }
});

export type Environment = z.infer<typeof environmentSchema>;

export function loadEnvironment(source: NodeJS.ProcessEnv = process.env): Environment {
  const result = environmentSchema.safeParse(source);

  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || 'environment'}: ${issue.message}`)
      .join('; ');
    throw new Error(`Invalid environment configuration: ${details}`);
  }

  return result.data;
}
