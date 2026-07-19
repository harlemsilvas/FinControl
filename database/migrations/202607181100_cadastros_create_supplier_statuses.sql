BEGIN;

CREATE TABLE cadastros.supplier_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(30) NOT NULL,
    name varchar(80) NOT NULL,
    description varchar(255),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_supplier_statuses_code UNIQUE (code)
);

CREATE TRIGGER trg_supplier_statuses_updated_at
BEFORE UPDATE ON cadastros.supplier_statuses
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

INSERT INTO cadastros.supplier_statuses (code, name, description)
VALUES
    ('ACTIVE', 'Ativo', 'Fornecedor habilitado para uso normal'),
    ('INACTIVE', 'Inativo', 'Fornecedor fora de operação, preservando histórico'),
    ('BLOCKED', 'Bloqueado', 'Fornecedor impedido de uso operacional')
ON CONFLICT (code) DO NOTHING;

COMMIT;
