import type { Database } from '../../infrastructure/database/database.js';

export interface IntelligenceFilters {
  from: string;
  to: string;
  supplierId?: string;
  categoryId?: string;
}

function camel(key: string): string { return key.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase()); }
function api(row: Record<string, unknown>): Record<string, unknown> { return Object.fromEntries(Object.entries(row).map(([key, value]) => [camel(key), value])); }

export class IntelligenceRepository {
  constructor(private readonly database: Database) {}

  async dashboard(filters: IntelligenceFilters): Promise<object> {
    const values: unknown[] = [filters.from, filters.to];
    const clauses = this.filters(filters, values);
    const openBase = `FROM financeiro.payable_installments i
      JOIN financeiro.payable_titles t ON t.id=i.payable_title_id
      JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id
      WHERE i.deleted_at IS NULL AND t.deleted_at IS NULL AND t.is_active
      AND ts.code <> 'CANCELLED' AND i.open_balance > 0 AND i.due_date BETWEEN $1 AND $2 ${clauses}`;
    const summary = await this.database.query(`SELECT
        COALESCE(sum(i.open_balance),0)::text total_payable,
        COALESCE(sum(i.open_balance) FILTER (WHERE i.due_date < CURRENT_DATE),0)::text overdue,
        COALESCE(sum(i.open_balance) FILTER (WHERE i.due_date >= CURRENT_DATE),0)::text upcoming,
        (SELECT COALESCE(sum(p.movement_amount),0)::text FROM financeiro.payments p
          JOIN financeiro.payment_statuses ps ON ps.id=p.status_id
          JOIN financeiro.payable_installments pi ON pi.id=p.payable_installment_id
          JOIN financeiro.payable_titles pt ON pt.id=pi.payable_title_id
          WHERE ps.code='EFFECTIVE' AND p.payment_date BETWEEN $1 AND $2
          AND ($3::uuid IS NULL OR pt.supplier_id=$3) AND ($4::uuid IS NULL OR pt.category_id=$4)) paid
        FROM financeiro.payable_installments i
        JOIN financeiro.payable_titles t ON t.id=i.payable_title_id
        JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id
        WHERE i.deleted_at IS NULL AND t.deleted_at IS NULL AND t.is_active AND ts.code<>'CANCELLED'
        AND i.open_balance>0 AND i.due_date BETWEEN $1 AND $2
        AND ($3::uuid IS NULL OR t.supplier_id=$3) AND ($4::uuid IS NULL OR t.category_id=$4)`,
        [filters.from, filters.to, filters.supplierId ?? null, filters.categoryId ?? null]);
    const dueSeries = await this.database.query(`SELECT i.due_date::text label,COALESCE(sum(i.open_balance),0)::text amount ${openBase}
        GROUP BY i.due_date ORDER BY i.due_date`, values);
    const categories = await this.database.query(`SELECT c.name label,COALESCE(sum(i.open_balance),0)::text amount
        FROM financeiro.payable_installments i JOIN financeiro.payable_titles t ON t.id=i.payable_title_id
        JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id JOIN cadastros.financial_categories c ON c.id=t.category_id
        WHERE i.deleted_at IS NULL AND t.deleted_at IS NULL AND t.is_active AND ts.code<>'CANCELLED'
        AND i.open_balance>0 AND i.due_date BETWEEN $1 AND $2 ${clauses}
        GROUP BY c.id,c.name ORDER BY sum(i.open_balance) DESC LIMIT 6`, values);
    const recent = await this.database.query(`SELECT t.id,t.document_number,s.legal_name supplier_name,i.due_date::text,i.open_balance::text,
        CASE WHEN i.due_date<CURRENT_DATE THEN 'OVERDUE' WHEN i.due_date=CURRENT_DATE THEN 'TODAY' ELSE 'UPCOMING' END highlight
        FROM financeiro.payable_installments i JOIN financeiro.payable_titles t ON t.id=i.payable_title_id
        JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id JOIN cadastros.suppliers s ON s.id=t.supplier_id
        WHERE i.deleted_at IS NULL AND t.deleted_at IS NULL AND t.is_active AND ts.code<>'CANCELLED'
        AND i.open_balance>0 AND i.due_date BETWEEN $1 AND $2 ${clauses}
        ORDER BY i.due_date,i.open_balance DESC LIMIT 8`, values);
    return { summary: api(summary.rows[0] ?? {}), dueSeries: dueSeries.rows.map(api), categories: categories.rows.map(api), upcoming: recent.rows.map(api), filters };
  }

  async agenda(filters: IntelligenceFilters): Promise<object> {
    const values: unknown[] = [filters.from, filters.to];
    const clauses = this.filters(filters, values);
    const result = await this.database.query(`SELECT i.id,t.id payable_title_id,t.document_number,t.description,
      s.legal_name supplier_name,c.name category_name,i.installment_number,i.installment_count,
      i.due_date::text,i.open_balance::text,
      CASE WHEN i.due_date<CURRENT_DATE THEN 'OVERDUE' WHEN i.due_date=CURRENT_DATE THEN 'TODAY' ELSE 'UPCOMING' END highlight
      FROM financeiro.payable_installments i JOIN financeiro.payable_titles t ON t.id=i.payable_title_id
      JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id
      JOIN cadastros.suppliers s ON s.id=t.supplier_id JOIN cadastros.financial_categories c ON c.id=t.category_id
      WHERE i.deleted_at IS NULL AND t.deleted_at IS NULL AND t.is_active AND ts.code<>'CANCELLED'
      AND i.open_balance>0 AND i.due_date BETWEEN $1 AND $2 ${clauses}
      ORDER BY i.due_date,s.legal_name,t.document_number,i.installment_number`, values);
    const total = result.rows.reduce((sum, row) => sum + Number(row.open_balance), 0);
    return { data: result.rows.map(api), total: total.toFixed(2), count: result.rowCount, filters };
  }

  private filters(filters: IntelligenceFilters, values: unknown[]): string {
    const conditions: string[] = [];
    if (filters.supplierId) { values.push(filters.supplierId); conditions.push(`t.supplier_id=$${values.length}`); }
    if (filters.categoryId) { values.push(filters.categoryId); conditions.push(`t.category_id=$${values.length}`); }
    return conditions.length ? `AND ${conditions.join(' AND ')}` : '';
  }
}
