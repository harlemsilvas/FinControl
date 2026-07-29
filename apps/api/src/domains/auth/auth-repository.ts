import type { Database } from '../../infrastructure/database/database.js';

export interface AuthUser {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string | null;
  isMaster: boolean;
  roles: string[];
  permissions: string[];
  companies: AuthCompany[];
  defaultCompanyId: string | null;
}

export interface AuthCompany {
  id: string;
  legalName: string;
  tradeName: string | null;
  documentNumber: string;
  companyType: 'MAIN' | 'BRANCH';
  isDefault: boolean;
  accessScope: 'OPERATIONAL' | 'VIEW_ONLY';
}

export interface RequestContext {
  ip: string | null;
  userAgent: string | null;
  correlationId: string | null;
}

export interface PasswordResetUser {
  id: string;
  fullName: string;
  email: string;
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

interface CompanyRow extends Record<string, unknown> {
  id: string;
  legal_name: string;
  trade_name: string | null;
  document_number: string;
  company_type: 'MAIN' | 'BRANCH';
  is_default: boolean;
  access_scope: 'OPERATIONAL' | 'VIEW_ONLY';
}

interface PasswordResetUserRow extends Record<string, unknown> {
  id: string;
  full_name: string;
  email: string;
}

interface PasswordResetTokenRow extends Record<string, unknown> {
  id: string;
  user_id: string;
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
    return result.rows[0] ? this.mapUserWithCompanies(result.rows[0]) : null;
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
    return result.rows[0] ? this.mapUserWithCompanies(result.rows[0]) : null;
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

  async findPasswordResetUserByEmail(email: string): Promise<PasswordResetUser | null> {
    const result = await this.database.query<PasswordResetUserRow>(`
      SELECT id, full_name, email
        FROM administracao.users
       WHERE lower(email) = lower($1)
         AND is_active
         AND deleted_at IS NULL
    `, [email]);
    return result.rows[0] ? this.mapPasswordResetUser(result.rows[0]) : null;
  }

  async findPasswordResetUserById(id: string): Promise<PasswordResetUser | null> {
    const result = await this.database.query<PasswordResetUserRow>(`
      SELECT id, full_name, email
        FROM administracao.users
       WHERE id = $1
         AND is_active
         AND deleted_at IS NULL
    `, [id]);
    return result.rows[0] ? this.mapPasswordResetUser(result.rows[0]) : null;
  }

  async createPasswordResetRequest(
    user: PasswordResetUser,
    tokenHash: string,
    expiresAt: Date,
    resetUrl: string,
    context: RequestContext,
    createdBy: string | null,
  ): Promise<void> {
    await this.database.transaction(async (tx) => {
      const token = await tx.query<PasswordResetTokenRow>(`
        INSERT INTO administracao.password_reset_tokens
          (user_id, token_hash, expires_at, requested_ip, user_agent, created_by)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, user_id
      `, [user.id, tokenHash, expiresAt, context.ip, context.userAgent, createdBy]);

      const tokenId = token.rows[0]?.id;
      if (!tokenId) throw new Error('Failed to create password reset token');

      await tx.query(`
        INSERT INTO administracao.email_outbox
          (recipient_email, recipient_name, subject, body_text, body_html,
           related_entity_name, related_entity_id, metadata, created_by)
        VALUES ($1, $2, $3, $4, $5, 'PASSWORD_RESET', $6, $7, $8)
      `, [
        user.email,
        user.fullName,
        'Redefinicao de senha do FinControl',
        this.passwordResetText(user.fullName, resetUrl, expiresAt),
        this.passwordResetHtml(user.fullName, resetUrl, expiresAt),
        tokenId,
        JSON.stringify({ userId: user.id, expiresAt: expiresAt.toISOString() }),
        createdBy,
      ]);
    });
  }

  async consumePasswordResetToken(tokenHash: string, passwordHash: string, context: RequestContext): Promise<boolean> {
    return this.database.transaction(async (tx) => {
      const token = await tx.query<PasswordResetTokenRow>(`
        SELECT prt.id, prt.user_id
          FROM administracao.password_reset_tokens prt
          JOIN administracao.users u ON u.id = prt.user_id
         WHERE prt.token_hash = $1
           AND prt.used_at IS NULL
           AND prt.expires_at > CURRENT_TIMESTAMP
           AND u.is_active
           AND u.deleted_at IS NULL
         FOR UPDATE OF prt
      `, [tokenHash]);

      const row = token.rows[0];
      if (!row) {
        await tx.query(`
          INSERT INTO administracao.audit_events
            (domain_code, entity_name, entity_id, action_code, user_id, source_code, ip_address, user_agent, correlation_id)
          VALUES ('DOM-004', 'AUTHENTICATION', '00000000-0000-0000-0000-000000000000', 'PASSWORD_RESET_FAILED', NULL, 'API', $1, $2, $3)
        `, [context.ip, context.userAgent, context.correlationId]);
        return false;
      }

      await tx.query(`
        UPDATE administracao.users
           SET password_hash = $2, updated_at = CURRENT_TIMESTAMP, updated_by = $1
         WHERE id = $1
      `, [row.user_id, passwordHash]);
      await tx.query('UPDATE administracao.password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE id = $1', [row.id]);
      await tx.query(`
        UPDATE administracao.auth_sessions
           SET revoked_at = CURRENT_TIMESTAMP, revoked_reason = 'PASSWORD_RESET'
         WHERE user_id = $1 AND revoked_at IS NULL
      `, [row.user_id]);
      await tx.query(`
        INSERT INTO administracao.audit_events
          (domain_code, entity_name, entity_id, action_code, new_data, user_id, source_code, ip_address, user_agent, correlation_id)
        VALUES ('DOM-004', 'AUTHENTICATION', $1, 'PASSWORD_RESET_COMPLETED', $2, $1, 'API', $3, $4, $5)
      `, [row.user_id, JSON.stringify({ resetTokenId: row.id }), context.ip, context.userAgent, context.correlationId]);
      return true;
    });
  }

  async audit(action: string, entityId: string, userId: string | null, context: RequestContext, data?: object): Promise<void> {
    await this.database.query(`
      INSERT INTO administracao.audit_events
        (domain_code, entity_name, entity_id, action_code, new_data, user_id, source_code, ip_address, user_agent, correlation_id)
      VALUES ('DOM-004', 'AUTHENTICATION', $1, $2, $3, $4, 'API', $5, $6, $7)
    `, [entityId, action, data ? JSON.stringify(data) : null, userId, context.ip, context.userAgent, context.correlationId]);
  }

  private async mapUserWithCompanies(row: UserRow): Promise<AuthUser> {
    const availableCompanies = await this.listCompanies(row.id, row.is_master);
    const defaultCompanyId = availableCompanies.find((company) => company.isDefault)?.id ?? availableCompanies[0]?.id ?? null;
    const companies = availableCompanies.map((company) => ({ ...company, isDefault: company.id === defaultCompanyId }));
    return { ...this.mapUser(row), companies, defaultCompanyId };
  }

  private mapPasswordResetUser(row: PasswordResetUserRow): PasswordResetUser {
    return { id: row.id, fullName: row.full_name, email: row.email };
  }

  private passwordResetText(name: string, resetUrl: string, expiresAt: Date): string {
    return [
      `Ola, ${name}.`,
      '',
      'Recebemos uma solicitacao para redefinir sua senha do FinControl.',
      `Acesse o link abaixo ate ${expiresAt.toISOString()}:`,
      resetUrl,
      '',
      'Se voce nao solicitou esta alteracao, ignore esta mensagem.',
    ].join('\n');
  }

  private passwordResetHtml(name: string, resetUrl: string, expiresAt: Date): string {
    const safeName = this.escapeHtml(name);
    const safeUrl = this.escapeHtml(resetUrl);
    return `<p>Ola, ${safeName}.</p><p>Recebemos uma solicitacao para redefinir sua senha do FinControl.</p><p><a href="${safeUrl}">Redefinir senha</a></p><p>Valido ate ${expiresAt.toISOString()}.</p><p>Se voce nao solicitou esta alteracao, ignore esta mensagem.</p>`;
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    })[char] ?? char);
  }

  private mapUser(row: UserRow): Omit<AuthUser, 'companies' | 'defaultCompanyId'> {
    return {
      id: row.id, fullName: row.full_name, email: row.email,
      passwordHash: row.password_hash, isMaster: row.is_master,
      roles: row.roles ?? [], permissions: row.permissions ?? [],
    };
  }

  private async listCompanies(userId: string, isMaster: boolean): Promise<AuthCompany[]> {
    const result = isMaster
      ? await this.database.query<CompanyRow>(`
        SELECT c.id, c.legal_name, c.trade_name, c.document_number, c.company_type,
               false AS is_default, 'OPERATIONAL'::varchar(30) AS access_scope
          FROM cadastros.companies c
         WHERE c.is_active AND c.deleted_at IS NULL
         ORDER BY c.company_type, c.legal_name, c.id
      `)
      : await this.database.query<CompanyRow>(`
        SELECT c.id, c.legal_name, c.trade_name, c.document_number, c.company_type,
               uc.is_default, uc.access_scope
          FROM administracao.user_companies uc
          JOIN cadastros.companies c ON c.id = uc.company_id
         WHERE uc.user_id = $1
           AND uc.is_active AND uc.deleted_at IS NULL
           AND c.is_active AND c.deleted_at IS NULL
         ORDER BY uc.is_default DESC, c.company_type, c.legal_name, c.id
      `, [userId]);

    return result.rows.map((row) => ({
      id: row.id,
      legalName: row.legal_name,
      tradeName: row.trade_name,
      documentNumber: row.document_number,
      companyType: row.company_type,
      isDefault: row.is_default,
      accessScope: row.access_scope,
    }));
  }
}
