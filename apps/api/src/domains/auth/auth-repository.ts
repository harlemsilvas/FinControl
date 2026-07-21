import type { Database } from '../../infrastructure/database/database.js';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string | null;
  isMaster: boolean;
  roles: string[];
  permissions: string[];
}

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

interface UserRow extends Record<string, unknown> {
  id: string;
  full_name: string;
  email: string;
  password_hash: string | null;
  is_master: boolean;
  roles: string[] | null;
  permissions: string[] | null;
}

export class AuthRepository {
  constructor(private readonly database: Database) {}

  async findActiveUserByEmail(email: string): Promise<AuthUser | null> {
    const result = await this.database.query<UserRow>(`
      SELECT u.id, u.full_name, u.email, u.password_hash, u.is_master,
             COALESCE(array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles,
             COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '{}') AS permissions
      FROM administracao.users u
      LEFT JOIN administracao.user_roles ur ON ur.user_id = u.id
      LEFT JOIN administracao.roles r ON r.id = ur.role_id AND r.is_active
      LEFT JOIN administracao.role_permissions rp ON rp.role_id = r.id
      LEFT JOIN administracao.permissions p ON p.id = rp.permission_id AND p.is_active
      WHERE lower(u.email) = lower($1) AND u.is_active AND u.deleted_at IS NULL
      GROUP BY u.id
    `, [email]);
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async findActiveUserById(id: string): Promise<AuthUser | null> {
    const result = await this.database.query<UserRow>(`
      SELECT u.id, u.full_name, u.email, u.password_hash, u.is_master,
             COALESCE(array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL), '{}') AS roles,
             COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), '{}') AS permissions
      FROM administracao.users u
      LEFT JOIN administracao.user_roles ur ON ur.user_id = u.id
      LEFT JOIN administracao.roles r ON r.id = ur.role_id AND r.is_active
      LEFT JOIN administracao.role_permissions rp ON rp.role_id = r.id
      LEFT JOIN administracao.permissions p ON p.id = rp.permission_id AND p.is_active
      WHERE u.id = $1 AND u.is_active AND u.deleted_at IS NULL
      GROUP BY u.id
    `, [id]);
    return result.rows[0] ? this.mapUser(result.rows[0]) : null;
  }

  async createSession(userId: string, tokenHash: string, expiresAt: Date, context: RequestContext): Promise<string> {
    const result = await this.database.query<{ id: string } & Record<string, unknown>>(`
      INSERT INTO administracao.auth_sessions
        (user_id, refresh_token_hash, expires_at, created_ip, user_agent)
      VALUES ($1, $2, $3, $4, $5) RETURNING id
    `, [userId, tokenHash, expiresAt, context.ip, context.userAgent]);
    const row = result.rows[0];
    if (!row) throw new Error('Failed to create authentication session');
    return row.id;
  }

  async rotateSession(oldHash: string, newHash: string, expiresAt: Date): Promise<{ sessionId: string; userId: string } | null> {
    const result = await this.database.query<{ session_id: string; user_id: string } & Record<string, unknown>>(`
      WITH revoked AS (
        UPDATE administracao.auth_sessions
           SET revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'ROTATED', last_used_at = CURRENT_TIMESTAMP
         WHERE refresh_token_hash = $1 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
         RETURNING id, user_id, created_ip, user_agent
      ), inserted AS (
        INSERT INTO administracao.auth_sessions
          (user_id, refresh_token_hash, expires_at, created_ip, user_agent)
        SELECT user_id, $2, $3, created_ip, user_agent FROM revoked
        RETURNING id, user_id
      )
      SELECT id AS session_id, user_id FROM inserted
    `, [oldHash, newHash, expiresAt]);
    const row = result.rows[0];
    return row ? { sessionId: row.session_id, userId: row.user_id } : null;
  }

  async isSessionActive(sessionId: string, userId: string): Promise<boolean> {
    const result = await this.database.query(`
      SELECT 1 FROM administracao.auth_sessions
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL AND expires_at > CURRENT_TIMESTAMP
    `, [sessionId, userId]);
    return result.rowCount === 1;
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    await this.database.query(`
      UPDATE administracao.auth_sessions
         SET revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'LOGOUT'
       WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL
    `, [sessionId, userId]);
  }

  async audit(action: string, entityId: string, userId: string | null, context: RequestContext, data?: object): Promise<void> {
    await this.database.query(`
      INSERT INTO administracao.audit_events
        (domain_code, entity_name, entity_id, action_code, new_data, user_id, source_code, ip_address, user_agent, correlation_id)
      VALUES ('DOM-004', 'AUTHENTICATION', $1, $2, $3, $4, 'API', $5, $6, $7)
    `, [entityId, action, data ? JSON.stringify(data) : null, userId, context.ip, context.userAgent, context.correlationId]);
  }

  private mapUser(row: UserRow): AuthUser {
    return {
      id: row.id, fullName: row.full_name, email: row.email,
      passwordHash: row.password_hash, isMaster: row.is_master,
      roles: row.roles ?? [], permissions: row.permissions ?? [],
    };
  }
}
