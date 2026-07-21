BEGIN;

CREATE TABLE cadastros.supplier_categories (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(60) NOT NULL,
    name varchar(160) NOT NULL,
    description varchar(255),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT uq_supplier_categories_code UNIQUE (code),
    CONSTRAINT uq_supplier_categories_name UNIQUE (name),
    CONSTRAINT fk_supplier_categories_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_supplier_categories_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_supplier_categories_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_supplier_categories_updated_at
BEFORE UPDATE ON cadastros.supplier_categories
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_supplier_categories_active
ON cadastros.supplier_categories (is_active)
WHERE deleted_at IS NULL;

INSERT INTO cadastros.supplier_categories (code, name, description)
VALUES
    ('SUPPLIER', 'Fornecedor', 'Fornecedor padrão para compras e contas a pagar'),
    ('SERVICE_PROVIDER', 'Prestador de Serviço', 'Fornecedor especializado em serviços'),
    ('DISTRIBUTOR', 'Distribuidor', 'Fornecedor com atuação de distribuição')
ON CONFLICT (code) DO NOTHING;

COMMIT;
