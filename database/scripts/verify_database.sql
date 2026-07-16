\set ON_ERROR_STOP on

DO $verify$
DECLARE
    v_count integer;
    v_names text;
BEGIN
    SELECT count(*) INTO v_count
    FROM information_schema.schemata
    WHERE schema_name IN (
        'cadastros', 'financeiro', 'tesouraria',
        'administracao', 'inteligencia', 'integracoes'
    );
    IF v_count <> 6 THEN
        RAISE EXCEPTION 'Expected 6 domain schemas, found %', v_count;
    END IF;

    SELECT count(*) INTO v_count
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f');
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'Schema public contains % application objects', v_count;
    END IF;

    WITH expected(schema_name, object_name) AS (
        VALUES
            ('administracao', 'users'), ('administracao', 'roles'),
            ('administracao', 'permissions'), ('administracao', 'user_roles'),
            ('administracao', 'role_permissions'), ('administracao', 'audit_events'),
            ('administracao', 'maintenance_operations'), ('administracao', 'schema_versions'),
            ('cadastros', 'suppliers'), ('cadastros', 'financial_categories'),
            ('cadastros', 'cost_centers'), ('cadastros', 'document_types'),
            ('cadastros', 'payment_methods'), ('cadastros', 'payment_terms'),
            ('cadastros', 'attachment_types'), ('tesouraria', 'banks'),
            ('tesouraria', 'bank_accounts'), ('financeiro', 'payable_titles'),
            ('financeiro', 'payable_installments'), ('financeiro', 'payments'),
            ('financeiro', 'payment_reversals'), ('financeiro', 'payment_batches'),
            ('financeiro', 'approvals'), ('financeiro', 'attachments'),
            ('financeiro', 'tags'), ('financeiro', 'payable_title_tags'),
            ('financeiro', 'xml_imports')
    ), missing AS (
        SELECT e.schema_name || '.' || e.object_name AS object_name
        FROM expected e
        LEFT JOIN information_schema.tables t
          ON t.table_schema = e.schema_name AND t.table_name = e.object_name
        WHERE t.table_name IS NULL
    )
    SELECT count(*), string_agg(object_name, ', ' ORDER BY object_name)
      INTO v_count, v_names FROM missing;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'Missing required tables: %', v_names;
    END IF;

    SELECT count(*), string_agg(n.nspname || '.' || c.relname, ', ')
      INTO v_count, v_names
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname IN ('administracao', 'cadastros', 'financeiro', 'tesouraria')
      AND NOT con.convalidated;
    IF v_count <> 0 THEN
        RAISE EXCEPTION 'Unvalidated constraints: %', v_names;
    END IF;

    IF to_regprocedure('financeiro.calculate_installment_paid_amount(uuid)') IS NULL
       OR to_regprocedure('financeiro.recalculate_installment_balance(uuid)') IS NULL
       OR to_regprocedure('financeiro.soft_delete_payable_title(uuid,uuid)') IS NULL
       OR to_regprocedure('financeiro.validate_title_installments(uuid)') IS NULL
       OR to_regprocedure('financeiro.find_possible_duplicate_titles(uuid,character varying,character varying)') IS NULL THEN
        RAISE EXCEPTION 'One or more required financial functions are missing';
    END IF;

    IF to_regclass('financeiro.v_payable_installments_open') IS NULL
       OR to_regclass('financeiro.v_payable_title_balances') IS NULL THEN
        RAISE EXCEPTION 'One or more required financial views are missing';
    END IF;

    SELECT count(*) INTO v_count FROM financeiro.payable_title_statuses;
    IF v_count <> 10 THEN
        RAISE EXCEPTION 'Expected 10 payable title statuses, found %', v_count;
    END IF;

    SELECT count(*) INTO v_count FROM administracao.roles;
    IF v_count <> 6 THEN
        RAISE EXCEPTION 'Expected 6 seeded roles, found %', v_count;
    END IF;

    SELECT count(*) INTO v_count FROM administracao.permissions;
    IF v_count <> 10 THEN
        RAISE EXCEPTION 'Expected 10 seeded permissions, found %', v_count;
    END IF;

    RAISE NOTICE 'PASS: schemas, public isolation, tables, constraints, functions, views and seeds';
END
$verify$;

SELECT current_database() AS database_name,
       current_user AS database_user,
       current_setting('server_version') AS postgres_version,
       6 AS schemas_verified,
       'PASS' AS result;

