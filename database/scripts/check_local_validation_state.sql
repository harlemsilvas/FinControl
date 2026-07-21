\set ON_ERROR_STOP on

SELECT
    t.document_number,
    t.document_series,
    t.description,
    ts.code AS title_status,
    t.total_amount,
    count(i.id) AS installment_count,
    coalesce(sum(i.open_balance), 0)::numeric(18,2) AS total_open_balance
FROM financeiro.payable_titles t
JOIN financeiro.payable_title_statuses ts ON ts.id = t.status_id
LEFT JOIN financeiro.payable_installments i
  ON i.payable_title_id = t.id
 AND i.deleted_at IS NULL
WHERE t.document_number LIKE 'LOCAL-%'
  AND t.deleted_at IS NULL
GROUP BY t.document_number, t.document_series, t.description, ts.code, t.total_amount
ORDER BY t.document_number;

SELECT
    a.entity_name,
    a.action_code,
    count(*) AS total_events
FROM administracao.audit_events a
WHERE a.created_at >= CURRENT_DATE - 1
  AND a.source_code IN ('API', 'CLI', 'DATABASE_TEST')
GROUP BY a.entity_name, a.action_code
ORDER BY a.entity_name, a.action_code;
