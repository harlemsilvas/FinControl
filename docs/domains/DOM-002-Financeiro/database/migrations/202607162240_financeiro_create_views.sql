-- FinControl
-- DOM-002: Operational read views

BEGIN;

CREATE OR REPLACE VIEW financeiro.v_payable_installments_open AS
SELECT
    i.id AS installment_id,
    i.payable_title_id,
    t.supplier_id,
    t.category_id,
    t.document_number,
    t.document_series,
    t.description,
    i.installment_number,
    i.installment_count,
    i.amount,
    i.open_balance,
    i.due_date,
    ims.code AS installment_status_code,
    ims.name AS installment_status_name,
    CASE
        WHEN i.open_balance > 0 AND i.due_date < CURRENT_DATE THEN true
        ELSE false
    END AS is_overdue
FROM financeiro.payable_installments i
JOIN financeiro.payable_titles t ON t.id = i.payable_title_id
JOIN financeiro.payable_installment_statuses ims ON ims.id = i.status_id
WHERE i.deleted_at IS NULL
  AND t.deleted_at IS NULL
  AND i.open_balance > 0;

CREATE OR REPLACE VIEW financeiro.v_payable_title_balances AS
SELECT
    t.id AS payable_title_id,
    t.supplier_id,
    t.document_number,
    t.document_series,
    t.total_amount,
    COALESCE(SUM(i.amount), 0)::numeric(18,2) AS installments_total,
    COALESCE(SUM(i.open_balance), 0)::numeric(18,2) AS open_balance,
    COUNT(i.id) AS installment_count
FROM financeiro.payable_titles t
LEFT JOIN financeiro.payable_installments i
    ON i.payable_title_id = t.id
   AND i.deleted_at IS NULL
WHERE t.deleted_at IS NULL
GROUP BY
    t.id, t.supplier_id, t.document_number,
    t.document_series, t.total_amount;

COMMIT;
