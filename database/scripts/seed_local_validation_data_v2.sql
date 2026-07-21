\set ON_ERROR_STOP on

DO $seed$
DECLARE
    v_user_id uuid;
    v_supplier_a uuid;
    v_supplier_b uuid;
    v_category_maintenance uuid;
    v_category_parts uuid;
    v_cost_center uuid;
    v_document_type uuid;
    v_payment_method_pix uuid;
    v_payment_method_boleto uuid;
    v_payment_term uuid;
    v_bank uuid;
    v_bank_account uuid;
    v_title_open uuid;
    v_title_partial uuid;
    v_title_approval uuid;
    v_title_overdue uuid;
BEGIN
    SELECT id INTO v_user_id
      FROM administracao.users
     WHERE lower(email) = 'master@example.com'
     ORDER BY created_at
     LIMIT 1;

    IF v_user_id IS NULL THEN
        INSERT INTO administracao.users (full_name, email, password_hash, is_master)
        VALUES ('Operador Master Local', 'master@example.com', 'seed-placeholder', true)
        RETURNING id INTO v_user_id;

        INSERT INTO administracao.user_roles (user_id, role_id, created_by)
        SELECT v_user_id, id, v_user_id
          FROM administracao.roles
         WHERE code = 'MASTER'
        ON CONFLICT DO NOTHING;
    END IF;

    INSERT INTO cadastros.suppliers
        (supplier_type, legal_name, trade_name, document_number, email, phone, is_approved, created_by, updated_by)
    VALUES
        ('COMPANY', 'Oficina Pinhais LTDA', 'Oficina Pinhais', '11222333000181', 'financeiro@oficinapinhais.local', '41999990001', true, v_user_id, v_user_id)
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
    RETURNING id INTO v_supplier_a;

    INSERT INTO cadastros.suppliers
        (supplier_type, legal_name, trade_name, document_number, email, phone, is_approved, created_by, updated_by)
    VALUES
        ('COMPANY', 'Auto Pecas Serra Azul SA', 'Serra Azul', '22333444000156', 'contas@serraazul.local', '41999990002', true, v_user_id, v_user_id)
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
    RETURNING id INTO v_supplier_b;

    INSERT INTO cadastros.financial_categories (code, name, nature_code, created_by, updated_by)
    VALUES ('FIN-MNT', 'Manutencao de Veiculos', 'EXPENSE', v_user_id, v_user_id)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          nature_code = EXCLUDED.nature_code,
          is_active = true,
          deleted_at = NULL,
          deleted_by = NULL,
          updated_by = EXCLUDED.updated_by
    RETURNING id INTO v_category_maintenance;

    INSERT INTO cadastros.financial_categories (code, name, nature_code, created_by, updated_by)
    VALUES ('FIN-PRT', 'Compra de Pecas', 'EXPENSE', v_user_id, v_user_id)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          nature_code = EXCLUDED.nature_code,
          is_active = true,
          deleted_at = NULL,
          deleted_by = NULL,
          updated_by = EXCLUDED.updated_by
    RETURNING id INTO v_category_parts;

    INSERT INTO cadastros.cost_centers (code, name, created_by, updated_by)
    VALUES ('ADM-001', 'Administrativo Geral', v_user_id, v_user_id)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          is_active = true,
          deleted_at = NULL,
          deleted_by = NULL,
          updated_by = EXCLUDED.updated_by
    RETURNING id INTO v_cost_center;

    SELECT id INTO v_document_type
      FROM cadastros.document_types
     WHERE code = 'INVOICE';

    SELECT id INTO v_payment_method_pix
      FROM cadastros.payment_methods
     WHERE code = 'PIX';

    SELECT id INTO v_payment_method_boleto
      FROM cadastros.payment_methods
     WHERE code = 'BOLETO';

    SELECT id INTO v_payment_term
      FROM cadastros.payment_terms
     WHERE code = '30D';

    INSERT INTO tesouraria.banks (code, name)
    VALUES ('341-LOCAL', 'Banco Itau Local')
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          is_active = true
    RETURNING id INTO v_bank;

    INSERT INTO tesouraria.bank_accounts
        (bank_id, account_name, branch_number, account_number, account_type, pix_key, is_default, created_by, updated_by)
    VALUES
        (v_bank, 'Conta Operacional Local', '1234', '98765-1', 'CHECKING', 'financeiro-local@pix.example', true, v_user_id, v_user_id)
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
        v_supplier_a, v_category_maintenance, v_document_type, v_payment_term, v_cost_center, 'LOCAL-OPEN-001', 'A1',
        'Titulo aberto para validacao local', 'MANUAL', CURRENT_DATE - 2, 1000.00, 50.00, 0.00, s.id,
        'Seed local para fluxo aberto', v_user_id, v_user_id
      FROM financeiro.payable_title_statuses s
     WHERE s.code = 'OPEN'
       AND NOT EXISTS (
            SELECT 1 FROM financeiro.payable_titles t
             WHERE t.document_number = 'LOCAL-OPEN-001'
               AND coalesce(t.document_series, '') = 'A1'
               AND t.deleted_at IS NULL
       )
    RETURNING id INTO v_title_open;

    IF v_title_open IS NOT NULL THEN
        INSERT INTO financeiro.payable_installments
            (payable_title_id, installment_number, installment_count, amount, due_date, payment_method_id, open_balance, status_id, notes, created_by, updated_by)
        SELECT
            v_title_open, 1, 2, 475.00, CURRENT_DATE + 5, v_payment_method_boleto, 475.00, s.id, 'Parcela 1 seed local', v_user_id, v_user_id
          FROM financeiro.payable_installment_statuses s
         WHERE s.code = 'OPEN';

        INSERT INTO financeiro.payable_installments
            (payable_title_id, installment_number, installment_count, amount, due_date, payment_method_id, open_balance, status_id, notes, created_by, updated_by)
        SELECT
            v_title_open, 2, 2, 475.00, CURRENT_DATE + 35, v_payment_method_pix, 475.00, s.id, 'Parcela 2 seed local', v_user_id, v_user_id
          FROM financeiro.payable_installment_statuses s
         WHERE s.code = 'OPEN';
    END IF;

    INSERT INTO financeiro.payable_titles
        (supplier_id, category_id, document_type_id, payment_term_id, cost_center_id, document_number, document_series,
         description, origin_code, issue_date, original_amount, discount_amount, additional_amount, status_id, notes,
         created_by, updated_by)
    SELECT
        v_supplier_b, v_category_parts, v_document_type, v_payment_term, v_cost_center, 'LOCAL-PARTIAL-001', 'B1',
        'Titulo parcialmente pago para validacao local', 'MANUAL', CURRENT_DATE - 10, 800.00, 0.00, 0.00, s.id,
        'Seed local para fluxo parcial', v_user_id, v_user_id
      FROM financeiro.payable_title_statuses s
     WHERE s.code = 'PARTIALLY_PAID'
       AND NOT EXISTS (
            SELECT 1 FROM financeiro.payable_titles t
             WHERE t.document_number = 'LOCAL-PARTIAL-001'
               AND coalesce(t.document_series, '') = 'B1'
               AND t.deleted_at IS NULL
       )
    RETURNING id INTO v_title_partial;

    IF v_title_partial IS NOT NULL THEN
        INSERT INTO financeiro.payable_installments
            (payable_title_id, installment_number, installment_count, amount, due_date, payment_method_id, open_balance, status_id, notes, created_by, updated_by)
        SELECT
            v_title_partial, 1, 1, 800.00, CURRENT_DATE - 1, v_payment_method_pix, 300.00, s.id, 'Parcela parcial seed local', v_user_id, v_user_id
          FROM financeiro.payable_installment_statuses s
         WHERE s.code = 'PARTIALLY_PAID';
    END IF;

    IF v_title_partial IS NOT NULL
       AND NOT EXISTS (
            SELECT 1
              FROM financeiro.payments p
              JOIN financeiro.payable_installments i ON i.id = p.payable_installment_id
             WHERE i.payable_title_id = v_title_partial
               AND p.transaction_number = 'SEED-PARTIAL-001'
       ) THEN
        INSERT INTO financeiro.payments
            (payable_installment_id, bank_account_id, payment_method_id, payment_date, principal_amount, transaction_number, status_id, created_by, updated_by)
        SELECT
            i.id, v_bank_account, v_payment_method_pix, CURRENT_DATE - 1, 500.00, 'SEED-PARTIAL-001', s.id, v_user_id, v_user_id
          FROM financeiro.payable_installments i
          CROSS JOIN financeiro.payment_statuses s
         WHERE i.payable_title_id = v_title_partial
           AND s.code = 'EFFECTIVE';
    END IF;

    INSERT INTO financeiro.payable_titles
        (supplier_id, category_id, document_type_id, payment_term_id, cost_center_id, document_number, document_series,
         description, origin_code, issue_date, original_amount, discount_amount, additional_amount, status_id, notes,
         created_by, updated_by)
    SELECT
        v_supplier_a, v_category_parts, v_document_type, v_payment_term, v_cost_center, 'LOCAL-APPROVAL-001', 'C1',
        'Titulo em aprovacao para validacao local', 'MANUAL', CURRENT_DATE, 1500.00, 0.00, 25.00, s.id,
        'Seed local para aprovacao', v_user_id, v_user_id
      FROM financeiro.payable_title_statuses s
     WHERE s.code = 'IN_APPROVAL'
       AND NOT EXISTS (
            SELECT 1 FROM financeiro.payable_titles t
             WHERE t.document_number = 'LOCAL-APPROVAL-001'
               AND coalesce(t.document_series, '') = 'C1'
               AND t.deleted_at IS NULL
       )
    RETURNING id INTO v_title_approval;

    IF v_title_approval IS NOT NULL THEN
        INSERT INTO financeiro.payable_installments
            (payable_title_id, installment_number, installment_count, amount, due_date, payment_method_id, open_balance, status_id, notes, created_by, updated_by)
        SELECT
            v_title_approval, 1, 3, 508.33, CURRENT_DATE + 15, v_payment_method_boleto, 508.33, s.id, 'Parcela 1 aprovacao', v_user_id, v_user_id
          FROM financeiro.payable_installment_statuses s
         WHERE s.code = 'OPEN';
        INSERT INTO financeiro.payable_installments
            (payable_title_id, installment_number, installment_count, amount, due_date, payment_method_id, open_balance, status_id, notes, created_by, updated_by)
        SELECT
            v_title_approval, 2, 3, 508.33, CURRENT_DATE + 45, v_payment_method_boleto, 508.33, s.id, 'Parcela 2 aprovacao', v_user_id, v_user_id
          FROM financeiro.payable_installment_statuses s
         WHERE s.code = 'OPEN';
        INSERT INTO financeiro.payable_installments
            (payable_title_id, installment_number, installment_count, amount, due_date, payment_method_id, open_balance, status_id, notes, created_by, updated_by)
        SELECT
            v_title_approval, 3, 3, 508.34, CURRENT_DATE + 75, v_payment_method_pix, 508.34, s.id, 'Parcela 3 aprovacao', v_user_id, v_user_id
          FROM financeiro.payable_installment_statuses s
         WHERE s.code = 'OPEN';
    END IF;

    IF v_title_approval IS NOT NULL
       AND NOT EXISTS (
            SELECT 1 FROM financeiro.approvals a WHERE a.payable_title_id = v_title_approval
       ) THEN
        INSERT INTO financeiro.approvals
            (payable_title_id, approval_level, approver_id, status_id, created_by, updated_by)
        SELECT
            v_title_approval, 1, v_user_id, s.id, v_user_id, v_user_id
          FROM financeiro.approval_statuses s
         WHERE s.code = 'PENDING';
    END IF;

    INSERT INTO financeiro.payable_titles
        (supplier_id, category_id, document_type_id, payment_term_id, cost_center_id, document_number, document_series,
         description, origin_code, issue_date, original_amount, discount_amount, additional_amount, status_id, notes,
         created_by, updated_by)
    SELECT
        v_supplier_b, v_category_maintenance, v_document_type, v_payment_term, v_cost_center, 'LOCAL-OVERDUE-001', 'D1',
        'Titulo vencido para dashboard e agenda', 'MANUAL', CURRENT_DATE - 25, 620.00, 0.00, 0.00, s.id,
        'Seed local para agenda financeira', v_user_id, v_user_id
      FROM financeiro.payable_title_statuses s
     WHERE s.code = 'OVERDUE'
       AND NOT EXISTS (
            SELECT 1 FROM financeiro.payable_titles t
             WHERE t.document_number = 'LOCAL-OVERDUE-001'
               AND coalesce(t.document_series, '') = 'D1'
               AND t.deleted_at IS NULL
       )
    RETURNING id INTO v_title_overdue;

    IF v_title_overdue IS NOT NULL THEN
        INSERT INTO financeiro.payable_installments
            (payable_title_id, installment_number, installment_count, amount, due_date, payment_method_id, open_balance, status_id, notes, created_by, updated_by)
        SELECT
            v_title_overdue, 1, 1, 620.00, CURRENT_DATE - 3, v_payment_method_boleto, 620.00, s.id, 'Parcela vencida seed local', v_user_id, v_user_id
          FROM financeiro.payable_installment_statuses s
         WHERE s.code = 'OVERDUE';
    END IF;

    RAISE NOTICE 'PASS: seed local concluido com fornecedores, categorias, conta bancaria, titulos aberto/parcial/aprovacao/vencido';
END
$seed$;
