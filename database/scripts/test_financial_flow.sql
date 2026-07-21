\set ON_ERROR_STOP on

BEGIN;

DO $test$
DECLARE
    v_user uuid;
    v_supplier uuid;
    v_category uuid;
    v_document_type uuid;
    v_payment_method uuid;
    v_bank uuid;
    v_bank_account uuid;
    v_title uuid;
    v_duplicate_title uuid;
    v_installment uuid;
    v_payment_partial uuid;
    v_payment_final uuid;
    v_attachment uuid;
    v_count integer;
    v_balance numeric(18,2);
    v_status text;
    v_valid boolean;
BEGIN
    INSERT INTO administracao.users (full_name, email, password_hash, is_master)
    VALUES ('Database Flow Test', 'database-flow-test@fincontrol.local', 'test-only', true)
    RETURNING id INTO v_user;

    INSERT INTO cadastros.suppliers
        (supplier_type, legal_name, document_number, is_approved, created_by, updated_by)
    VALUES ('COMPANY', 'Fornecedor Teste Fluxo', '00000000000191', true, v_user, v_user)
    RETURNING id INTO v_supplier;

    INSERT INTO cadastros.financial_categories
        (code, name, created_by, updated_by)
    VALUES ('TEST-FLOW', 'Categoria Teste Fluxo', v_user, v_user)
    RETURNING id INTO v_category;

    SELECT id INTO STRICT v_document_type FROM cadastros.document_types WHERE code = 'INVOICE';
    SELECT id INTO STRICT v_payment_method FROM cadastros.payment_methods WHERE code = 'PIX';

    INSERT INTO tesouraria.banks (code, name)
    VALUES ('TST', 'Banco Teste') RETURNING id INTO v_bank;

    INSERT INTO tesouraria.bank_accounts
        (bank_id, account_name, branch_number, account_number, created_by, updated_by)
    VALUES (v_bank, 'Conta Teste', '0001', '12345-0', v_user, v_user)
    RETURNING id INTO v_bank_account;

    INSERT INTO financeiro.payable_titles (
        supplier_id, category_id, document_type_id, document_number,
        document_series, description, issue_date, original_amount,
        status_id, created_by, updated_by
    ) VALUES (
        v_supplier, v_category, v_document_type, 'FLOW-001', 'A',
        'Título de teste do fluxo financeiro', CURRENT_DATE, 1000.00,
        (SELECT id FROM financeiro.payable_title_statuses WHERE code = 'OPEN'),
        v_user, v_user
    ) RETURNING id INTO v_title;

    INSERT INTO financeiro.payable_installments (
        payable_title_id, installment_number, installment_count, amount,
        due_date, payment_method_id, open_balance, status_id, created_by, updated_by
    ) VALUES (
        v_title, 1, 1, 1000.00, CURRENT_DATE + 10, v_payment_method, 1000.00,
        (SELECT id FROM financeiro.payable_installment_statuses WHERE code = 'OPEN'),
        v_user, v_user
    ) RETURNING id INTO v_installment;

    SELECT is_valid INTO STRICT v_valid
    FROM financeiro.validate_title_installments(v_title);
    IF NOT v_valid THEN
        RAISE EXCEPTION 'Title/installment total validation failed';
    END IF;

    SELECT count(*) INTO v_count
    FROM financeiro.find_possible_duplicate_titles(v_supplier, ' flow-001 ', 'a');
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'Duplicate lookup should find the original title, found %', v_count;
    END IF;

    INSERT INTO financeiro.payable_titles (
        supplier_id, category_id, document_type_id, document_number,
        document_series, description, issue_date, original_amount, status_id,
        duplicate_warning_confirmed, duplicate_warning_confirmed_by,
        duplicate_warning_confirmed_at, created_by, updated_by
    ) VALUES (
        v_supplier, v_category, v_document_type, 'FLOW-001', 'A',
        'Duplicidade permitida após confirmação', CURRENT_DATE, 1000.00,
        (SELECT id FROM financeiro.payable_title_statuses WHERE code = 'OPEN'),
        true, v_user, CURRENT_TIMESTAMP, v_user, v_user
    ) RETURNING id INTO v_duplicate_title;

    INSERT INTO administracao.audit_events
        (domain_code, entity_name, entity_id, action_code, new_data, user_id, source_code)
    VALUES
        ('DOM-002', 'payable_title', v_duplicate_title, 'DUPLICATE_OVERRIDE',
         jsonb_build_object('original_title_id', v_title), v_user, 'DATABASE_TEST');

    SELECT count(*) INTO v_count
    FROM financeiro.find_possible_duplicate_titles(v_supplier, 'FLOW-001', 'A');
    IF v_count <> 2 THEN
        RAISE EXCEPTION 'Confirmed duplicate was blocked or not found; found % titles', v_count;
    END IF;

    INSERT INTO financeiro.payments (
        payable_installment_id, bank_account_id, payment_method_id, payment_date,
        principal_amount, transaction_number, status_id, created_by, updated_by
    ) VALUES (
        v_installment, v_bank_account, v_payment_method, CURRENT_DATE,
        400.00, 'PARTIAL-001',
        (SELECT id FROM financeiro.payment_statuses WHERE code = 'EFFECTIVE'),
        v_user, v_user
    ) RETURNING id INTO v_payment_partial;

    SELECT i.open_balance, s.code INTO STRICT v_balance, v_status
    FROM financeiro.payable_installments i
    JOIN financeiro.payable_installment_statuses s ON s.id = i.status_id
    WHERE i.id = v_installment;
    IF v_balance <> 600.00 OR v_status <> 'PARTIALLY_PAID' THEN
        RAISE EXCEPTION 'Partial payment result invalid: balance %, status %', v_balance, v_status;
    END IF;

    INSERT INTO financeiro.payments (
        payable_installment_id, bank_account_id, payment_method_id, payment_date,
        principal_amount, transaction_number, status_id, created_by, updated_by
    ) VALUES (
        v_installment, v_bank_account, v_payment_method, CURRENT_DATE,
        600.00, 'FINAL-001',
        (SELECT id FROM financeiro.payment_statuses WHERE code = 'EFFECTIVE'),
        v_user, v_user
    ) RETURNING id INTO v_payment_final;

    SELECT i.open_balance, s.code INTO STRICT v_balance, v_status
    FROM financeiro.payable_installments i
    JOIN financeiro.payable_installment_statuses s ON s.id = i.status_id
    WHERE i.id = v_installment;
    IF v_balance <> 0.00 OR v_status <> 'PAID' THEN
        RAISE EXCEPTION 'Full payment result invalid: balance %, status %', v_balance, v_status;
    END IF;

    INSERT INTO financeiro.payment_reversals (payment_id, reason, reversed_by)
    VALUES (v_payment_final, 'Estorno de teste', v_user);

    SELECT i.open_balance, s.code INTO STRICT v_balance, v_status
    FROM financeiro.payable_installments i
    JOIN financeiro.payable_installment_statuses s ON s.id = i.status_id
    WHERE i.id = v_installment;
    IF v_balance <> 600.00 OR v_status <> 'PARTIALLY_PAID' THEN
        RAISE EXCEPTION 'Reversal result invalid: balance %, status %', v_balance, v_status;
    END IF;

    INSERT INTO financeiro.payment_reversals (payment_id, reason, reversed_by)
    VALUES (v_payment_partial, 'Estorno final para exclusão lógica', v_user);

    INSERT INTO financeiro.attachments (
        payable_title_id, attachment_type_id, original_name, stored_name,
        relative_path, mime_type, size_bytes, file_hash, created_by
    ) VALUES (
        v_title,
        (SELECT id FROM cadastros.attachment_types ORDER BY code LIMIT 1),
        'nfe-teste.xml', 'nfe-teste.xml', 'tests/nfe-teste.xml',
        'application/xml', 128, repeat('a', 64), v_user
    ) RETURNING id INTO v_attachment;

    INSERT INTO financeiro.xml_imports
        (access_key, attachment_id, status_id, generated_title_id, imported_by)
    VALUES (
        'TEST-FLOW-ACCESS-KEY-000000000000000000000001', v_attachment,
        (SELECT id FROM financeiro.xml_import_statuses WHERE code = 'PROCESSED'),
        v_title, v_user
    );

    PERFORM financeiro.soft_delete_payable_title(v_title, v_user);
    IF NOT EXISTS (
        SELECT 1 FROM financeiro.payable_titles
        WHERE id = v_title AND deleted_at IS NOT NULL AND NOT is_active
    ) OR NOT EXISTS (
        SELECT 1 FROM financeiro.payable_installments
        WHERE id = v_installment AND deleted_at IS NOT NULL
    ) THEN
        RAISE EXCEPTION 'Logical deletion did not mark title and installment';
    END IF;

    SELECT count(*) INTO v_count
    FROM administracao.audit_events
    WHERE entity_id = v_duplicate_title AND action_code = 'DUPLICATE_OVERRIDE';
    IF v_count <> 1 THEN
        RAISE EXCEPTION 'Expected duplicate override audit event';
    END IF;

    RAISE NOTICE 'PASS: user, supplier, category, title, installment, duplicate warning, partial/full payment, reversal, soft delete, audit and simulated XML import';
END
$test$;

ROLLBACK;

SELECT 'PASS' AS result,
       'Financial flow completed and test data rolled back' AS details;
