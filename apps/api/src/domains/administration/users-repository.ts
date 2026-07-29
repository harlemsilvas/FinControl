import { ApplicationError } from '../../common/errors/application-error.js';
import type { Database, QueryExecutor } from '../../infrastructure/database/database.js';
import { hashPassword } from '../auth/password.js';

export interface UserCompanyInput {
  companyId: string;
  isDefault?: boolean;
  accessScope: 'OPERATIONAL' | 'VIEW_ONLY';
}

export interface UserInput {
  fullName?: string;
  email?: string;
  password?: string;
  isMaster?: boolean;
  isActive?: boolean;
  roleIds?: string[];
  companies?: UserCompanyInput[];
}

interface UserListRow extends Record<string, unknown> {
  id: string;
  full_name: string;
  email: string;
  is_master: boolean;
  is_active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
  roles: { id: string; code: string; name: string }[] | null;
  companies: { companyId: string; companyName: string; isDefault: boolean; accessScope: 'OPERATIONAL' | 'VIEW_ONLY' }[] | null;
}

interface CountRow extends Record<string, unknown> { total: string }
interface IdRow extends Record<string, unknown> { id: string }

export class UsersRepository {
  constructor(private readonly database: Database) {}

  async list(page: number, pageSize: number, filters: { search?: string; active?: boolean }): Promise<{ data: object[]; page: number; pageSize: number; total: number }> {
    const values: unknown[] = [];
    const conditions = ['u.deleted_at IS NULL'];
    if (filters.active !== undefined) {
      values.push(filters.active);
      conditions.push(`u.is_active = $${values.length}`);
    }
    if (filters.search) {
      values.push(`%${filters.search}%`);
      conditions.push(`(u.full_name ILIKE $${values.length} OR u.email ILIKE $${values.length})`);
    }
    const where = `WHERE ${conditions.join(' AND ')}`;
    const count = await this.database.query<CountRow>(`SELECT count(*)::text AS total FROM administracao.users u ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const rows = await this.database.query<UserListRow>(`
      SELECT u.id,u.full_name,u.email,u.is_master,u.is_active,u.created_at,u.updated_at,
        COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id',r.id,'code',r.code,'name',r.name)) FILTER (WHERE r.id IS NOT NULL),'[]'::jsonb) AS roles,
        COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
          'companyId',c.id,
          'companyName',COALESCE(NULLIF(c.trade_name,''),c.legal_name),
          'isDefault',uc.is_default,
          'accessScope',uc.access_scope
        )) FILTER (WHERE c.id IS NOT NULL),'[]'::jsonb) AS companies
      FROM administracao.users u
      LEFT JOIN administracao.user_roles ur ON ur.user_id=u.id
      LEFT JOIN administracao.roles r ON r.id=ur.role_id
      LEFT JOIN administracao.user_companies uc ON uc.user_id=u.id AND uc.is_active AND uc.deleted_at IS NULL
      LEFT JOIN cadastros.companies c ON c.id=uc.company_id AND c.deleted_at IS NULL
      ${where}
      GROUP BY u.id
      ORDER BY u.full_name,u.email
      LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { data: rows.rows.map((row) => this.toApi(row)), page, pageSize, total: Number(count.rows[0]?.total ?? 0) };
  }

  async roles(): Promise<object[]> {
    const result = await this.database.query(`
      SELECT id,code,name,description,is_active
      FROM administracao.roles
      WHERE is_active
      ORDER BY name,code`);
    return result.rows.map((row) => ({
      id: row.id, code: row.code, name: row.name, description: row.description, isActive: row.is_active,
    }));
  }

  async findById(id: string): Promise<object | null> {
    const result = await this.database.query<UserListRow>(`
      SELECT u.id,u.full_name,u.email,u.is_master,u.is_active,u.created_at,u.updated_at,
        COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id',r.id,'code',r.code,'name',r.name)) FILTER (WHERE r.id IS NOT NULL),'[]'::jsonb) AS roles,
        COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
          'companyId',c.id,
          'companyName',COALESCE(NULLIF(c.trade_name,''),c.legal_name),
          'isDefault',uc.is_default,
          'accessScope',uc.access_scope
        )) FILTER (WHERE c.id IS NOT NULL),'[]'::jsonb) AS companies
      FROM administracao.users u
      LEFT JOIN administracao.user_roles ur ON ur.user_id=u.id
      LEFT JOIN administracao.roles r ON r.id=ur.role_id
      LEFT JOIN administracao.user_companies uc ON uc.user_id=u.id AND uc.deleted_at IS NULL
      LEFT JOIN cadastros.companies c ON c.id=uc.company_id
      WHERE u.id=$1 AND u.deleted_at IS NULL
      GROUP BY u.id`, [id]);
    return result.rows[0] ? this.toApi(result.rows[0]) : null;
  }

  async create(input: UserInput, actorId: string): Promise<object> {
    return this.database.transaction(async (tx) => {
      if (!input.isMaster && !(input.companies?.length)) {
        throw new ApplicationError({ code: 'USER_COMPANY_REQUIRED', message: 'Non-master users must be linked to at least one company', statusCode: 400 });
      }
      await this.assertUserInput(tx, input);
      const passwordHash = input.password ? await hashPassword(input.password) : null;
      const result = await tx.query<IdRow>(`
        INSERT INTO administracao.users
          (full_name,email,password_hash,is_master,is_active,created_by,updated_by)
        VALUES ($1,lower($2),$3,$4,$5,$6,$6)
        RETURNING id`,
      [input.fullName!, input.email!, passwordHash, input.isMaster ?? false, input.isActive ?? true, actorId]);
      const id = result.rows[0]?.id;
      if (!id) throw new Error('Failed to create user');
      await this.replaceRoles(tx, id, input.roleIds ?? [], actorId);
      await this.replaceCompanies(tx, id, input.companies ?? [], actorId);
      await this.audit(tx, 'USER_CREATED', id, actorId, null, input);
      return this.findByIdWithExecutor(tx, id);
    });
  }

  async update(id: string, input: UserInput, actorId: string): Promise<object | null> {
    return this.database.transaction(async (tx) => {
      const current = await tx.query<IdRow>('SELECT id FROM administracao.users WHERE id=$1 AND deleted_at IS NULL', [id]);
      if (!current.rowCount) return null;
      if (id === actorId && input.isActive === false) {
        throw new ApplicationError({ code: 'SELF_DEACTIVATE_BLOCKED', message: 'User cannot deactivate their own account', statusCode: 409 });
      }
      await this.assertUserInput(tx, input);
      const assignments: string[] = [];
      const values: unknown[] = [];
      const set = (column: string, value: unknown): void => {
        values.push(value);
        assignments.push(`${column}=$${values.length}`);
      };
      if (input.fullName !== undefined) set('full_name', input.fullName);
      if (input.email !== undefined) set('email', input.email.toLowerCase());
      if (input.password) set('password_hash', await hashPassword(input.password));
      if (input.isMaster !== undefined) set('is_master', input.isMaster);
      if (input.isActive !== undefined) set('is_active', input.isActive);
      set('updated_by', actorId);
      values.push(id);
      if (assignments.length) await tx.query(`UPDATE administracao.users SET ${assignments.join(', ')} WHERE id=$${values.length}`, values);
      if (input.roleIds !== undefined) await this.replaceRoles(tx, id, input.roleIds, actorId);
      if (input.companies !== undefined) await this.replaceCompanies(tx, id, input.companies, actorId);
      await this.audit(tx, 'USER_UPDATED', id, actorId, null, input);
      return this.findByIdWithExecutor(tx, id);
    });
  }

  async deactivate(id: string, actorId: string): Promise<object | null> {
    if (id === actorId) throw new ApplicationError({ code: 'SELF_DEACTIVATE_BLOCKED', message: 'User cannot deactivate their own account', statusCode: 409 });
    const result = await this.database.query(`
      UPDATE administracao.users
      SET is_active=false,updated_by=$2
      WHERE id=$1 AND deleted_at IS NULL
      RETURNING id`, [id, actorId]);
    if (!result.rowCount) return null;
    await this.audit(this.database, 'USER_DEACTIVATED', id, actorId, null, null);
    return this.findById(id);
  }

  async reactivate(id: string, actorId: string): Promise<object | null> {
    const result = await this.database.query(`
      UPDATE administracao.users
      SET is_active=true,deleted_at=NULL,deleted_by=NULL,updated_by=$2
      WHERE id=$1
      RETURNING id`, [id, actorId]);
    if (!result.rowCount) return null;
    await this.audit(this.database, 'USER_REACTIVATED', id, actorId, null, null);
    return this.findById(id);
  }

  private async assertUserInput(tx: QueryExecutor, input: UserInput): Promise<void> {
    if (input.roleIds) {
      const uniqueRoleIds = [...new Set(input.roleIds)];
      const roles = await tx.query<CountRow>('SELECT count(*)::text AS total FROM administracao.roles WHERE id = ANY($1::uuid[]) AND is_active', [uniqueRoleIds]);
      if (Number(roles.rows[0]?.total ?? 0) !== uniqueRoleIds.length) {
        throw new ApplicationError({ code: 'INVALID_REFERENCE', message: 'Role must be active', statusCode: 400, details: { field: 'roleIds' } });
      }
    }
    if (input.companies) {
      const companies = this.normalizeCompanies(input.companies);
      const companyIds = companies.map((item) => item.companyId);
      if (companyIds.length) {
        const result = await tx.query<CountRow>('SELECT count(*)::text AS total FROM cadastros.companies WHERE id = ANY($1::uuid[]) AND is_active AND deleted_at IS NULL', [companyIds]);
        if (Number(result.rows[0]?.total ?? 0) !== companyIds.length) {
          throw new ApplicationError({ code: 'INVALID_REFERENCE', message: 'Company must be active', statusCode: 400, details: { field: 'companies' } });
        }
      }
      if (!input.isMaster && companies.length === 0) {
        throw new ApplicationError({ code: 'USER_COMPANY_REQUIRED', message: 'Non-master users must be linked to at least one company', statusCode: 400 });
      }
    }
  }

  private async replaceRoles(tx: QueryExecutor, userId: string, roleIds: string[], actorId: string): Promise<void> {
    await tx.query('DELETE FROM administracao.user_roles WHERE user_id=$1', [userId]);
    const uniqueRoleIds = [...new Set(roleIds)];
    if (!uniqueRoleIds.length) return;
    const values: unknown[] = [];
    const tuples = uniqueRoleIds.map((roleId, index) => {
      values.push(userId, roleId, actorId);
      const base = index * 3;
      return `($${base + 1},$${base + 2},$${base + 3})`;
    });
    await tx.query(`INSERT INTO administracao.user_roles (user_id,role_id,created_by) VALUES ${tuples.join(',')}`, values);
  }

  private async replaceCompanies(tx: QueryExecutor, userId: string, companies: UserCompanyInput[], actorId: string): Promise<void> {
    await tx.query('UPDATE administracao.user_companies SET is_active=false,deleted_at=CURRENT_TIMESTAMP,deleted_by=$2,updated_by=$2 WHERE user_id=$1 AND deleted_at IS NULL', [userId, actorId]);
    const normalized = this.normalizeCompanies(companies);
    if (!normalized.length) return;
    const values: unknown[] = [];
    const tuples = normalized.map((company, index) => {
      values.push(userId, company.companyId, company.isDefault, company.accessScope, actorId);
      const base = index * 5;
      return `($${base + 1},$${base + 2},$${base + 3},$${base + 4},true,CURRENT_TIMESTAMP,$${base + 5},CURRENT_TIMESTAMP,$${base + 5},NULL,NULL)`;
    });
    await tx.query(`
      INSERT INTO administracao.user_companies
        (user_id,company_id,is_default,access_scope,is_active,created_at,created_by,updated_at,updated_by,deleted_at,deleted_by)
      VALUES ${tuples.join(',')}
      ON CONFLICT (user_id, company_id) DO UPDATE SET
        is_default=EXCLUDED.is_default,
        access_scope=EXCLUDED.access_scope,
        is_active=true,
        updated_at=CURRENT_TIMESTAMP,
        updated_by=EXCLUDED.updated_by,
        deleted_at=NULL,
        deleted_by=NULL`, values);
  }

  private normalizeCompanies(companies: UserCompanyInput[]): UserCompanyInput[] {
    const unique = new Map<string, UserCompanyInput>();
    for (const company of companies) unique.set(company.companyId, company);
    const normalized = [...unique.values()];
    const defaultIndex = Math.max(0, normalized.findIndex((item) => item.isDefault));
    return normalized.map((item, index) => ({ ...item, isDefault: index === defaultIndex }));
  }

  private async findByIdWithExecutor(tx: QueryExecutor, id: string): Promise<object> {
    const result = await tx.query<UserListRow>(`
      SELECT u.id,u.full_name,u.email,u.is_master,u.is_active,u.created_at,u.updated_at,
        COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id',r.id,'code',r.code,'name',r.name)) FILTER (WHERE r.id IS NOT NULL),'[]'::jsonb) AS roles,
        COALESCE(jsonb_agg(DISTINCT jsonb_build_object(
          'companyId',c.id,
          'companyName',COALESCE(NULLIF(c.trade_name,''),c.legal_name),
          'isDefault',uc.is_default,
          'accessScope',uc.access_scope
        )) FILTER (WHERE c.id IS NOT NULL),'[]'::jsonb) AS companies
      FROM administracao.users u
      LEFT JOIN administracao.user_roles ur ON ur.user_id=u.id
      LEFT JOIN administracao.roles r ON r.id=ur.role_id
      LEFT JOIN administracao.user_companies uc ON uc.user_id=u.id AND uc.is_active AND uc.deleted_at IS NULL
      LEFT JOIN cadastros.companies c ON c.id=uc.company_id AND c.deleted_at IS NULL
      WHERE u.id=$1
      GROUP BY u.id`, [id]);
    const row = result.rows[0];
    if (!row) throw new Error('User not found after write');
    return this.toApi(row);
  }

  private toApi(row: UserListRow): object {
    const roles = Array.isArray(row.roles) ? row.roles : [];
    const companies = Array.isArray(row.companies) ? row.companies : [];
    return {
      id: row.id,
      fullName: row.full_name,
      email: row.email,
      isMaster: row.is_master,
      isActive: row.is_active,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      roles,
      roleIds: roles.map((role) => role.id),
      companies,
    };
  }

  private async audit(tx: QueryExecutor, action: string, entityId: string, userId: string, previousData: object | null, newData: object | null): Promise<void> {
    await tx.query(`
      INSERT INTO administracao.audit_events
        (domain_code,entity_name,entity_id,action_code,previous_data,new_data,user_id,source_code)
      VALUES ('DOM-004','USER',$1,$2,$3,$4,$5,'API')`,
    [entityId, action, previousData ? JSON.stringify(previousData) : null, newData ? JSON.stringify(newData) : null, userId]);
  }
}
