
-- ===== 202607162000_core_enable_extensions.sql =====

-- FinControl
-- Migration: Enable required PostgreSQL extensions
-- Version: 0.1.0

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

COMMIT;

-- ===== 202607162010_core_create_schemas.sql =====

-- FinControl
-- Migration: Create schemas by business domain
-- Version: 0.1.0

BEGIN;

CREATE SCHEMA IF NOT EXISTS cadastros;
CREATE SCHEMA IF NOT EXISTS financeiro;
CREATE SCHEMA IF NOT EXISTS tesouraria;
CREATE SCHEMA IF NOT EXISTS administracao;
CREATE SCHEMA IF NOT EXISTS inteligencia;
CREATE SCHEMA IF NOT EXISTS integracoes;

COMMENT ON SCHEMA cadastros IS 'DOM-001 - Master data and auxiliary registrations.';
COMMENT ON SCHEMA financeiro IS 'DOM-002 - Accounts payable and financial obligations.';
COMMENT ON SCHEMA tesouraria IS 'DOM-003 - Banking, cash and treasury operations.';
COMMENT ON SCHEMA administracao IS 'DOM-004 - Users, permissions, configuration and audit.';
COMMENT ON SCHEMA inteligencia IS 'DOM-005 - Dashboards, reports and indicators.';
COMMENT ON SCHEMA integracoes IS 'DOM-006 - External systems and communication services.';

COMMIT;

-- ===== 202607162020_administracao_create_updated_at_function.sql =====

-- FinControl
-- Migration: Create shared updated_at trigger function
-- Version: 0.1.0

BEGIN;

CREATE OR REPLACE FUNCTION administracao.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION administracao.set_updated_at()
IS 'Automatically updates the updated_at timestamp before row updates.';

COMMIT;

-- ===== 202607162030_financeiro_create_status_tables.sql =====

-- FinControl
-- Migration: Create configurable financial status tables
-- Version: 0.1.0

BEGIN;

CREATE TABLE financeiro.payable_title_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(80) NOT NULL,
    description varchar(255),
    display_order integer NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payable_title_statuses_code UNIQUE (code),
    CONSTRAINT ck_payable_title_statuses_display_order CHECK (display_order >= 0)
);

CREATE TABLE financeiro.payable_installment_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(80) NOT NULL,
    description varchar(255),
    display_order integer NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payable_installment_statuses_code UNIQUE (code),
    CONSTRAINT ck_payable_installment_statuses_display_order CHECK (display_order >= 0)
);

CREATE TABLE financeiro.payment_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(80) NOT NULL,
    description varchar(255),
    display_order integer NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payment_statuses_code UNIQUE (code),
    CONSTRAINT ck_payment_statuses_display_order CHECK (display_order >= 0)
);

CREATE TABLE financeiro.payment_batch_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(80) NOT NULL,
    description varchar(255),
    display_order integer NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payment_batch_statuses_code UNIQUE (code),
    CONSTRAINT ck_payment_batch_statuses_display_order CHECK (display_order >= 0)
);

CREATE TABLE financeiro.approval_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(80) NOT NULL,
    description varchar(255),
    display_order integer NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_approval_statuses_code UNIQUE (code),
    CONSTRAINT ck_approval_statuses_display_order CHECK (display_order >= 0)
);

CREATE TRIGGER trg_payable_title_statuses_updated_at
BEFORE UPDATE ON financeiro.payable_title_statuses
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE TRIGGER trg_payable_installment_statuses_updated_at
BEFORE UPDATE ON financeiro.payable_installment_statuses
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE TRIGGER trg_payment_statuses_updated_at
BEFORE UPDATE ON financeiro.payment_statuses
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE TRIGGER trg_payment_batch_statuses_updated_at
BEFORE UPDATE ON financeiro.payment_batch_statuses
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE TRIGGER trg_approval_statuses_updated_at
BEFORE UPDATE ON financeiro.approval_statuses
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

COMMIT;

-- ===== 202607162040_administracao_create_audit_events.sql =====

-- FinControl
-- Migration: Create centralized audit event table
-- Version: 0.1.0

BEGIN;

CREATE TABLE administracao.audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_code varchar(40) NOT NULL,
    entity_name varchar(80) NOT NULL,
    entity_id uuid NOT NULL,
    action_code varchar(60) NOT NULL,
    previous_data jsonb,
    new_data jsonb,
    user_id uuid,
    source_code varchar(40),
    ip_address inet,
    user_agent varchar(500),
    correlation_id uuid,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_audit_events_payload
        CHECK (previous_data IS NOT NULL OR new_data IS NOT NULL OR action_code IS NOT NULL)
);

CREATE INDEX ix_audit_events_entity
    ON administracao.audit_events (entity_name, entity_id);

CREATE INDEX ix_audit_events_domain_created_at
    ON administracao.audit_events (domain_code, created_at DESC);

CREATE INDEX ix_audit_events_user_created_at
    ON administracao.audit_events (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX ix_audit_events_correlation_id
    ON administracao.audit_events (correlation_id)
    WHERE correlation_id IS NOT NULL;

COMMENT ON TABLE administracao.audit_events
IS 'Immutable application audit trail. Rows must not be updated or deleted by regular application roles.';

COMMIT;

-- ===== 202607162050_financeiro_seed_status_tables.sql =====

-- FinControl
-- Migration: Seed initial financial statuses
-- Version: 0.1.0

BEGIN;

INSERT INTO financeiro.payable_title_statuses
    (code, name, description, display_order, is_terminal)
VALUES
    ('DRAFT', 'Rascunho', 'Registro ainda não concluído.', 10, false),
    ('OPEN', 'Em Aberto', 'Título válido e com saldo em aberto.', 20, false),
    ('IN_APPROVAL', 'Em Aprovação', 'Título aguardando decisão de aprovação.', 30, false),
    ('APPROVED', 'Aprovado', 'Título aprovado para programação ou pagamento.', 40, false),
    ('SCHEDULED', 'Programado', 'Título incluído em programação de pagamento.', 50, false),
    ('PARTIALLY_PAID', 'Parcialmente Pago', 'Título possui pagamento e saldo restante.', 60, false),
    ('PAID', 'Pago', 'Título totalmente quitado.', 70, true),
    ('OVERDUE', 'Atrasado', 'Título vencido com saldo em aberto.', 80, false),
    ('REJECTED', 'Reprovado', 'Título reprovado, aguardando correção ou cancelamento.', 90, false),
    ('CANCELLED', 'Cancelado', 'Título encerrado sem quitação.', 100, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO financeiro.payable_installment_statuses
    (code, name, description, display_order, is_terminal)
VALUES
    ('OPEN', 'Em Aberto', 'Parcela com saldo em aberto.', 10, false),
    ('OVERDUE', 'Atrasada', 'Parcela vencida com saldo em aberto.', 20, false),
    ('PARTIALLY_PAID', 'Parcialmente Paga', 'Parcela com pagamento parcial.', 30, false),
    ('PAID', 'Paga', 'Parcela totalmente quitada.', 40, true),
    ('CANCELLED', 'Cancelada', 'Parcela cancelada.', 50, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO financeiro.payment_statuses
    (code, name, description, display_order, is_terminal)
VALUES
    ('EFFECTIVE', 'Efetivo', 'Pagamento válido e contabilizado.', 10, false),
    ('REVERSED', 'Estornado', 'Pagamento revertido.', 20, true),
    ('CANCELLED', 'Cancelado', 'Pagamento cancelado antes da efetivação.', 30, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO financeiro.payment_batch_statuses
    (code, name, description, display_order, is_terminal)
VALUES
    ('OPEN', 'Aberto', 'Lote em preparação.', 10, false),
    ('SCHEDULED', 'Programado', 'Lote programado para processamento.', 20, false),
    ('PROCESSING', 'Em Processamento', 'Lote em execução.', 30, false),
    ('PROCESSED', 'Processado', 'Lote processado com sucesso.', 40, true),
    ('PARTIALLY_PROCESSED', 'Parcialmente Processado', 'Parte dos itens foi processada.', 50, false),
    ('CANCELLED', 'Cancelado', 'Lote cancelado.', 60, true),
    ('FAILED', 'Falhou', 'Lote com falha de processamento.', 70, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO financeiro.approval_statuses
    (code, name, description, display_order, is_terminal)
VALUES
    ('PENDING', 'Pendente', 'Aguardando decisão.', 10, false),
    ('APPROVED', 'Aprovado', 'Etapa aprovada.', 20, true),
    ('REJECTED', 'Reprovado', 'Etapa reprovada.', 30, true),
    ('RETURNED', 'Devolvido', 'Devolvido para correção.', 40, false),
    ('CANCELLED', 'Cancelado', 'Etapa cancelada.', 50, true)
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- ===== 202607162100_administracao_create_users_and_roles.sql =====

-- FinControl
-- DOM-004: Minimal identity, roles and permissions required by financial FKs

BEGIN;

CREATE TABLE administracao.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name varchar(160) NOT NULL,
    email varchar(255) NOT NULL,
    password_hash varchar(255),
    is_master boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT fk_users_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_users_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TABLE administracao.roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(60) NOT NULL,
    name varchar(120) NOT NULL,
    description varchar(255),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_roles_code UNIQUE (code)
);

CREATE TABLE administracao.permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(100) NOT NULL,
    name varchar(160) NOT NULL,
    description varchar(255),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_permissions_code UNIQUE (code)
);

CREATE TABLE administracao.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id)
        REFERENCES administracao.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id)
        REFERENCES administracao.roles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_roles_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TABLE administracao.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id)
        REFERENCES administracao.roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id)
        REFERENCES administracao.permissions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_role_permissions_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON administracao.users
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON administracao.roles
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE TRIGGER trg_permissions_updated_at
BEFORE UPDATE ON administracao.permissions
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_users_active ON administracao.users (is_active) WHERE deleted_at IS NULL;
CREATE INDEX ix_user_roles_role ON administracao.user_roles (role_id);
CREATE INDEX ix_role_permissions_permission ON administracao.role_permissions (permission_id);

COMMIT;

-- ===== 202607162110_administracao_seed_roles_permissions.sql =====

-- FinControl
-- DOM-004: Initial roles and permissions

BEGIN;

INSERT INTO administracao.roles (code, name, description)
VALUES
    ('MASTER', 'Operador Master', 'Administrador funcional com poder para conceder permissões.'),
    ('FINANCIAL_MANAGER', 'Gestor Financeiro', 'Gestão, aprovação e autorização financeira.'),
    ('AP_OPERATOR', 'Operador de Contas a Pagar', 'Inclusão e manutenção de títulos.'),
    ('APPROVER', 'Aprovador', 'Aprovação e reprovação de títulos.'),
    ('AUDITOR', 'Auditor', 'Consulta e auditoria sem alteração.'),
    ('VIEWER', 'Consulta', 'Acesso somente para leitura.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO administracao.permissions (code, name, description)
VALUES
    ('PAYABLE_TITLE_CREATE', 'Cadastrar título', 'Permite cadastrar contas a pagar.'),
    ('PAYABLE_TITLE_UPDATE', 'Alterar título', 'Permite alterar títulos elegíveis.'),
    ('PAYABLE_TITLE_CANCEL', 'Cancelar título', 'Permite cancelar títulos.'),
    ('PAYABLE_TITLE_APPROVE', 'Aprovar título', 'Permite aprovar, reprovar ou devolver títulos.'),
    ('PAYMENT_CREATE', 'Registrar pagamento', 'Permite registrar pagamentos.'),
    ('PAYMENT_REVERSE', 'Estornar pagamento', 'Permite estornar pagamentos.'),
    ('PAYMENT_BATCH_MANAGE', 'Gerenciar lote', 'Permite criar e processar lotes.'),
    ('DUPLICATE_OVERRIDE', 'Prosseguir após alerta', 'Permite confirmar cadastro após alerta de duplicidade.'),
    ('PHYSICAL_MAINTENANCE', 'Manutenção física', 'Permite executar rotinas físicas restritas.'),
    ('AUDIT_VIEW', 'Consultar auditoria', 'Permite consultar trilhas de auditoria.')
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- ===== 202607162120_cadastros_create_master_data.sql =====

-- FinControl
-- DOM-001: Master data required by Accounts Payable

BEGIN;

CREATE TABLE cadastros.suppliers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_type varchar(20) NOT NULL,
    legal_name varchar(200) NOT NULL,
    trade_name varchar(200),
    document_number varchar(40),
    country_code char(2) NOT NULL DEFAULT 'BR',
    representative_name varchar(160),
    email varchar(255),
    phone varchar(40),
    notes text,
    is_foreign boolean NOT NULL DEFAULT false,
    is_approved boolean NOT NULL DEFAULT false,
    is_blocked boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT ck_suppliers_type CHECK (supplier_type IN ('INDIVIDUAL','COMPANY','FOREIGN')),
    CONSTRAINT fk_suppliers_created_by FOREIGN KEY (created_by) REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_suppliers_updated_by FOREIGN KEY (updated_by) REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_suppliers_deleted_by FOREIGN KEY (deleted_by) REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_suppliers_document_active
ON cadastros.suppliers (country_code, document_number)
WHERE document_number IS NOT NULL AND deleted_at IS NULL;

CREATE TABLE cadastros.financial_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid,
    code varchar(60) NOT NULL,
    name varchar(160) NOT NULL,
    nature_code varchar(30) NOT NULL DEFAULT 'EXPENSE',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT uq_financial_categories_code UNIQUE (code),
    CONSTRAINT fk_financial_categories_parent FOREIGN KEY (parent_id)
        REFERENCES cadastros.financial_categories(id) ON DELETE SET NULL,
    CONSTRAINT fk_financial_categories_created_by FOREIGN KEY (created_by) REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_financial_categories_updated_by FOREIGN KEY (updated_by) REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_financial_categories_deleted_by FOREIGN KEY (deleted_by) REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TABLE cadastros.cost_centers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_id uuid,
    code varchar(60) NOT NULL,
    name varchar(160) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT uq_cost_centers_code UNIQUE (code),
    CONSTRAINT fk_cost_centers_parent FOREIGN KEY (parent_id)
        REFERENCES cadastros.cost_centers(id) ON DELETE SET NULL,
    CONSTRAINT fk_cost_centers_created_by FOREIGN KEY (created_by) REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_cost_centers_updated_by FOREIGN KEY (updated_by) REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_cost_centers_deleted_by FOREIGN KEY (deleted_by) REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TABLE cadastros.document_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(120) NOT NULL,
    requires_fiscal_key boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_document_types_code UNIQUE (code)
);

CREATE TABLE cadastros.payment_methods (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(120) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payment_methods_code UNIQUE (code)
);

CREATE TABLE cadastros.payment_terms (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(120) NOT NULL,
    installment_count integer,
    interval_days integer,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payment_terms_code UNIQUE (code),
    CONSTRAINT ck_payment_terms_installments CHECK (installment_count IS NULL OR installment_count >= 1),
    CONSTRAINT ck_payment_terms_interval CHECK (interval_days IS NULL OR interval_days >= 0)
);

CREATE TABLE cadastros.attachment_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(120) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_attachment_types_code UNIQUE (code)
);

CREATE TRIGGER trg_suppliers_updated_at BEFORE UPDATE ON cadastros.suppliers
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();
CREATE TRIGGER trg_financial_categories_updated_at BEFORE UPDATE ON cadastros.financial_categories
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();
CREATE TRIGGER trg_cost_centers_updated_at BEFORE UPDATE ON cadastros.cost_centers
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();
CREATE TRIGGER trg_document_types_updated_at BEFORE UPDATE ON cadastros.document_types
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();
CREATE TRIGGER trg_payment_methods_updated_at BEFORE UPDATE ON cadastros.payment_methods
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();
CREATE TRIGGER trg_payment_terms_updated_at BEFORE UPDATE ON cadastros.payment_terms
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();
CREATE TRIGGER trg_attachment_types_updated_at BEFORE UPDATE ON cadastros.attachment_types
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_suppliers_name ON cadastros.suppliers (legal_name);
CREATE INDEX ix_suppliers_active ON cadastros.suppliers (is_active) WHERE deleted_at IS NULL;
CREATE INDEX ix_categories_parent ON cadastros.financial_categories (parent_id);
CREATE INDEX ix_cost_centers_parent ON cadastros.cost_centers (parent_id);

COMMIT;

-- ===== 202607162130_cadastros_seed_master_data.sql =====

-- FinControl
-- DOM-001: Initial master data

BEGIN;

INSERT INTO cadastros.document_types (code, name, requires_fiscal_key)
VALUES
    ('INVOICE', 'Nota Fiscal', true),
    ('BOLETO', 'Boleto', false),
    ('CONTRACT', 'Contrato', false),
    ('UTILITY_BILL', 'Conta de Consumo', false),
    ('RECEIPT', 'Recibo', false),
    ('INTERNAL', 'Documento Interno', false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO cadastros.payment_methods (code, name)
VALUES
    ('PIX', 'PIX'),
    ('BOLETO', 'Boleto'),
    ('BANK_TRANSFER', 'Transferência Bancária'),
    ('DIRECT_DEBIT', 'Débito Automático'),
    ('CARD', 'Cartão'),
    ('CASH', 'Dinheiro'),
    ('CHECK', 'Cheque'),
    ('COMPENSATION', 'Compensação'),
    ('OTHER', 'Outros')
ON CONFLICT (code) DO NOTHING;

INSERT INTO cadastros.attachment_types (code, name)
VALUES
    ('XML', 'XML da Nota Fiscal'),
    ('INVOICE_PDF', 'PDF da Nota Fiscal'),
    ('BOLETO', 'Boleto'),
    ('PAYMENT_RECEIPT', 'Comprovante de Pagamento'),
    ('CONTRACT', 'Contrato'),
    ('IMAGE', 'Imagem'),
    ('OTHER', 'Outro')
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- ===== 202607162140_tesouraria_create_banks_accounts.sql =====

-- FinControl
-- DOM-003: Minimal banks and bank accounts

BEGIN;

CREATE TABLE tesouraria.banks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(20) NOT NULL,
    name varchar(160) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_banks_code UNIQUE (code)
);

CREATE TABLE tesouraria.bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id uuid NOT NULL,
    account_name varchar(160) NOT NULL,
    branch_number varchar(30),
    account_number varchar(40) NOT NULL,
    account_type varchar(30) NOT NULL DEFAULT 'CHECKING',
    pix_key varchar(255),
    is_default boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT fk_bank_accounts_bank FOREIGN KEY (bank_id)
        REFERENCES tesouraria.banks(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bank_accounts_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_bank_accounts_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_bank_accounts_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_banks_updated_at BEFORE UPDATE ON tesouraria.banks
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();
CREATE TRIGGER trg_bank_accounts_updated_at BEFORE UPDATE ON tesouraria.bank_accounts
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE UNIQUE INDEX uq_bank_accounts_number_active
ON tesouraria.bank_accounts (bank_id, branch_number, account_number)
WHERE deleted_at IS NULL;

COMMIT;

-- ===== 202607162150_financeiro_create_payable_titles.sql =====

-- FinControl
-- DOM-002: Payable titles

BEGIN;

CREATE TABLE financeiro.payable_titles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL,
    category_id uuid NOT NULL,
    document_type_id uuid NOT NULL,
    payment_term_id uuid,
    cost_center_id uuid,
    document_number varchar(80) NOT NULL,
    document_series varchar(30),
    description varchar(255) NOT NULL,
    origin_code varchar(30) NOT NULL DEFAULT 'MANUAL',
    issue_date date NOT NULL,
    original_amount numeric(18,2) NOT NULL,
    discount_amount numeric(18,2) NOT NULL DEFAULT 0,
    additional_amount numeric(18,2) NOT NULL DEFAULT 0,
    total_amount numeric(18,2) GENERATED ALWAYS AS
        (original_amount - discount_amount + additional_amount) STORED,
    status_id uuid NOT NULL,
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    duplicate_warning_confirmed boolean NOT NULL DEFAULT false,
    duplicate_warning_confirmed_by uuid,
    duplicate_warning_confirmed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT fk_payable_titles_supplier FOREIGN KEY (supplier_id)
        REFERENCES cadastros.suppliers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_titles_category FOREIGN KEY (category_id)
        REFERENCES cadastros.financial_categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_titles_document_type FOREIGN KEY (document_type_id)
        REFERENCES cadastros.document_types(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_titles_payment_term FOREIGN KEY (payment_term_id)
        REFERENCES cadastros.payment_terms(id) ON DELETE SET NULL,
    CONSTRAINT fk_payable_titles_cost_center FOREIGN KEY (cost_center_id)
        REFERENCES cadastros.cost_centers(id) ON DELETE SET NULL,
    CONSTRAINT fk_payable_titles_status FOREIGN KEY (status_id)
        REFERENCES financeiro.payable_title_statuses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_titles_duplicate_user FOREIGN KEY (duplicate_warning_confirmed_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_payable_titles_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_titles_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_titles_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT ck_payable_titles_origin CHECK (origin_code IN ('MANUAL','XML','INTEGRATION')),
    CONSTRAINT ck_payable_titles_original_amount CHECK (original_amount > 0),
    CONSTRAINT ck_payable_titles_discount_amount CHECK (discount_amount >= 0),
    CONSTRAINT ck_payable_titles_additional_amount CHECK (additional_amount >= 0),
    CONSTRAINT ck_payable_titles_total_amount CHECK (original_amount - discount_amount + additional_amount > 0),
    CONSTRAINT ck_payable_titles_duplicate_confirmation CHECK (
        duplicate_warning_confirmed = false OR
        (duplicate_warning_confirmed_by IS NOT NULL AND duplicate_warning_confirmed_at IS NOT NULL)
    )
);

CREATE TRIGGER trg_payable_titles_updated_at
BEFORE UPDATE ON financeiro.payable_titles
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_payable_titles_supplier_document
ON financeiro.payable_titles (supplier_id, document_number, document_series);

CREATE INDEX ix_payable_titles_status
ON financeiro.payable_titles (status_id)
WHERE deleted_at IS NULL;

CREATE INDEX ix_payable_titles_issue_date
ON financeiro.payable_titles (issue_date DESC);

CREATE INDEX ix_payable_titles_category
ON financeiro.payable_titles (category_id);

COMMIT;

-- ===== 202607162160_financeiro_create_installments.sql =====

-- FinControl
-- DOM-002: Payable installments

BEGIN;

CREATE TABLE financeiro.payable_installments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_title_id uuid NOT NULL,
    installment_number integer NOT NULL,
    installment_count integer NOT NULL,
    amount numeric(18,2) NOT NULL,
    due_date date NOT NULL,
    payment_method_id uuid NOT NULL,
    open_balance numeric(18,2) NOT NULL,
    status_id uuid NOT NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT fk_installments_title FOREIGN KEY (payable_title_id)
        REFERENCES financeiro.payable_titles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_installments_method FOREIGN KEY (payment_method_id)
        REFERENCES cadastros.payment_methods(id) ON DELETE RESTRICT,
    CONSTRAINT fk_installments_status FOREIGN KEY (status_id)
        REFERENCES financeiro.payable_installment_statuses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_installments_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_installments_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_installments_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_installments_title_number UNIQUE (payable_title_id, installment_number),
    CONSTRAINT ck_installments_number CHECK (installment_number >= 1),
    CONSTRAINT ck_installments_count CHECK (installment_count >= 1),
    CONSTRAINT ck_installments_sequence CHECK (installment_number <= installment_count),
    CONSTRAINT ck_installments_amount CHECK (amount > 0),
    CONSTRAINT ck_installments_balance CHECK (open_balance >= 0)
);

CREATE TRIGGER trg_payable_installments_updated_at
BEFORE UPDATE ON financeiro.payable_installments
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_installments_due_status
ON financeiro.payable_installments (due_date, status_id)
WHERE deleted_at IS NULL;

CREATE INDEX ix_installments_title
ON financeiro.payable_installments (payable_title_id);

COMMIT;

-- ===== 202607162170_financeiro_create_tags_attachments.sql =====

-- FinControl
-- DOM-002: Tags and attachments

BEGIN;

CREATE TABLE financeiro.tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(80) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT uq_tags_name UNIQUE (name),
    CONSTRAINT fk_tags_created_by FOREIGN KEY (created_by) REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tags_updated_by FOREIGN KEY (updated_by) REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tags_deleted_by FOREIGN KEY (deleted_by) REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TABLE financeiro.payable_title_tags (
    payable_title_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    PRIMARY KEY (payable_title_id, tag_id),
    CONSTRAINT fk_title_tags_title FOREIGN KEY (payable_title_id)
        REFERENCES financeiro.payable_titles(id) ON DELETE CASCADE,
    CONSTRAINT fk_title_tags_tag FOREIGN KEY (tag_id)
        REFERENCES financeiro.tags(id) ON DELETE RESTRICT,
    CONSTRAINT fk_title_tags_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TABLE financeiro.attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_title_id uuid,
    payment_id uuid,
    attachment_type_id uuid NOT NULL,
    original_name varchar(255) NOT NULL,
    stored_name varchar(255) NOT NULL,
    relative_path varchar(500) NOT NULL,
    mime_type varchar(120) NOT NULL,
    size_bytes bigint NOT NULL,
    file_hash varchar(128) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT fk_attachments_title FOREIGN KEY (payable_title_id)
        REFERENCES financeiro.payable_titles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_attachments_type FOREIGN KEY (attachment_type_id)
        REFERENCES cadastros.attachment_types(id) ON DELETE RESTRICT,
    CONSTRAINT fk_attachments_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_attachments_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT ck_attachments_owner CHECK (
        payable_title_id IS NOT NULL OR payment_id IS NOT NULL
    ),
    CONSTRAINT ck_attachments_size CHECK (size_bytes > 0)
);

CREATE TRIGGER trg_tags_updated_at BEFORE UPDATE ON financeiro.tags
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_title_tags_tag ON financeiro.payable_title_tags (tag_id);
CREATE INDEX ix_attachments_title ON financeiro.attachments (payable_title_id);
CREATE INDEX ix_attachments_hash ON financeiro.attachments (file_hash);

COMMIT;

-- ===== 202607162180_financeiro_create_approvals.sql =====

-- FinControl
-- DOM-002: Approval workflow records

BEGIN;

CREATE TABLE financeiro.approvals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_title_id uuid NOT NULL,
    approval_level integer NOT NULL,
    approver_id uuid NOT NULL,
    status_id uuid NOT NULL,
    reason text,
    decided_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL,
    CONSTRAINT fk_approvals_title FOREIGN KEY (payable_title_id)
        REFERENCES financeiro.payable_titles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_approvals_approver FOREIGN KEY (approver_id)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_approvals_status FOREIGN KEY (status_id)
        REFERENCES financeiro.approval_statuses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_approvals_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_approvals_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_approvals_title_level_approver UNIQUE (payable_title_id, approval_level, approver_id),
    CONSTRAINT ck_approvals_level CHECK (approval_level >= 1)
);

CREATE TRIGGER trg_approvals_updated_at BEFORE UPDATE ON financeiro.approvals
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_approvals_pending
ON financeiro.approvals (approver_id, status_id, created_at);

CREATE INDEX ix_approvals_title
ON financeiro.approvals (payable_title_id, approval_level);

COMMIT;

-- ===== 202607162190_financeiro_create_payment_batches.sql =====

-- FinControl
-- DOM-002: Payment batches

BEGIN;

CREATE TABLE financeiro.payment_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code varchar(40) NOT NULL,
    bank_account_id uuid NOT NULL,
    scheduled_date date NOT NULL,
    status_id uuid NOT NULL,
    total_amount numeric(18,2) NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL,
    cancelled_at timestamptz,
    cancelled_by uuid,
    cancellation_reason text,
    CONSTRAINT uq_payment_batches_code UNIQUE (batch_code),
    CONSTRAINT fk_batches_bank_account FOREIGN KEY (bank_account_id)
        REFERENCES tesouraria.bank_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_batches_status FOREIGN KEY (status_id)
        REFERENCES financeiro.payment_batch_statuses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_batches_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_batches_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_batches_cancelled_by FOREIGN KEY (cancelled_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT ck_batches_total CHECK (total_amount >= 0),
    CONSTRAINT ck_batches_cancel_data CHECK (
        cancelled_at IS NULL OR (cancelled_by IS NOT NULL AND cancellation_reason IS NOT NULL)
    )
);

CREATE TRIGGER trg_payment_batches_updated_at BEFORE UPDATE ON financeiro.payment_batches
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_payment_batches_scheduled
ON financeiro.payment_batches (scheduled_date, status_id);

COMMIT;

-- ===== 202607162200_financeiro_create_payments_reversals.sql =====

-- FinControl
-- DOM-002: Payments and reversals

BEGIN;

CREATE TABLE financeiro.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_installment_id uuid NOT NULL,
    payment_batch_id uuid,
    bank_account_id uuid NOT NULL,
    payment_method_id uuid NOT NULL,
    payment_date date NOT NULL,
    principal_amount numeric(18,2) NOT NULL,
    interest_amount numeric(18,2) NOT NULL DEFAULT 0,
    penalty_amount numeric(18,2) NOT NULL DEFAULT 0,
    discount_amount numeric(18,2) NOT NULL DEFAULT 0,
    additional_amount numeric(18,2) NOT NULL DEFAULT 0,
    movement_amount numeric(18,2) GENERATED ALWAYS AS
        (principal_amount + interest_amount + penalty_amount + additional_amount - discount_amount) STORED,
    transaction_number varchar(100),
    overpayment_confirmed boolean NOT NULL DEFAULT false,
    overpayment_confirmed_by uuid,
    overpayment_confirmed_at timestamptz,
    status_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL,
    CONSTRAINT fk_payments_installment FOREIGN KEY (payable_installment_id)
        REFERENCES financeiro.payable_installments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_batch FOREIGN KEY (payment_batch_id)
        REFERENCES financeiro.payment_batches(id) ON DELETE SET NULL,
    CONSTRAINT fk_payments_bank_account FOREIGN KEY (bank_account_id)
        REFERENCES tesouraria.bank_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_method FOREIGN KEY (payment_method_id)
        REFERENCES cadastros.payment_methods(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_status FOREIGN KEY (status_id)
        REFERENCES financeiro.payment_statuses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_overpayment_user FOREIGN KEY (overpayment_confirmed_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_payments_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_payments_principal CHECK (principal_amount > 0),
    CONSTRAINT ck_payments_interest CHECK (interest_amount >= 0),
    CONSTRAINT ck_payments_penalty CHECK (penalty_amount >= 0),
    CONSTRAINT ck_payments_discount CHECK (discount_amount >= 0),
    CONSTRAINT ck_payments_additional CHECK (additional_amount >= 0),
    CONSTRAINT ck_payments_movement CHECK (
        principal_amount + interest_amount + penalty_amount + additional_amount - discount_amount > 0
    ),
    CONSTRAINT ck_payments_overpayment_confirmation CHECK (
        overpayment_confirmed = false OR
        (overpayment_confirmed_by IS NOT NULL AND overpayment_confirmed_at IS NOT NULL)
    )
);

CREATE TABLE financeiro.payment_reversals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL,
    reason text NOT NULL,
    reversed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reversed_by uuid NOT NULL,
    CONSTRAINT fk_reversals_payment FOREIGN KEY (payment_id)
        REFERENCES financeiro.payments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_reversals_user FOREIGN KEY (reversed_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_reversals_payment UNIQUE (payment_id)
);

ALTER TABLE financeiro.attachments
ADD CONSTRAINT fk_attachments_payment FOREIGN KEY (payment_id)
REFERENCES financeiro.payments(id) ON DELETE RESTRICT;

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON financeiro.payments
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_payments_installment ON financeiro.payments (payable_installment_id);
CREATE INDEX ix_payments_batch ON financeiro.payments (payment_batch_id) WHERE payment_batch_id IS NOT NULL;
CREATE INDEX ix_payments_date ON financeiro.payments (payment_date DESC);
CREATE INDEX ix_reversals_date ON financeiro.payment_reversals (reversed_at DESC);

COMMIT;

-- ===== 202607162210_financeiro_create_xml_imports.sql =====

-- FinControl
-- DOM-002: XML imports

BEGIN;

CREATE TABLE financeiro.xml_import_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(100) NOT NULL,
    is_terminal boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_xml_import_statuses_code UNIQUE (code)
);

CREATE TABLE financeiro.xml_imports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    access_key varchar(60),
    attachment_id uuid NOT NULL,
    status_id uuid NOT NULL,
    error_message text,
    generated_title_id uuid,
    imported_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    imported_by uuid NOT NULL,
    CONSTRAINT fk_xml_imports_attachment FOREIGN KEY (attachment_id)
        REFERENCES financeiro.attachments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_xml_imports_status FOREIGN KEY (status_id)
        REFERENCES financeiro.xml_import_statuses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_xml_imports_title FOREIGN KEY (generated_title_id)
        REFERENCES financeiro.payable_titles(id) ON DELETE SET NULL,
    CONSTRAINT fk_xml_imports_user FOREIGN KEY (imported_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_xml_import_statuses_updated_at BEFORE UPDATE ON financeiro.xml_import_statuses
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE UNIQUE INDEX uq_xml_imports_access_key
ON financeiro.xml_imports (access_key)
WHERE access_key IS NOT NULL;

CREATE INDEX ix_xml_imports_status ON financeiro.xml_imports (status_id, imported_at DESC);

INSERT INTO financeiro.xml_import_statuses (code, name, is_terminal)
VALUES
    ('RECEIVED', 'Recebido', false),
    ('PROCESSING', 'Em Processamento', false),
    ('PROCESSED', 'Processado', true),
    ('WARNING', 'Processado com Alertas', true),
    ('ERROR', 'Erro', true)
ON CONFLICT (code) DO NOTHING;

COMMIT;

-- ===== 202607162220_financeiro_create_balance_functions.sql =====

-- FinControl
-- DOM-002: Financial balance helper functions

BEGIN;

CREATE OR REPLACE FUNCTION financeiro.calculate_installment_paid_amount(p_installment_id uuid)
RETURNS numeric(18,2)
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(SUM(p.principal_amount), 0)::numeric(18,2)
    FROM financeiro.payments p
    JOIN financeiro.payment_statuses ps ON ps.id = p.status_id
    LEFT JOIN financeiro.payment_reversals pr ON pr.payment_id = p.id
    WHERE p.payable_installment_id = p_installment_id
      AND ps.code = 'EFFECTIVE'
      AND pr.id IS NULL;
$$;

CREATE OR REPLACE FUNCTION financeiro.recalculate_installment_balance(p_installment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_amount numeric(18,2);
    v_paid numeric(18,2);
    v_balance numeric(18,2);
    v_status_id uuid;
    v_due_date date;
BEGIN
    SELECT amount, due_date
      INTO v_amount, v_due_date
    FROM financeiro.payable_installments
    WHERE id = p_installment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Installment % not found', p_installment_id;
    END IF;

    v_paid := financeiro.calculate_installment_paid_amount(p_installment_id);
    v_balance := GREATEST(v_amount - v_paid, 0);

    SELECT id INTO v_status_id
    FROM financeiro.payable_installment_statuses
    WHERE code =
        CASE
            WHEN v_balance = 0 THEN 'PAID'
            WHEN v_paid > 0 THEN 'PARTIALLY_PAID'
            WHEN v_due_date < CURRENT_DATE THEN 'OVERDUE'
            ELSE 'OPEN'
        END;

    UPDATE financeiro.payable_installments
       SET open_balance = v_balance,
           status_id = v_status_id
     WHERE id = p_installment_id;
END;
$$;

CREATE OR REPLACE FUNCTION financeiro.trg_payment_recalculate_installment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM financeiro.recalculate_installment_balance(
        COALESCE(NEW.payable_installment_id, OLD.payable_installment_id)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION financeiro.trg_reversal_recalculate_installment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_installment_id uuid;
BEGIN
    SELECT payable_installment_id
      INTO v_installment_id
      FROM financeiro.payments
     WHERE id = NEW.payment_id;

    PERFORM financeiro.recalculate_installment_balance(v_installment_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payments_recalculate_installment
AFTER INSERT OR UPDATE OF status_id, principal_amount ON financeiro.payments
FOR EACH ROW EXECUTE FUNCTION financeiro.trg_payment_recalculate_installment();

CREATE TRIGGER trg_reversals_recalculate_installment
AFTER INSERT ON financeiro.payment_reversals
FOR EACH ROW EXECUTE FUNCTION financeiro.trg_reversal_recalculate_installment();

COMMIT;

-- ===== 202607162230_financeiro_create_soft_delete_procedures.sql =====

-- FinControl
-- DOM-002: Controlled logical deletion procedures

BEGIN;

CREATE OR REPLACE FUNCTION financeiro.soft_delete_payable_title(
    p_title_id uuid,
    p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_has_payments boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM financeiro.payable_installments i
        JOIN financeiro.payments p ON p.payable_installment_id = i.id
        LEFT JOIN financeiro.payment_reversals r ON r.payment_id = p.id
        WHERE i.payable_title_id = p_title_id
          AND r.id IS NULL
    ) INTO v_has_payments;

    IF v_has_payments THEN
        RAISE EXCEPTION 'Title % has effective payments and cannot be logically deleted', p_title_id;
    END IF;

    UPDATE financeiro.payable_titles
       SET is_active = false,
           deleted_at = CURRENT_TIMESTAMP,
           deleted_by = p_user_id,
           updated_by = p_user_id
     WHERE id = p_title_id
       AND deleted_at IS NULL;

    UPDATE financeiro.payable_installments
       SET deleted_at = CURRENT_TIMESTAMP,
           deleted_by = p_user_id,
           updated_by = p_user_id
     WHERE payable_title_id = p_title_id
       AND deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION financeiro.soft_delete_payable_title(uuid, uuid)
IS 'Performs controlled logical deletion of a title and its unpaid installments.';

COMMIT;

-- ===== 202607162240_financeiro_create_views.sql =====

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

-- ===== 202607162250_financeiro_create_maintenance_log.sql =====

-- FinControl
-- Administrative maintenance tracking

BEGIN;

CREATE TABLE administracao.maintenance_operations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_code varchar(60) NOT NULL,
    entity_name varchar(100) NOT NULL,
    entity_id uuid,
    reason text NOT NULL,
    requested_by uuid NOT NULL,
    approved_by uuid,
    executed_by uuid,
    requested_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at timestamptz,
    executed_at timestamptz,
    result_code varchar(30),
    result_details jsonb,
    CONSTRAINT fk_maintenance_requested_by FOREIGN KEY (requested_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_maintenance_approved_by FOREIGN KEY (approved_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_maintenance_executed_by FOREIGN KEY (executed_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT
);

CREATE INDEX ix_maintenance_operations_entity
ON administracao.maintenance_operations (entity_name, entity_id);

CREATE INDEX ix_maintenance_operations_requested
ON administracao.maintenance_operations (requested_at DESC);

COMMIT;

-- ===== 202607162260_financeiro_create_validation_functions.sql =====

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

-- ===== 202607162270_core_grants_template.sql =====

-- FinControl
-- Security grants template
-- Replace role names according to each environment before production.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fincontrol_app') THEN
        CREATE ROLE fincontrol_app NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fincontrol_readonly') THEN
        CREATE ROLE fincontrol_readonly NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fincontrol_migration') THEN
        CREATE ROLE fincontrol_migration NOLOGIN;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA cadastros, financeiro, tesouraria, administracao
TO fincontrol_app, fincontrol_readonly;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA cadastros, financeiro, tesouraria
TO fincontrol_app;

GRANT SELECT, INSERT ON administracao.audit_events
TO fincontrol_app;

GRANT SELECT ON ALL TABLES IN SCHEMA cadastros, financeiro, tesouraria, administracao
TO fincontrol_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA cadastros, financeiro, tesouraria
GRANT SELECT, INSERT, UPDATE ON TABLES TO fincontrol_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA cadastros, financeiro, tesouraria, administracao
GRANT SELECT ON TABLES TO fincontrol_readonly;

REVOKE UPDATE, DELETE ON administracao.audit_events FROM fincontrol_app;
REVOKE DELETE ON ALL TABLES IN SCHEMA financeiro FROM fincontrol_app;

COMMIT;

-- ===== 202607162280_core_schema_version.sql =====

-- FinControl
-- Internal migration registry

BEGIN;

CREATE TABLE administracao.schema_versions (
    version varchar(40) PRIMARY KEY,
    description varchar(255) NOT NULL,
    checksum varchar(128),
    applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    applied_by varchar(160) NOT NULL DEFAULT CURRENT_USER
);

COMMENT ON TABLE administracao.schema_versions
IS 'Optional internal migration registry; migration framework may use its own table.';

COMMIT;
