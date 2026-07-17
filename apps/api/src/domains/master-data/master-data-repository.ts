import type { Database } from '../../infrastructure/database/database.js';

export interface ResourceDefinition {
  domain: 'DOM-001' | 'DOM-003';
  entity: string;
  table: string;
  columns: Record<string, string>;
  searchColumns: string[];
  hasSoftDelete: boolean;
  orderBy: string;
}

interface CountRow extends Record<string, unknown> { total: string }

export class MasterDataRepository {
  constructor(private readonly database: Database) {}

  async list(definition: ResourceDefinition, page: number, pageSize: number, search?: string,
    active?: boolean): Promise<{ data: Record<string, unknown>[]; page: number; pageSize: number; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    if (definition.hasSoftDelete) conditions.push('deleted_at IS NULL');
    if (active !== undefined) { values.push(active); conditions.push(`is_active = $${values.length}`); }
    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(${definition.searchColumns.map((column) => `${column} ILIKE $${values.length}`).join(' OR ')})`);
    }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const count = await this.database.query<CountRow>(`SELECT count(*)::text AS total FROM ${definition.table} ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const rows = await this.database.query(`SELECT * FROM ${definition.table} ${where}
      ORDER BY ${definition.orderBy} LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return { data: rows.rows.map((row) => this.toApi(definition, row)), page, pageSize,
      total: Number(count.rows[0]?.total ?? 0) };
  }

  async findById(definition: ResourceDefinition, id: string): Promise<Record<string, unknown> | null> {
    const result = await this.database.query(`SELECT * FROM ${definition.table} WHERE id = $1${
      definition.hasSoftDelete ? ' AND deleted_at IS NULL' : ''}`, [id]);
    return result.rows[0] ? this.toApi(definition, result.rows[0]) : null;
  }

  async create(definition: ResourceDefinition, data: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
    const entries = this.entries(definition, data);
    if ('createdBy' in definition.columns) entries.push([definition.columns.createdBy, userId]);
    if ('updatedBy' in definition.columns) entries.push([definition.columns.updatedBy, userId]);
    const values = entries.map((entry) => entry[1]);
    const result = await this.database.query(`INSERT INTO ${definition.table}
      (${entries.map((entry) => entry[0]).join(', ')}) VALUES (${values.map((_, index) => `$${index + 1}`).join(', ')}) RETURNING *`, values);
    const row = result.rows[0];
    if (!row) throw new Error(`Failed to create ${definition.entity}`);
    return this.toApi(definition, row);
  }

  async update(definition: ResourceDefinition, id: string, data: Record<string, unknown>, userId: string): Promise<Record<string, unknown> | null> {
    const entries = this.entries(definition, data);
    if ('updatedBy' in definition.columns) entries.push([definition.columns.updatedBy, userId]);
    if (entries.length === 0) return this.findById(definition, id);
    const values = entries.map((entry) => entry[1]);
    values.push(id);
    const result = await this.database.query(`UPDATE ${definition.table} SET ${entries.map((entry, index) => `${entry[0]} = $${index + 1}`).join(', ')}
      WHERE id = $${values.length}${definition.hasSoftDelete ? ' AND deleted_at IS NULL' : ''} RETURNING *`, values);
    return result.rows[0] ? this.toApi(definition, result.rows[0]) : null;
  }

  async deactivate(definition: ResourceDefinition, id: string, userId: string): Promise<Record<string, unknown> | null> {
    const assignments = ['is_active = false'];
    const values: unknown[] = [id];
    if (definition.hasSoftDelete) {
      assignments.push('deleted_at = CURRENT_TIMESTAMP');
      if ('deletedBy' in definition.columns) { values.push(userId); assignments.push(`deleted_by = $${values.length}`); }
    }
    if ('updatedBy' in definition.columns) { values.push(userId); assignments.push(`updated_by = $${values.length}`); }
    const result = await this.database.query(`UPDATE ${definition.table} SET ${assignments.join(', ')}
      WHERE id = $1${definition.hasSoftDelete ? ' AND deleted_at IS NULL' : ''} RETURNING *`, values);
    return result.rows[0] ? this.toApi(definition, result.rows[0]) : null;
  }

  async audit(definition: ResourceDefinition, action: string, entityId: string, userId: string,
    previousData: object | null, newData: object | null): Promise<void> {
    await this.database.query(`INSERT INTO administracao.audit_events
      (domain_code, entity_name, entity_id, action_code, previous_data, new_data, user_id, source_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'API')`,
    [definition.domain, definition.entity, entityId, action,
      previousData ? JSON.stringify(previousData) : null, newData ? JSON.stringify(newData) : null, userId]);
  }

  private entries(definition: ResourceDefinition, data: Record<string, unknown>): [string, unknown][] {
    return Object.entries(data).filter(([, value]) => value !== undefined)
      .map(([key, value]) => [definition.columns[key]!, value] as [string, unknown])
      .filter(([column]) => column !== undefined);
  }

  private toApi(definition: ResourceDefinition, row: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(Object.entries(definition.columns)
      .filter(([key]) => !['createdBy', 'updatedBy', 'deletedBy'].includes(key))
      .map(([key, column]) => [key, row[column]]));
  }
}
