import pg from 'pg';

const client = new pg.Client({
  host: process.env.DB_HOST ?? '127.0.0.1',
  port: Number(process.env.DB_PORT ?? '5434'),
  database: process.env.DB_NAME ?? 'fincontrol',
  user: process.env.DB_USER ?? 'fincontrol',
  password: process.env.DB_PASSWORD ?? 'fincontrol_local',
});

try {
  await client.connect();

  const titles = await client.query(`
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
    ORDER BY t.document_number
  `);

  const recentAudit = await client.query(`
    SELECT
      entity_name,
      action_code,
      count(*) AS total_events
    FROM administracao.audit_events
    WHERE created_at >= CURRENT_DATE - 1
      AND source_code IN ('API', 'CLI', 'DATABASE_TEST')
    GROUP BY entity_name, action_code
    ORDER BY entity_name, action_code
  `);

  const counts = await client.query(`
    SELECT
      (SELECT count(*) FROM cadastros.suppliers WHERE deleted_at IS NULL) AS suppliers,
      (SELECT count(*) FROM cadastros.financial_categories WHERE deleted_at IS NULL) AS categories,
      (SELECT count(*) FROM tesouraria.bank_accounts WHERE deleted_at IS NULL) AS bank_accounts,
      (SELECT count(*) FROM financeiro.payable_titles WHERE deleted_at IS NULL) AS payables
  `);

  process.stdout.write(`${JSON.stringify({ counts: counts.rows[0], titles: titles.rows, recentAudit: recentAudit.rows }, null, 2)}\n`);
} finally {
  await client.end();
}
