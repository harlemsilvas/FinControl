\set ON_ERROR_STOP on

DO $seed$
DECLARE
    v_user_id uuid;
    v_supplier_1 uuid;
    v_supplier_2 uuid;
    v_supplier_3 uuid;
    v_category_1 uuid;
    v_category_2 uuid;
    v_category_3 uuid;
    v_bank uuid;
    v_bank_account uuid;
    v_document_type uuid;
    v_payment_method_pix uuid;
    v_payment_method_boleto uuid;
    v_title_1 uuid;
    v_title_2 uuid;
    v_title_3 uuid;
BEGIN
    SELECT id INTO v_user_id
      FROM administracao.users
     WHERE lower(email) = 'master@example.com'
     ORDER BY created_at
     LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Master user master@example.com not found on VPS';
    END IF;

    SELECT id INTO v_document_type
      FROM cadastros.document_types
     WHERE code = 'INVOICE';

    SELECT id INTO v_payment_method_pix
      FROM cadastros.payment_methods
     WHERE code = 'PIX';

    SELECT id INTO v_payment_method_boleto
      FROM cadastros.payment_methods
     WHERE code = 'BOLETO';

    INSERT INTO cadastros.suppliers
        (supplier_type, legal_name, trade_name, document_number, email, phone, is_approved, created_by, updated_by)
    VALUES
        ('COMPANY', 'Fornecedor VPS Alpha LTDA', 'VPS Alpha', '31000000000101', 'alpha@fincontrol.vps', '41990000001', true, v_user_id, v_user_id)
    ON CONFLICT (country_code, document_number) WHERE document_number IS NOT NULL AND deleted_at IS NULL
    DO UPDATE SET
        legal_name = EXCLUDED.legal_name,
        trade_name = EXCLUDED.trade_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        is_approved = true,
        is_active = true,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_by = EXCLUDED.updated_by
    RETURNING id INTO v_supplier_1;

    INSERT INTO cadastros.suppliers
        (supplier_type, legal_name, trade_name, document_number, email, phone, is_approved, created_by, updated_by)
    VALUES
        ('COMPANY', 'Fornecedor VPS Beta SA', 'VPS Beta', '31000000000102', 'beta@fincontrol.vps', '41990000002', true, v_user_id, v_user_id)
    ON CONFLICT (country_code, document_number) WHERE document_number IS NOT NULL AND deleted_at IS NULL
    DO UPDATE SET
        legal_name = EXCLUDED.legal_name,
        trade_name = EXCLUDED.trade_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        is_approved = true,
        is_active = true,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_by = EXCLUDED.updated_by
    RETURNING id INTO v_supplier_2;

    INSERT INTO cadastros.suppliers
        (supplier_type, legal_name, trade_name, document_number, email, phone, is_approved, created_by, updated_by)
    VALUES
        ('COMPANY', 'Fornecedor VPS Gamma ME', 'VPS Gamma', '31000000000103', 'gamma@fincontrol.vps', '41990000003', true, v_user_id, v_user_id)
    ON CONFLICT (country_code, document_number) WHERE document_number IS NOT NULL AND deleted_at IS NULL
    DO UPDATE SET
        legal_name = EXCLUDED.legal_name,
        trade_name = EXCLUDED.trade_name,
        email = EXCLUDED.email,
        phone = EXCLUDED.phone,
        is_approved = true,
        is_active = true,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_by = EXCLUDED.updated_by
    RETURNING id INTO v_supplier_3;

    INSERT INTO cadastros.financial_categories (code, name, nature_code, created_by, updated_by)
    VALUES ('VPS-DESP-01', 'Despesas Operacionais VPS', 'EXPENSE', v_user_id, v_user_id)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          nature_code = EXCLUDED.nature_code,
          is_active = true,
          deleted_at = NULL,
          deleted_by = NULL,
          updated_by = EXCLUDED.updated_by
    RETURNING id INTO v_category_1;

    INSERT INTO cadastros.financial_categories (code, name, nature_code, created_by, updated_by)
    VALUES ('VPS-SERV-01', 'Servicos Terceirizados VPS', 'EXPENSE', v_user_id, v_user_id)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          nature_code = EXCLUDED.nature_code,
          is_active = true,
          deleted_at = NULL,
          deleted_by = NULL,
          updated_by = EXCLUDED.updated_by
    RETURNING id INTO v_category_2;

    INSERT INTO cadastros.financial_categories (code, name, nature_code, created_by, updated_by)
    VALUES ('VPS-INS-01', 'Insumos Gerais VPS', 'EXPENSE', v_user_id, v_user_id)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          nature_code = EXCLUDED.nature_code,
          is_active = true,
          deleted_at = NULL,
          deleted_by = NULL,
          updated_by = EXCLUDED.updated_by
    RETURNING id INTO v_category_3;

    INSERT INTO tesouraria.banks (code, name)
    VALUES ('237-VPS', 'Banco Bradesco VPS')
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          is_active = true
    RETURNING id INTO v_bank;

    INSERT INTO tesouraria.bank_accounts
        (bank_id, account_name, branch_number, account_number, account_type, pix_key, is_default, created_by, updated_by)
    VALUES
        (v_bank, 'Conta Operacional VPS', '0001', '123456-7', 'CHECKING', 'vps@pix.fincontrol', true, v_user_id, v_user_id)
    ON CONFLICT (bank_id, branch_number, account_number) WHERE deleted_at IS NULL
    DO UPDATE SET
        account_name = EXCLUDED.account_name,
        account_type = EXCLUDED.account_type,
        pix_key = EXCLUDED.pix_key,
        is_default = EXCLUDED.is_default,
        is_active = true,
        deleted_at = NULL,
        deleted_by = NULL,
        updated_by = EXCLUDED.updated_by
    RETURNING id INTO v_bank_account;

    INSERT INTO financeiro.payable_titles
        (supplier_id, category_id, document_type_id, payment_term_id, cost_center_id, document_number, document_series,
         description, origin_code, issue_date, original_amount, discount_amount, additional_amount, status_id, notes,
         created_by, updated_by)
    SELECT
        v_supplier_1, v_category_1, v_document_type, NULL, NULL, 'VPS-TIT-001', 'A1',
        'Titulo aberto de validacao VPS', 'MANUAL', CURRENT_DATE - 1, 450.00, 0.00, 0.00, s.id,
        'Seed minimo de validacao VPS', v_user_id, v_user_id
      FROM financeiro.payable_title_statuses s
     WHERE s.code = 'OPEN'
       AND NOT EXISTS (
            SELECT 1 FROM financeiro.payable_titles t
             WHERE t.document_number = 'VPS-TIT-001'
               AND coalesce(t.document_series, '') = 'A1'
               AND t.deleted_at IS NULL
       )
    RETURNING id INTO v_title_1;

    IF v_title_1 IS NOT NULL THEN
        INSERT INTO financeiro.payable_installments
            (payable_title_id, installment_number, installment_count, amount, due_date, payment_method_id, open_balance, status_id, notes, created_by, updated_by)
        SELECT
            v_title_1, 1, 1, 450.00, CURRENT_DATE + 5, v_payment_method_boleto, 450.00, s.id, 'Parcela unica VPS 1', v_user_id, v_user_id
          FROM financeiro.payable_installment_statuses s
         WHERE s.code = 'OPEN';
    END IF;

    INSERT INTO financeiro.payable_titles
        (supplier_id, category_id, document_type_id, payment_term_id, cost_center_id, document_number, document_series,
         description, origin_code, issue_date, original_amount, discount_amount, additional_amount, status_id, notes,
         created_by, updated_by)
    SELECT
        v_supplier_2, v_category_2, v_document_type, NULL, NULL, 'VPS-TIT-002', 'B1',
        'Titulo parcialmente pago de validacao VPS', 'MANUAL', CURRENT_DATE - 4, 800.00, 0.00, 0.00, s.id,
        'Seed minimo de validacao VPS', v_user_id, v_user_id
      FROM financeiro.payable_title_statuses s
     WHERE s.code = 'PARTIALLY_PAID'
       AND NOT EXISTS (
            SELECT 1 FROM financeiro.payable_titles t
             WHERE t.document_number = 'VPS-TIT-002'
               AND coalesce(t.document_series, '') = 'B1'
               AND t.deleted_at IS NULL
       )
    RETURNING id INTO v_title_2;

    IF v_title_2 IS NOT NULL THEN
        INSERT INTO financeiro.payable_installments
            (payable_title_id, installment_number, installment_count, amount, due_date, payment_method_id, open_balance, status_id, notes, created_by, updated_by)
        SELECT
            v_title_2, 1, 1, 800.00, CURRENT_DATE - 1, v_payment_method_pix, 300.00, s.id, 'Parcela unica VPS 2', v_user_id, v_user_id
          FROM financeiro.payable_installment_statuses s
         WHERE s.code = 'PARTIALLY_PAID';

        INSERT INTO financeiro.payments
            (payable_installment_id, bank_account_id, payment_method_id, payment_date, principal_amount, transaction_number, status_id, created_by, updated_by)
        SELECT
            i.id, v_bank_account, v_payment_method_pix, CURRENT_DATE - 1, 500.00, 'VPS-PAY-001', s.id, v_user_id, v_user_id
          FROM financeiro.payable_installments i
          CROSS JOIN financeiro.payment_statuses s
         WHERE i.payable_title_id = v_title_2
           AND s.code = 'EFFECTIVE'
           AND NOT EXISTS (
                SELECT 1 FROM financeiro.payments p WHERE p.transaction_number = 'VPS-PAY-001'
           );
    END IF;

    INSERT INTO financeiro.payable_titles
        (supplier_id, category_id, document_type_id, payment_term_id, cost_center_id, document_number, document_series,
         description, origin_code, issue_date, original_amount, discount_amount, additional_amount, status_id, notes,
         created_by, updated_by)
    SELECT
        v_supplier_3, v_category_3, v_document_type, NULL, NULL, 'VPS-TIT-003', 'C1',
        'Titulo vencido de validacao VPS', 'MANUAL', CURRENT_DATE - 15, 620.00, 0.00, 0.00, s.id,
        'Seed minimo de validacao VPS', v_user_id, v_user_id
      FROM financeiro.payable_title_statuses s
     WHERE s.code = 'OVERDUE'
       AND NOT EXISTS (
            SELECT 1 FROM financeiro.payable_titles t
             WHERE t.document_number = 'VPS-TIT-003'
               AND coalesce(t.document_series, '') = 'C1'
               AND t.deleted_at IS NULL
       )
    RETURNING id INTO v_title_3;

    IF v_title_3 IS NOT NULL THEN
        INSERT INTO financeiro.payable_installments
            (payable_title_id, installment_number, installment_count, amount, due_date, payment_method_id, open_balance, status_id, notes, created_by, updated_by)
        SELECT
            v_title_3, 1, 1, 620.00, CURRENT_DATE - 3, v_payment_method_boleto, 620.00, s.id, 'Parcela unica VPS 3', v_user_id, v_user_id
          FROM financeiro.payable_installment_statuses s
         WHERE s.code = 'OVERDUE';
    END IF;

    RAISE NOTICE 'PASS: seed minimo VPS aplicado';
END
$seed$;
