BEGIN;

CREATE TABLE cadastros.companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    parent_company_id uuid,
    company_type varchar(20) NOT NULL,
    legal_name varchar(200) NOT NULL,
    trade_name varchar(200),
    document_number varchar(14) NOT NULL,
    state_registration varchar(60),
    municipal_registration varchar(60),
    email varchar(255),
    phone varchar(20),
    postal_code varchar(20),
    street varchar(200),
    street_number varchar(30),
    address_complement varchar(120),
    neighborhood varchar(120),
    city_id uuid,
    state_id uuid,
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT ck_companies_type CHECK (company_type IN ('MAIN', 'BRANCH')),
    CONSTRAINT ck_companies_document_number CHECK (document_number ~ '^[0-9]{14}$'),
    CONSTRAINT fk_companies_parent FOREIGN KEY (parent_company_id)
        REFERENCES cadastros.companies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_companies_city FOREIGN KEY (city_id)
        REFERENCES cadastros.cities(id) ON DELETE RESTRICT,
    CONSTRAINT fk_companies_state FOREIGN KEY (state_id)
        REFERENCES cadastros.states(id) ON DELETE RESTRICT,
    CONSTRAINT fk_companies_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_companies_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_companies_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX uq_companies_document_active
ON cadastros.companies (document_number)
WHERE deleted_at IS NULL;

CREATE INDEX ix_companies_parent_active
ON cadastros.companies (parent_company_id, legal_name)
WHERE deleted_at IS NULL;

CREATE INDEX ix_companies_active
ON cadastros.companies (is_active, legal_name)
WHERE deleted_at IS NULL;

CREATE OR REPLACE FUNCTION cadastros.validate_company_parent()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    parent_type varchar(20);
    parent_is_active boolean;
    parent_deleted_at timestamptz;
BEGIN
    IF NEW.company_type = 'MAIN' THEN
        NEW.parent_company_id := NULL;
        RETURN NEW;
    END IF;

    IF NEW.parent_company_id IS NULL THEN
        RAISE EXCEPTION 'Filial deve informar uma empresa matriz.';
    END IF;

    IF NEW.parent_company_id = NEW.id THEN
        RAISE EXCEPTION 'Empresa filial não pode referenciar a si mesma como matriz.';
    END IF;

    SELECT company_type, is_active, deleted_at
      INTO parent_type, parent_is_active, parent_deleted_at
      FROM cadastros.companies
     WHERE id = NEW.parent_company_id;

    IF parent_type IS NULL THEN
        RAISE EXCEPTION 'Empresa matriz informada não existe.';
    END IF;

    IF parent_type <> 'MAIN' THEN
        RAISE EXCEPTION 'Filial deve referenciar uma empresa do tipo matriz.';
    END IF;

    IF parent_is_active IS NOT TRUE OR parent_deleted_at IS NOT NULL THEN
        RAISE EXCEPTION 'Empresa matriz informada deve estar ativa.';
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_companies_parent_rules
BEFORE INSERT OR UPDATE OF company_type, parent_company_id, is_active, deleted_at ON cadastros.companies
FOR EACH ROW EXECUTE FUNCTION cadastros.validate_company_parent();

CREATE TRIGGER trg_companies_updated_at
BEFORE UPDATE ON cadastros.companies
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

COMMENT ON TABLE cadastros.companies
IS 'Cadastro de empresas próprias do sistema, separando matriz e filiais.';

COMMENT ON COLUMN cadastros.companies.company_type
IS 'Tipo de empresa: MAIN para matriz e BRANCH para filial. UNKNOWN fica reservado à classificação de XML importado.';

COMMIT;
