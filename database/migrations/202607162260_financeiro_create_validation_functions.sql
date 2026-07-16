-- FinControl
-- DOM-002: Validation and reconciliation helpers

BEGIN;

CREATE OR REPLACE FUNCTION financeiro.validate_title_installments(p_title_id uuid)
RETURNS TABLE (
    is_valid boolean,
    title_total numeric(18,2),
    installments_total numeric(18,2),
    difference numeric(18,2)
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        (t.total_amount = COALESCE(SUM(i.amount), 0)) AS is_valid,
        t.total_amount,
        COALESCE(SUM(i.amount), 0)::numeric(18,2),
        (t.total_amount - COALESCE(SUM(i.amount), 0))::numeric(18,2)
    FROM financeiro.payable_titles t
    LEFT JOIN financeiro.payable_installments i
      ON i.payable_title_id = t.id
     AND i.deleted_at IS NULL
    WHERE t.id = p_title_id
    GROUP BY t.id, t.total_amount;
$$;

CREATE OR REPLACE FUNCTION financeiro.find_possible_duplicate_titles(
    p_supplier_id uuid,
    p_document_number varchar,
    p_document_series varchar DEFAULT NULL
)
RETURNS TABLE (
    payable_title_id uuid,
    document_number varchar,
    document_series varchar,
    description varchar,
    created_at timestamptz
)
LANGUAGE sql
STABLE
AS $$
    SELECT
        t.id,
        t.document_number,
        t.document_series,
        t.description,
        t.created_at
    FROM financeiro.payable_titles t
    WHERE t.supplier_id = p_supplier_id
      AND lower(trim(t.document_number)) = lower(trim(p_document_number))
      AND coalesce(lower(trim(t.document_series)), '') =
          coalesce(lower(trim(p_document_series)), '')
      AND t.deleted_at IS NULL
    ORDER BY t.created_at DESC;
$$;

COMMIT;
