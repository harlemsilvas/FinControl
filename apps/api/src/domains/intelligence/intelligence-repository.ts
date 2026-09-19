import type { Database } from '../../infrastructure/database/database.js';
import { ApplicationError } from '../../common/errors/application-error.js';

export interface IntelligenceFilters {
  from: string;
  to: string;
  supplierId?: string;
  categoryId?: string;
  companyId?: string;
}

export interface PayablesForecastFilters extends IntelligenceFilters {
  status: 'ALL_PENDING' | 'UPCOMING' | 'OVERDUE';
  search?: string;
  page: number;
  pageSize: number;
}

export interface CompanyScope {
  isMaster: boolean;
  companyIds: string[];
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
        COALESCE(sum(i.open_balance) FILTER (WHERE i.due_date = CURRENT_DATE),0)::text today,
        (count(*) FILTER (WHERE i.due_date = CURRENT_DATE))::text today_count,
        COALESCE(sum(i.open_balance) FILTER (WHERE i.due_date >= CURRENT_DATE),0)::text upcoming,
        (SELECT COALESCE(sum(p.movement_amount),0)::text FROM financeiro.payments p
          JOIN financeiro.payment_statuses ps ON ps.id=p.status_id
          JOIN financeiro.payable_installments pi ON pi.id=p.payable_installment_id
          JOIN financeiro.payable_titles pt ON pt.id=pi.payable_title_id
          WHERE ps.code='EFFECTIVE' AND p.payment_date BETWEEN $1 AND $2
          AND ($3::uuid IS NULL OR pt.supplier_id=$3) AND ($4::uuid IS NULL OR pt.category_id=$4)
          AND ($5::uuid IS NULL OR pt.company_id=$5)) paid,
        (SELECT count(*)::text FROM financeiro.payments p
          JOIN financeiro.payment_statuses ps ON ps.id=p.status_id
          JOIN financeiro.payable_installments pi ON pi.id=p.payable_installment_id
          JOIN financeiro.payable_titles pt ON pt.id=pi.payable_title_id
          WHERE ps.code='EFFECTIVE' AND p.payment_date BETWEEN $1 AND $2
          AND ($3::uuid IS NULL OR pt.supplier_id=$3) AND ($4::uuid IS NULL OR pt.category_id=$4)
          AND ($5::uuid IS NULL OR pt.company_id=$5)) paid_count
        FROM financeiro.payable_installments i
        JOIN financeiro.payable_titles t ON t.id=i.payable_title_id
        JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id
        WHERE i.deleted_at IS NULL AND t.deleted_at IS NULL AND t.is_active AND ts.code<>'CANCELLED'
        AND i.open_balance>0 AND i.due_date BETWEEN $1 AND $2
        AND ($3::uuid IS NULL OR t.supplier_id=$3) AND ($4::uuid IS NULL OR t.category_id=$4)
        AND ($5::uuid IS NULL OR t.company_id=$5)`,
        [filters.from, filters.to, filters.supplierId ?? null, filters.categoryId ?? null, filters.companyId ?? null]);
    const dueSeries = await this.database.query(`SELECT i.due_date::text label,COALESCE(sum(i.open_balance),0)::text amount ${openBase}
        GROUP BY i.due_date ORDER BY i.due_date`, values);
    const categories = await this.database.query(`SELECT c.name label,COALESCE(sum(i.open_balance),0)::text amount
        FROM financeiro.payable_installments i JOIN financeiro.payable_titles t ON t.id=i.payable_title_id
        JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id JOIN cadastros.financial_categories c ON c.id=t.category_id
        WHERE i.deleted_at IS NULL AND t.deleted_at IS NULL AND t.is_active AND ts.code<>'CANCELLED'
        AND i.open_balance>0 AND i.due_date BETWEEN $1 AND $2 ${clauses}
        GROUP BY c.id,c.name ORDER BY sum(i.open_balance) DESC LIMIT 6`, values);
    const recent = await this.database.query(`SELECT t.id,t.document_number,s.legal_name supplier_name,
        COALESCE(NULLIF(company.trade_name,''),company.legal_name) company_name,
        i.due_date::text,i.open_balance::text,
        CASE WHEN i.due_date<CURRENT_DATE THEN 'OVERDUE' WHEN i.due_date=CURRENT_DATE THEN 'TODAY' ELSE 'UPCOMING' END highlight
        FROM financeiro.payable_installments i JOIN financeiro.payable_titles t ON t.id=i.payable_title_id
        JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id JOIN cadastros.suppliers s ON s.id=t.supplier_id
        LEFT JOIN cadastros.companies company ON company.id=t.company_id
        WHERE i.deleted_at IS NULL AND t.deleted_at IS NULL AND t.is_active AND ts.code<>'CANCELLED'
        AND i.open_balance>0 AND i.due_date BETWEEN $1 AND $2 ${clauses}
        ORDER BY i.due_date,i.open_balance DESC LIMIT 8`, values);
    return { summary: api(summary.rows[0] ?? {}), dueSeries: dueSeries.rows.map(api), categories: categories.rows.map(api), upcoming: recent.rows.map(api), filters };
  }

  async agenda(filters: IntelligenceFilters): Promise<object> {
    const values: unknown[] = [filters.from, filters.to];
    const clauses = this.filters(filters, values);
    const result = await this.database.query(`SELECT i.id,t.id payable_title_id,t.document_number,t.description,
      s.legal_name supplier_name,COALESCE(NULLIF(company.trade_name,''),company.legal_name) company_name,
      c.name category_name,i.installment_number,i.installment_count,
      i.due_date::text,i.open_balance::text,
      CASE WHEN i.due_date<CURRENT_DATE THEN 'OVERDUE' WHEN i.due_date=CURRENT_DATE THEN 'TODAY' ELSE 'UPCOMING' END highlight
      FROM financeiro.payable_installments i JOIN financeiro.payable_titles t ON t.id=i.payable_title_id
      JOIN financeiro.payable_title_statuses ts ON ts.id=t.status_id
      JOIN cadastros.suppliers s ON s.id=t.supplier_id JOIN cadastros.financial_categories c ON c.id=t.category_id
      LEFT JOIN cadastros.companies company ON company.id=t.company_id
      WHERE i.deleted_at IS NULL AND t.deleted_at IS NULL AND t.is_active AND ts.code<>'CANCELLED'
      AND i.open_balance>0 AND i.due_date BETWEEN $1 AND $2 ${clauses}
      ORDER BY i.due_date,s.legal_name,t.document_number,i.installment_number`, values);
    const total = result.rows.reduce((sum, row) => sum + Number(row.open_balance), 0);
    return { data: result.rows.map(api), total: total.toFixed(2), count: result.rowCount, filters };
  }

  async payablesForecast(filters: PayablesForecastFilters, scope: CompanyScope): Promise<object> {
    if (!scope.isMaster && filters.companyId && !scope.companyIds.includes(filters.companyId)) {
      throw new ApplicationError({ code: 'COMPANY_ACCESS_DENIED', message: 'Você não possui acesso à empresa selecionada.', statusCode: 403 });
    }

    const values: unknown[] = [filters.from, filters.to];
    const conditions = [
      'i.deleted_at IS NULL',
      't.deleted_at IS NULL',
      't.is_active',
      "ts.code <> 'CANCELLED'",
      'i.open_balance > 0',
      'i.due_date BETWEEN $1 AND $2',
    ];
    const add = (value: unknown): string => {
      values.push(value);
      return `$${values.length}`;
    };

    if (filters.companyId) conditions.push(`t.company_id = ${add(filters.companyId)}`);
    else if (!scope.isMaster) {
      if (scope.companyIds.length === 0) conditions.push('FALSE');
      else conditions.push(`t.company_id = ANY(${add(scope.companyIds)}::uuid[])`);
    }
    if (filters.supplierId) conditions.push(`t.supplier_id = ${add(filters.supplierId)}`);
    if (filters.categoryId) conditions.push(`t.category_id = ${add(filters.categoryId)}`);
    if (filters.status === 'UPCOMING') conditions.push('i.due_date >= CURRENT_DATE');
    if (filters.status === 'OVERDUE') conditions.push('i.due_date < CURRENT_DATE');
    if (filters.search) {
      const searchParameter = add(`%${filters.search}%`);
      conditions.push(`(t.document_number ILIKE ${searchParameter} OR t.description ILIKE ${searchParameter} OR s.legal_name ILIKE ${searchParameter})`);
    }

    const from = `FROM financeiro.payable_installments i
      JOIN financeiro.payable_titles t ON t.id = i.payable_title_id
      JOIN financeiro.payable_title_statuses ts ON ts.id = t.status_id
      JOIN cadastros.suppliers s ON s.id = t.supplier_id
      JOIN cadastros.financial_categories c ON c.id = t.category_id
      LEFT JOIN cadastros.companies company ON company.id = t.company_id
      WHERE ${conditions.join(' AND ')}`;

    const summary = await this.database.query(`SELECT
        COALESCE(sum(i.open_balance), 0)::text total_pending,
        COALESCE(sum(i.open_balance) FILTER (WHERE i.due_date < CURRENT_DATE), 0)::text overdue,
        COALESCE(sum(i.open_balance) FILTER (WHERE i.due_date >= CURRENT_DATE), 0)::text upcoming,
        count(*)::text installment_count,
        count(DISTINCT t.company_id)::text company_count
      ${from}`, values);
    const byDate = await this.database.query(`SELECT i.due_date::text label,
        COALESCE(sum(i.open_balance), 0)::text amount, count(*)::text count
      ${from} GROUP BY i.due_date ORDER BY i.due_date`, values);
    const byCompany = await this.database.query(`SELECT t.company_id id,
        COALESCE(NULLIF(company.trade_name, ''), company.legal_name, 'Empresa não informada') label,
        COALESCE(sum(i.open_balance), 0)::text amount, count(*)::text count
      ${from} GROUP BY t.company_id, company.trade_name, company.legal_name
      ORDER BY sum(i.open_balance) DESC, label`, values);

    const listValues = [...values, filters.pageSize, (filters.page - 1) * filters.pageSize];
    const pageSizeParameter = `$${values.length + 1}`;
    const offsetParameter = `$${values.length + 2}`;
    const list = await this.database.query(`SELECT
        i.id, t.id payable_title_id, t.document_number, t.description,
        s.legal_name supplier_name,
        COALESCE(NULLIF(company.trade_name, ''), company.legal_name, 'Empresa não informada') company_name,
        c.name category_name, i.installment_number, i.installment_count,
        i.due_date::text, i.open_balance::text,
        CASE WHEN i.due_date < CURRENT_DATE THEN 'OVERDUE' WHEN i.due_date = CURRENT_DATE THEN 'TODAY' ELSE 'UPCOMING' END status,
        count(*) OVER()::text total_count
      ${from}
      ORDER BY i.due_date, s.legal_name, t.document_number, i.installment_number
      LIMIT ${pageSizeParameter} OFFSET ${offsetParameter}`, listValues);
    const total = Number(list.rows[0]?.total_count ?? 0);

    return {
      summary: api(summary.rows[0] ?? {}),
      byDate: byDate.rows.map(api),
      byCompany: byCompany.rows.map(api),
      data: list.rows.map((row) => {
        const cleanRow = { ...row };
        delete cleanRow.total_count;
        return api(cleanRow);
      }),
      pagination: { page: filters.page, pageSize: filters.pageSize, total, totalPages: Math.max(1, Math.ceil(total / filters.pageSize)) },
      filters,
    };
  }

  private filters(filters: IntelligenceFilters, values: unknown[]): string {
    const conditions: string[] = [];
    if (filters.supplierId) { values.push(filters.supplierId); conditions.push(`t.supplier_id=$${values.length}`); }
    if (filters.categoryId) { values.push(filters.categoryId); conditions.push(`t.category_id=$${values.length}`); }
    if (filters.companyId) { values.push(filters.companyId); conditions.push(`t.company_id=$${values.length}`); }
    return conditions.length ? `AND ${conditions.join(' AND ')}` : '';
  }
}
