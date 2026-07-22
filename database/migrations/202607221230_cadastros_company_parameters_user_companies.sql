BEGIN;

CREATE TABLE cadastros.company_parameters (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    default_payment_method_id uuid,
    default_payment_term_id uuid,
    default_cost_center_id uuid,
    default_bank_account_id uuid,
    default_document_type_id uuid,
    xml_auto_create_supplier boolean NOT NULL DEFAULT true,
    xml_require_known_recipient boolean NOT NULL DEFAULT false,
    fiscal_environment varchar(20) NOT NULL DEFAULT 'PRODUCTION',
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT uq_company_parameters_company UNIQUE (company_id),
    CONSTRAINT ck_company_parameters_fiscal_environment CHECK (fiscal_environment IN ('PRODUCTION', 'HOMOLOGATION')),
    CONSTRAINT fk_company_parameters_company FOREIGN KEY (company_id)
        REFERENCES cadastros.companies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_parameters_payment_method FOREIGN KEY (default_payment_method_id)
        REFERENCES cadastros.payment_methods(id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_parameters_payment_term FOREIGN KEY (default_payment_term_id)
        REFERENCES cadastros.payment_terms(id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_parameters_cost_center FOREIGN KEY (default_cost_center_id)
        REFERENCES cadastros.cost_centers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_parameters_bank_account FOREIGN KEY (default_bank_account_id)
        REFERENCES tesouraria.bank_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_parameters_document_type FOREIGN KEY (default_document_type_id)
        REFERENCES cadastros.document_types(id) ON DELETE RESTRICT,
    CONSTRAINT fk_company_parameters_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_company_parameters_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_company_parameters_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TABLE administracao.user_companies (
    user_id uuid NOT NULL,
    company_id uuid NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    access_scope varchar(30) NOT NULL DEFAULT 'OPERATIONAL',
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    PRIMARY KEY (user_id, company_id),
    CONSTRAINT ck_user_companies_access_scope CHECK (access_scope IN ('OPERATIONAL', 'VIEW_ONLY')),
    CONSTRAINT fk_user_companies_user FOREIGN KEY (user_id)
        REFERENCES administracao.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_companies_company FOREIGN KEY (company_id)
        REFERENCES cadastros.companies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_companies_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_companies_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_user_companies_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_user_companies_default_active
ON administracao.user_companies (user_id)
WHERE is_default AND is_active AND deleted_at IS NULL;

CREATE INDEX ix_company_parameters_active
ON cadastros.company_parameters (company_id, is_active)
WHERE deleted_at IS NULL;

CREATE INDEX ix_user_companies_company
ON administracao.user_companies (company_id, is_active)
WHERE deleted_at IS NULL;

CREATE TRIGGER trg_company_parameters_updated_at
BEFORE UPDATE ON cadastros.company_parameters
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE TRIGGER trg_user_companies_updated_at
BEFORE UPDATE ON administracao.user_companies
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

COMMENT ON TABLE cadastros.company_parameters
IS 'Parâmetros financeiros e operacionais controlados por empresa própria.';

COMMENT ON TABLE administracao.user_companies
IS 'Vínculo de acesso entre usuários e empresas próprias, base para contexto multiempresa futuro.';

COMMIT;
