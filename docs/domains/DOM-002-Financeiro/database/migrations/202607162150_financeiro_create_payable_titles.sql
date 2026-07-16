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
