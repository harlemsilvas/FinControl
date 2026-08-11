import { z } from 'zod';

const schema = z.object({
  VITE_API_URL: z.string().min(1).default('/'),
  VITE_BASE_PATH: z.string().min(1).default('/'),
  VITE_APP_VERSION: z.string().min(1).default('0.1.0'),
  VITE_GIT_SHA: z.string().optional().default('dev'),
  VITE_BUILD_TIME: z.string().optional().default('local'),
  VITE_RELEASE_ID: z.string().optional().default('local'),
});
const parsed = schema.safeParse(import.meta.env);
if (!parsed.success) throw new Error(`Configuração inválida do frontend: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`);
export const environment = parsed.data;
