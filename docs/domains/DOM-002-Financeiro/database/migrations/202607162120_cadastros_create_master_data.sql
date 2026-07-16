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
