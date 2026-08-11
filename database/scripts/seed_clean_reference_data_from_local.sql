\set ON_ERROR_STOP on

-- FinControl
-- Seed limpo para carga manual na VPS.
--
-- Origem:
-- - Dados reais extraidos do PostgreSQL local em 2026-07-22:
--   empresas, parametros por empresa, categoria financeira, centros de custo,
--   bancos e contas bancarias.
-- - Dados complementares normalizados de docs/tabelas_fin_control.xlsx:
--   categorias REC-01/CX-01, tipos de documento, formas de pagamento e
--   condicoes de pagamento.
--
-- Observacoes:
-- - Este arquivo nao e migration.
-- - Nao executa TRUNCATE/DELETE. Se necessario, limpar as tabelas destino antes.
-- - Campos de auditoria created_by/updated_by/deleted_by ficam NULL para nao
--   depender do UUID de usuario do banco local.

BEGIN;

INSERT INTO cadastros.document_types (code, name, requires_fiscal_key, is_active)
VALUES
    ('CONTRACT', 'Contrato', false, true),
    ('BOLETO', 'Boleto', false, true),
    ('INVOICE', 'Nota Fiscal', true, true),
    ('UTILITY_BILL', 'Conta de Consumo', false, true),
    ('RECEIPT', 'Recibo', false, true),
    ('INTERNAL', 'Documento Interno', false, true)
ON CONFLICT (code) DO UPDATE
   SET name = EXCLUDED.name,
       requires_fiscal_key = EXCLUDED.requires_fiscal_key,
       is_active = EXCLUDED.is_active,
       updated_at = CURRENT_TIMESTAMP;

INSERT INTO cadastros.payment_methods (code, name, is_active)
VALUES
    ('CASH', 'Dinheiro', true),
    ('PIX', 'PIX', true),
    ('BOLETO', 'Boleto', true),
    ('BANK_TRANSFER', 'Transferencia Bancaria', true),
    ('DIRECT_DEBIT', 'Debito Automatico', true),
    ('CARD', 'Cartao', true),
    ('CHECK', 'Cheque', true),
    ('COMPENSATION', 'Compensacao', true),
    ('OTHER', 'Outros', true)
ON CONFLICT (code) DO UPDATE
   SET name = EXCLUDED.name,
       is_active = EXCLUDED.is_active,
       updated_at = CURRENT_TIMESTAMP;

INSERT INTO cadastros.payment_terms (code, name, installment_count, interval_days, is_active)
VALUES
    ('IMMEDIATE', 'A vista', 1, 0, true),
    ('NET_07', '7 dias', 1, 7, true),
    ('NET_15', '15 dias', 1, 15, true),
    ('NET_30', '30 dias', 1, 30, true),
    ('NET_45', '45 dias', 1, 45, true),
    ('NET_60', '60 dias', 1, 60, true),
    ('TWO_INSTALLMENTS', '2 parcelas', 2, 30, true),
    ('THREE_INSTALLMENTS', '3 parcelas', 3, 30, true),
    ('FOUR_INSTALLMENTS', '4 parcelas', 4, 30, true),
    ('FIVE_INSTALLMENTS', '5 parcelas', 5, 30, true),
    ('SIX_INSTALLMENTS', '6 parcelas', 6, 30, true),
    ('SEVEN_INSTALLMENTS', '7 parcelas', 7, 30, true),
    ('TWO_INSTALLMENTS_7D', '7/14 dias', 2, 7, true),
    ('THREE_INSTALLMENTS_7D', '7/14/21 dias', 3, 7, true),
    ('FOUR_INSTALLMENTS_7D', '7/14/21/28 dias', 4, 7, true),
    ('FIVE_INSTALLMENTS_7D', '7/14/21/28/35 dias', 5, 7, true),
    ('SIX_INSTALLMENTS_7D', '7/14/21/28/35/42 dias', 6, 7, true)
ON CONFLICT (code) DO UPDATE
   SET name = EXCLUDED.name,
       installment_count = EXCLUDED.installment_count,
       interval_days = EXCLUDED.interval_days,
       is_active = EXCLUDED.is_active,
       updated_at = CURRENT_TIMESTAMP;

INSERT INTO cadastros.financial_categories
    (code, name, nature_code, is_active, created_by, updated_by, deleted_at, deleted_by)
VALUES
    ('FORN-01', 'COMPRAS PRODUTOS', 'EXPENSE', true, NULL, NULL, NULL, NULL),
    ('REC-01', 'RECEBIMENTO', 'REVENUE', true, NULL, NULL, NULL, NULL),
    ('CX-01', 'RECEBIMENTO CAIXA', 'REVENUE', true, NULL, NULL, NULL, NULL)
ON CONFLICT (code) DO UPDATE
   SET name = EXCLUDED.name,
       nature_code = EXCLUDED.nature_code,
       is_active = EXCLUDED.is_active,
       deleted_at = NULL,
       deleted_by = NULL,
       updated_by = NULL,
       updated_at = CURRENT_TIMESTAMP;

INSERT INTO cadastros.cost_centers
    (code, name, description, parent_id, is_active, created_by, updated_by, deleted_at, deleted_by)
VALUES
    ('ADM-01', 'Administrativo ABC', 'Custos gerais e matriz', NULL, true, NULL, NULL, NULL, NULL),
    ('COM-01', 'Comercial/Vendas ABC', 'Gastos comerciais e marketing', NULL, true, NULL, NULL, NULL, NULL),
    ('OP-01', 'Operacao/Logistica ABC', 'Custos de operacao e entrega', NULL, true, NULL, NULL, NULL, NULL),
    ('PROJ-01', 'Projetos / Filiais ABC', 'Unidades de negocio', NULL, true, NULL, NULL, NULL, NULL),
    ('ADM-02', 'Administrativo HRM', 'Custos gerais e matriz', NULL, true, NULL, NULL, NULL, NULL),
    ('COM-02', 'Comercial/Vendas HRM', 'Gastos comerciais e marketing', NULL, true, NULL, NULL, NULL, NULL),
    ('OP-02', 'Operacao/Logistica HRM', 'Custos de operacao e entrega', NULL, true, NULL, NULL, NULL, NULL),
    ('PROJ-02', 'Projetos / Filiais HRM', 'Unidades de negocio', NULL, true, NULL, NULL, NULL, NULL)
ON CONFLICT (code) DO UPDATE
   SET name = EXCLUDED.name,
       description = EXCLUDED.description,
       parent_id = NULL,
       is_active = EXCLUDED.is_active,
       deleted_at = NULL,
       deleted_by = NULL,
       updated_by = NULL,
       updated_at = CURRENT_TIMESTAMP;

WITH children(code, name, description, parent_code) AS (
    VALUES
        ('CONT-01', 'Contabilidade ABC', 'Contabilidade e Auditoria', 'ADM-01'),
        ('RH-01', 'Recursos Humanos ABC', 'Recursos Humanos e Folha', 'ADM-01'),
        ('TI-01', 'TI ABC', 'Tecnologia da Informacao', 'ADM-01'),
        ('MKT-01', 'Marketing ABC', 'Marketing e Trafego Pago', 'COM-01'),
        ('VEND-01', 'Vendas ABC', 'Comissoes e Equipe de Vendas', 'COM-01'),
        ('EST-01', 'Estoque ABC', 'Armazenagem e Estoque', 'OP-01'),
        ('EMB-01', 'Embalagens ABC', 'Embalagens e Insumos', 'OP-01'),
        ('FRETE-01', 'Fretes ABC', 'Fretes e Expedicao', 'OP-01'),
        ('LJ-01', 'Loja Fisica ABC', 'Ponto de venda fisico', 'PROJ-01'),
        ('SITE-01', 'Loja Virtual ABC', 'Loja Virtual / E-commerce', 'PROJ-01'),
        ('CONT-02', 'Contabilidade HRM', 'Contabilidade e Auditoria', 'ADM-02'),
        ('RH-02', 'Recursos Humanos HRM', 'Recursos Humanos e Folha', 'ADM-02'),
        ('TI-02', 'TI HRM', 'Tecnologia da Informacao', 'ADM-02'),
        ('MKT-02', 'Marketing HRM', 'Marketing e Trafego Pago', 'COM-02'),
        ('VEND-02', 'Vendas HRM', 'Comissoes e Equipe de Vendas', 'COM-02'),
        ('EST-02', 'Estoque HRM', 'Armazenagem e Estoque', 'OP-02'),
        ('EMB-02', 'Embalagens HRM', 'Embalagens e Insumos', 'OP-02'),
        ('FRETE-02', 'Fretes HRM', 'Fretes e Expedicao', 'OP-02'),
        ('LJ-02', 'Loja Fisica HRM', 'Ponto de venda fisico', 'PROJ-02'),
        ('SITE-02', 'Loja Virtual HRM', 'Loja Virtual / E-commerce', 'PROJ-02')
)
INSERT INTO cadastros.cost_centers
    (code, name, description, parent_id, is_active, created_by, updated_by, deleted_at, deleted_by)
SELECT children.code,
       children.name,
       children.description,
       parents.id,
       true,
       NULL,
       NULL,
       NULL,
       NULL
  FROM children
  JOIN cadastros.cost_centers parents ON parents.code = children.parent_code
ON CONFLICT (code) DO UPDATE
   SET name = EXCLUDED.name,
       description = EXCLUDED.description,
       parent_id = EXCLUDED.parent_id,
       is_active = true,
       deleted_at = NULL,
       deleted_by = NULL,
       updated_by = NULL,
       updated_at = CURRENT_TIMESTAMP;

INSERT INTO tesouraria.banks (code, name, is_active)
VALUES
    ('BCO-01', 'INTER', true),
    ('BCO-02', 'MERCADO PAGO', true)
ON CONFLICT (code) DO UPDATE
   SET name = EXCLUDED.name,
       is_active = EXCLUDED.is_active,
       updated_at = CURRENT_TIMESTAMP;

DO $seed$
DECLARE
    v_abc_company_id uuid;
    v_hrm_company_id uuid;
    v_inter_bank_id uuid;
    v_abc_bank_account_id uuid;
    v_hrm_bank_account_id uuid;
BEGIN
    SELECT id INTO v_abc_company_id
      FROM cadastros.companies
     WHERE document_number = '51309435000153'
       AND deleted_at IS NULL
     LIMIT 1;

    IF v_abc_company_id IS NULL THEN
        INSERT INTO cadastros.companies
            (company_type, legal_name, trade_name, document_number, state_registration,
             municipal_registration, email, phone, postal_code, street, street_number,
             address_complement, neighborhood, city_id, state_id, notes, is_active,
             created_by, updated_by, deleted_at, deleted_by)
        VALUES
            ('MAIN', 'ABC CENTER DISTRIBUIDORA LTDA', 'ABC', '51309435000153', NULL,
             NULL, 'abcecenterdistribuidora@gmail.com', '11974261585', '09861650',
             'RUA ESTOCOLMO', '735', NULL, 'ASSUNCAO', NULL, NULL, NULL, true,
             NULL, NULL, NULL, NULL)
        RETURNING id INTO v_abc_company_id;
    ELSE
        UPDATE cadastros.companies
           SET parent_company_id = NULL,
               company_type = 'MAIN',
               legal_name = 'ABC CENTER DISTRIBUIDORA LTDA',
               trade_name = 'ABC',
               state_registration = NULL,
               municipal_registration = NULL,
               email = 'abcecenterdistribuidora@gmail.com',
               phone = '11974261585',
               postal_code = '09861650',
               street = 'RUA ESTOCOLMO',
               street_number = '735',
               address_complement = NULL,
               neighborhood = 'ASSUNCAO',
               city_id = NULL,
               state_id = NULL,
               notes = NULL,
               is_active = true,
               updated_by = NULL,
               deleted_at = NULL,
               deleted_by = NULL
         WHERE id = v_abc_company_id;
    END IF;

    SELECT id INTO v_hrm_company_id
      FROM cadastros.companies
     WHERE document_number = '19330326000105'
       AND deleted_at IS NULL
     LIMIT 1;

    IF v_hrm_company_id IS NULL THEN
        INSERT INTO cadastros.companies
            (parent_company_id, company_type, legal_name, trade_name, document_number,
             state_registration, municipal_registration, email, phone, postal_code,
             street, street_number, address_complement, neighborhood, city_id, state_id,
             notes, is_active, created_by, updated_by, deleted_at, deleted_by)
        VALUES
            (v_abc_company_id, 'BRANCH', 'HRM MOTOS PECAS LTDA', 'HRM', '19330326000105',
             NULL, NULL, 'hrmmotos@gmail.com', '11974261585', '09712055',
             'RUA TOTTA NOGUEIRA', '2', 'BLOCO 2', 'VILA EURO', NULL, NULL,
             'TESTE', true, NULL, NULL, NULL, NULL)
        RETURNING id INTO v_hrm_company_id;
    ELSE
        UPDATE cadastros.companies
           SET parent_company_id = v_abc_company_id,
               company_type = 'BRANCH',
               legal_name = 'HRM MOTOS PECAS LTDA',
               trade_name = 'HRM',
               state_registration = NULL,
               municipal_registration = NULL,
               email = 'hrmmotos@gmail.com',
               phone = '11974261585',
               postal_code = '09712055',
               street = 'RUA TOTTA NOGUEIRA',
               street_number = '2',
               address_complement = 'BLOCO 2',
               neighborhood = 'VILA EURO',
               city_id = NULL,
               state_id = NULL,
               notes = 'TESTE',
               is_active = true,
               updated_by = NULL,
               deleted_at = NULL,
               deleted_by = NULL
         WHERE id = v_hrm_company_id;
    END IF;

    SELECT id INTO v_inter_bank_id
      FROM tesouraria.banks
     WHERE code = 'BCO-01';

    SELECT id INTO v_abc_bank_account_id
      FROM tesouraria.bank_accounts
     WHERE bank_id = v_inter_bank_id
       AND branch_number = '1231'
       AND account_number = '546586'
       AND deleted_at IS NULL
     LIMIT 1;

    IF v_abc_bank_account_id IS NULL THEN
        INSERT INTO tesouraria.bank_accounts
            (bank_id, company_id, account_name, branch_number, account_number,
             account_type, pix_key, is_default, is_active, created_by, updated_by,
             deleted_at, deleted_by)
        VALUES
            (v_inter_bank_id, v_abc_company_id, 'INTER ABC', '1231', '546586',
             'CHECKING', '5130435000153', true, true, NULL, NULL, NULL, NULL)
        RETURNING id INTO v_abc_bank_account_id;
    ELSE
        UPDATE tesouraria.bank_accounts
           SET company_id = v_abc_company_id,
               account_name = 'INTER ABC',
               account_type = 'CHECKING',
               pix_key = '5130435000153',
               is_default = true,
               is_active = true,
               updated_by = NULL,
               deleted_at = NULL,
               deleted_by = NULL
         WHERE id = v_abc_bank_account_id;
    END IF;

    SELECT id INTO v_hrm_bank_account_id
      FROM tesouraria.bank_accounts
     WHERE bank_id = v_inter_bank_id
       AND branch_number = '15648'
       AND account_number = '1253559'
       AND deleted_at IS NULL
     LIMIT 1;

    IF v_hrm_bank_account_id IS NULL THEN
        INSERT INTO tesouraria.bank_accounts
            (bank_id, company_id, account_name, branch_number, account_number,
             account_type, pix_key, is_default, is_active, created_by, updated_by,
             deleted_at, deleted_by)
        VALUES
            (v_inter_bank_id, v_hrm_company_id, 'INTER HRM', '15648', '1253559',
             'CHECKING', '19330326000105', true, true, NULL, NULL, NULL, NULL)
        RETURNING id INTO v_hrm_bank_account_id;
    ELSE
        UPDATE tesouraria.bank_accounts
           SET company_id = v_hrm_company_id,
               account_name = 'INTER HRM',
               account_type = 'CHECKING',
               pix_key = '19330326000105',
               is_default = true,
               is_active = true,
               updated_by = NULL,
               deleted_at = NULL,
               deleted_by = NULL
         WHERE id = v_hrm_bank_account_id;
    END IF;

    INSERT INTO cadastros.company_parameters
        (company_id, default_payment_method_id, default_payment_term_id,
         default_cost_center_id, default_bank_account_id, default_document_type_id,
         default_financial_category_id, xml_auto_create_supplier,
         xml_require_known_recipient, fiscal_environment, notes, is_active,
         created_by, updated_by, deleted_at, deleted_by)
    VALUES
        (v_abc_company_id,
         (SELECT id FROM cadastros.payment_methods WHERE code = 'BOLETO'),
         (SELECT id FROM cadastros.payment_terms WHERE code = 'IMMEDIATE'),
         (SELECT id FROM cadastros.cost_centers WHERE code = 'EST-01'),
         v_abc_bank_account_id,
         (SELECT id FROM cadastros.document_types WHERE code = 'INVOICE'),
         (SELECT id FROM cadastros.financial_categories WHERE code = 'FORN-01'),
         true, false, 'PRODUCTION', NULL, true, NULL, NULL, NULL, NULL)
    ON CONFLICT (company_id) DO UPDATE
       SET default_payment_method_id = EXCLUDED.default_payment_method_id,
           default_payment_term_id = EXCLUDED.default_payment_term_id,
           default_cost_center_id = EXCLUDED.default_cost_center_id,
           default_bank_account_id = EXCLUDED.default_bank_account_id,
           default_document_type_id = EXCLUDED.default_document_type_id,
           default_financial_category_id = EXCLUDED.default_financial_category_id,
           xml_auto_create_supplier = EXCLUDED.xml_auto_create_supplier,
           xml_require_known_recipient = EXCLUDED.xml_require_known_recipient,
           fiscal_environment = EXCLUDED.fiscal_environment,
           notes = EXCLUDED.notes,
           is_active = true,
           updated_by = NULL,
           deleted_at = NULL,
           deleted_by = NULL,
           updated_at = CURRENT_TIMESTAMP;

    INSERT INTO cadastros.company_parameters
        (company_id, default_payment_method_id, default_payment_term_id,
         default_cost_center_id, default_bank_account_id, default_document_type_id,
         default_financial_category_id, xml_auto_create_supplier,
         xml_require_known_recipient, fiscal_environment, notes, is_active,
         created_by, updated_by, deleted_at, deleted_by)
    VALUES
        (v_hrm_company_id,
         (SELECT id FROM cadastros.payment_methods WHERE code = 'BOLETO'),
         (SELECT id FROM cadastros.payment_terms WHERE code = 'THREE_INSTALLMENTS'),
         (SELECT id FROM cadastros.cost_centers WHERE code = 'EST-02'),
         v_hrm_bank_account_id,
         (SELECT id FROM cadastros.document_types WHERE code = 'BOLETO'),
         NULL,
         true, true, 'PRODUCTION', NULL, true, NULL, NULL, NULL, NULL)
    ON CONFLICT (company_id) DO UPDATE
       SET default_payment_method_id = EXCLUDED.default_payment_method_id,
           default_payment_term_id = EXCLUDED.default_payment_term_id,
           default_cost_center_id = EXCLUDED.default_cost_center_id,
           default_bank_account_id = EXCLUDED.default_bank_account_id,
           default_document_type_id = EXCLUDED.default_document_type_id,
           default_financial_category_id = EXCLUDED.default_financial_category_id,
           xml_auto_create_supplier = EXCLUDED.xml_auto_create_supplier,
           xml_require_known_recipient = EXCLUDED.xml_require_known_recipient,
           fiscal_environment = EXCLUDED.fiscal_environment,
           notes = EXCLUDED.notes,
           is_active = true,
           updated_by = NULL,
           deleted_at = NULL,
           deleted_by = NULL,
           updated_at = CURRENT_TIMESTAMP;
END
$seed$;

DO $verify$
DECLARE
    v_missing_count integer;
BEGIN
    SELECT count(*) INTO v_missing_count
      FROM cadastros.company_parameters parameters
      LEFT JOIN cadastros.companies companies
             ON companies.id = parameters.company_id
      LEFT JOIN cadastros.payment_methods methods
             ON methods.id = parameters.default_payment_method_id
      LEFT JOIN cadastros.payment_terms terms
             ON terms.id = parameters.default_payment_term_id
      LEFT JOIN cadastros.cost_centers centers
             ON centers.id = parameters.default_cost_center_id
      LEFT JOIN tesouraria.bank_accounts accounts
             ON accounts.id = parameters.default_bank_account_id
      LEFT JOIN cadastros.document_types documents
             ON documents.id = parameters.default_document_type_id
     WHERE parameters.deleted_at IS NULL
       AND (companies.id IS NULL
            OR methods.id IS NULL
            OR terms.id IS NULL
            OR centers.id IS NULL
            OR accounts.id IS NULL
            OR documents.id IS NULL);

    IF v_missing_count > 0 THEN
        RAISE EXCEPTION 'Seed aplicado com % parametro(s) contendo referencia ausente.', v_missing_count;
    END IF;

    RAISE NOTICE 'PASS: seed limpo aplicado. Empresas=%, parametros=%, categorias=%, centros_custo=%, bancos=%, contas=%',
        (SELECT count(*) FROM cadastros.companies WHERE deleted_at IS NULL),
        (SELECT count(*) FROM cadastros.company_parameters WHERE deleted_at IS NULL),
        (SELECT count(*) FROM cadastros.financial_categories WHERE deleted_at IS NULL),
        (SELECT count(*) FROM cadastros.cost_centers WHERE deleted_at IS NULL),
        (SELECT count(*) FROM tesouraria.banks),
        (SELECT count(*) FROM tesouraria.bank_accounts WHERE deleted_at IS NULL);
END
$verify$;

COMMIT;
