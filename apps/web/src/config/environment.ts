import { z } from 'zod';

const schema = z.object({
  VITE_API_URL: z.string().min(1).default('/'),
  VITE_BASE_PATH: z.string().min(1).default('/'),
});
const parsed = schema.safeParse(import.meta.env);
if (!parsed.success) throw new Error(`Configuração inválida do frontend: ${parsed.error.issues.map((issue) => issue.message).join('; ')}`);
export const environment = parsed.data;
