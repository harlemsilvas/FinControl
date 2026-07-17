import { Pool } from 'pg';
import { z } from 'zod';
import { hashPassword } from '../domains/auth/password.js';

const schema = z.object({
  DB_HOST: z.string().min(1), DB_PORT: z.coerce.number().int().positive(),
  DB_NAME: z.string().min(1), DB_USER: z.string().min(1), DB_PASSWORD: z.string().min(1),
  BOOTSTRAP_MASTER_NAME: z.string().min(3), BOOTSTRAP_MASTER_EMAIL: z.email(),
  BOOTSTRAP_MASTER_PASSWORD: z.string().min(12).max(200),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(`Invalid bootstrap configuration: ${parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')}`);
}
const environment = parsed.data;
const pool = new Pool({ host: environment.DB_HOST, port: environment.DB_PORT, database: environment.DB_NAME,
  user: environment.DB_USER, password: environment.DB_PASSWORD, application_name: 'fincontrol-bootstrap-master' });
const client = await pool.connect();

try {
  await client.query('BEGIN');
  const existing = await client.query<{ id: string }>(`
    SELECT id FROM administracao.users
     WHERE is_master AND is_active AND deleted_at IS NULL FOR UPDATE
  `);
  if (existing.rowCount !== 0) throw new Error('An active Master Operator already exists; bootstrap was not performed');

  const passwordHash = await hashPassword(environment.BOOTSTRAP_MASTER_PASSWORD);
  const inserted = await client.query<{ id: string }>(`
    INSERT INTO administracao.users (full_name, email, password_hash, is_master)
    VALUES ($1, lower($2), $3, true) RETURNING id
  `, [environment.BOOTSTRAP_MASTER_NAME, environment.BOOTSTRAP_MASTER_EMAIL, passwordHash]);
  const userId = inserted.rows[0]?.id;
  if (!userId) throw new Error('Master Operator could not be created');

  await client.query(`
    INSERT INTO administracao.user_roles (user_id, role_id, created_by)
    SELECT $1, id, $1 FROM administracao.roles WHERE code = 'MASTER'
  `, [userId]);
  await client.query(`
    INSERT INTO administracao.audit_events
      (domain_code, entity_name, entity_id, action_code, new_data, user_id, source_code)
    VALUES ('DOM-004', 'USER', $1, 'MASTER_BOOTSTRAPPED', $2, $1, 'CLI')
  `, [userId, JSON.stringify({ email: environment.BOOTSTRAP_MASTER_EMAIL.toLowerCase() })]);
  await client.query('COMMIT');
  process.stdout.write('Master Operator created successfully.\n');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release();
  await pool.end();
}
