import type { Database, QueryExecutor } from '../../infrastructure/database/database.js';
import { ApplicationError } from '../../common/errors/application-error.js';

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

    if (active === true) {
      if (definition.hasSoftDelete) conditions.push('deleted_at IS NULL');
      values.push(true);
      conditions.push(`is_active = $${values.length}`);
    } else if (active === false) {
      values.push(false);
      conditions.push(`is_active = $${values.length}`);
    } else if (!definition.hasSoftDelete) {
      conditions.push('1 = 1');
    }

    if (search) {
      values.push(`%${search}%`);
      conditions.push(`(${definition.searchColumns.map((column) => `${column} ILIKE $${values.length}`).join(' OR ')})`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const count = await this.database.query<CountRow>(`SELECT count(*)::text AS total FROM ${definition.table} ${where}`, values);
    values.push(pageSize, (page - 1) * pageSize);
    const rows = await this.database.query(`SELECT * FROM ${definition.table} ${where}
      ORDER BY ${definition.orderBy} LIMIT $${values.length - 1} OFFSET $${values.length}`, values);
    return {
      data: await Promise.all(rows.rows.map(async (row) => this.toApi(definition, row))),
      page,
      pageSize,
      total: Number(count.rows[0]?.total ?? 0),
    };
  }

  async findById(definition: ResourceDefinition, id: string, includeInactive = false): Promise<Record<string, unknown> | null> {
    const conditions = ['id = $1'];
    if (definition.hasSoftDelete && !includeInactive) conditions.push('deleted_at IS NULL');
    const result = await this.database.query(`SELECT * FROM ${definition.table} WHERE ${conditions.join(' AND ')}`, [id]);
    return result.rows[0] ? this.toApi(definition, result.rows[0]) : null;
  }

  async create(definition: ResourceDefinition, data: Record<string, unknown>, userId: string): Promise<Record<string, unknown>> {
    const createData = await this.withSupplierMutationData(definition, data, true);
    const entries = this.entries(definition, createData);
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
    const updateData = await this.withSupplierMutationData(definition, data, false);
    const entries = this.entries(definition, updateData);
    if ('updatedBy' in definition.columns) entries.push([definition.columns.updatedBy, userId]);
    if (entries.length === 0) return this.findById(definition, id, true);
    const values = entries.map((entry) => entry[1]);
    values.push(id);
    const result = await this.database.query(`UPDATE ${definition.table} SET ${entries.map((entry, index) => `${entry[0]} = $${index + 1}`).join(', ')}
      WHERE id = $${values.length} RETURNING *`, values);
    return result.rows[0] ? this.toApi(definition, result.rows[0]) : null;
  }

  async deactivate(definition: ResourceDefinition, id: string, userId: string): Promise<Record<string, unknown> | null> {
    const assignments = ['is_active = false'];
    const values: unknown[] = [id];
    if (definition.hasSoftDelete) {
      assignments.push('deleted_at = CURRENT_TIMESTAMP');
      if ('deletedBy' in definition.columns) {
        values.push(userId);
        assignments.push(`deleted_by = $${values.length}`);
      }
    }
    if ('updatedBy' in definition.columns) {
      values.push(userId);
      assignments.push(`updated_by = $${values.length}`);
    }
    const result = await this.database.query(`UPDATE ${definition.table} SET ${assignments.join(', ')}
      WHERE id = $1${definition.hasSoftDelete ? ' AND deleted_at IS NULL' : ''} RETURNING *`, values);
    return result.rows[0] ? this.toApi(definition, result.rows[0]) : null;
  }

  async reactivate(definition: ResourceDefinition, id: string, userId: string): Promise<Record<string, unknown> | null> {
    const assignments = ['is_active = true'];
    const values: unknown[] = [id];
    if (definition.hasSoftDelete) {
      assignments.push('deleted_at = NULL');
      if ('deletedBy' in definition.columns) assignments.push('deleted_by = NULL');
    }
    if ('updatedBy' in definition.columns) {
      values.push(userId);
      assignments.push(`updated_by = $${values.length}`);
    }
    const result = await this.database.query(`UPDATE ${definition.table} SET ${assignments.join(', ')} WHERE id = $1 RETURNING *`, values);
    return result.rows[0] ? this.toApi(definition, result.rows[0]) : null;
  }

  async replaceSupplierMarkers(supplierId: string, markerIds: string[], userId: string): Promise<void> {
    await this.database.transaction(async (executor) => this.replaceSupplierMarkersWithExecutor(executor, supplierId, markerIds, userId));
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

  private async withSupplierMutationData(definition: ResourceDefinition, data: Record<string, unknown>, fillDefaults: boolean): Promise<Record<string, unknown>> {
    if (!this.isSupplierDefinition(definition)) return data;
    const supplier = { ...data };
    if (fillDefaults && this.isEmptyReference(supplier.statusId)) {
      supplier.statusId = await this.requiredReferenceId('cadastros.supplier_statuses', 'ACTIVE', 'Status padrão de fornecedor');
    }
    if (fillDefaults && this.isEmptyReference(supplier.supplierCategoryId)) {
      supplier.supplierCategoryId = await this.requiredReferenceId('cadastros.supplier_categories', 'SUPPLIER', 'Categoria padrão de fornecedor');
    }
    if (this.isEmptyReference(supplier.cityId) && typeof supplier.cityName === 'string' && supplier.cityName.trim() && typeof supplier.stateId === 'string') {
      supplier.cityId = await this.findOrCreateCity(supplier.stateId, supplier.cityName);
    }
    delete supplier.cityName;
    return supplier;
  }

  private isEmptyReference(value: unknown): boolean {
    return value === undefined || value === null || value === '';
  }

  private async requiredReferenceId(table: string, code: string, label: string): Promise<string> {
    const result = await this.database.query<{ id: string }>(
      `SELECT id FROM ${table} WHERE code = $1 AND is_active = true LIMIT 1`,
      [code],
    );
    const id = result.rows[0]?.id;
    if (!id) {
      throw new ApplicationError({
        code: 'MISSING_DEFAULT_REFERENCE',
        message: `${label} não encontrado. Verifique as migrations/seed de cadastros.`,
        statusCode: 500,
        details: { table, code },
      });
    }
    return id;
  }

  private async findOrCreateCity(stateId: string, name: string): Promise<string> {
    const cityName = name.trim();
    const result = await this.database.query<{ id: string }>(`
      WITH existing AS (
        SELECT id
        FROM cadastros.cities
        WHERE state_id = $1 AND lower(name) = lower($2)
        LIMIT 1
      ), inserted AS (
        INSERT INTO cadastros.cities (state_id, name)
        SELECT $1, $2
        WHERE NOT EXISTS (SELECT 1 FROM existing)
        ON CONFLICT (state_id, name) DO UPDATE SET is_active = true
        RETURNING id
      )
      SELECT id FROM inserted
      UNION ALL
      SELECT id FROM existing
      LIMIT 1`, [stateId, cityName]);
    const id = result.rows[0]?.id;
    if (!id) throw new Error('Failed to resolve supplier city');
    return id;
  }

  private async toApi(definition: ResourceDefinition, row: Record<string, unknown>): Promise<Record<string, unknown>> {
    const entity = Object.fromEntries(Object.entries(definition.columns)
      .filter(([key]) => !['createdBy', 'updatedBy', 'deletedBy'].includes(key))
      .map(([key, column]) => [key, row[column]]));

    if (this.isCompanyParameterDefinition(definition) && row.company_id) {
      entity.companyName = await this.companyDisplayName(row.company_id);
    }

    if (this.isBankAccountDefinition(definition)) {
      if (row.company_id) entity.companyName = await this.companyDisplayName(row.company_id);
      if (row.bank_id) {
        const bank = await this.database.query<{ name: string }>(
          'SELECT name FROM tesouraria.banks WHERE id = $1',
          [row.bank_id],
        );
        entity.bankName = bank.rows[0]?.name ?? null;
      }
    }

    if (!this.isSupplierDefinition(definition) || !row.id) return entity;
    entity.relationshipStartedAt = this.toDateOnly(entity.relationshipStartedAt);

    const markerRows = await this.database.query<{ marker_id: string }>(
      'SELECT marker_id FROM cadastros.supplier_markers WHERE supplier_id = $1 ORDER BY created_at, marker_id',
      [row.id],
    );

    return {
      ...entity,
      markerIds: markerRows.rows.map((item) => item.marker_id),
    };
  }

  private async companyDisplayName(companyId: unknown): Promise<string | null> {
    if (typeof companyId !== 'string') return null;
    const company = await this.database.query<{ display_name: string }>(
      "SELECT COALESCE(NULLIF(trade_name, ''), legal_name) AS display_name FROM cadastros.companies WHERE id = $1",
      [companyId],
    );
    return company.rows[0]?.display_name ?? null;
  }

  private async replaceSupplierMarkersWithExecutor(executor: QueryExecutor, supplierId: string, markerIds: string[], userId: string): Promise<void> {
    await executor.query('DELETE FROM cadastros.supplier_markers WHERE supplier_id = $1', [supplierId]);
    if (markerIds.length === 0) return;

    const uniqueMarkerIds = [...new Set(markerIds)];
    const values: unknown[] = [];
    const tuples = uniqueMarkerIds.map((markerId, index) => {
      const base = index * 3;
      values.push(supplierId, markerId, userId);
      return `($${base + 1}, $${base + 2}, $${base + 3})`;
    });

    await executor.query(`INSERT INTO cadastros.supplier_markers (supplier_id, marker_id, created_by)
      VALUES ${tuples.join(', ')}`, values);
  }

  private toDateOnly(value: unknown): unknown {
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    if (typeof value === 'string') return value.slice(0, 10);
    return value;
  }

  private isSupplierDefinition(definition: ResourceDefinition): boolean {
    return definition.table === 'cadastros.suppliers';
  }

  private isCompanyParameterDefinition(definition: ResourceDefinition): boolean {
    return definition.table === 'cadastros.company_parameters';
  }

  private isBankAccountDefinition(definition: ResourceDefinition): boolean {
    return definition.table === 'tesouraria.bank_accounts';
  }
}
