BEGIN;

CREATE TABLE cadastros.markers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(60) NOT NULL,
    name varchar(120) NOT NULL,
    description varchar(255),
    color varchar(20),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT uq_markers_code UNIQUE (code),
    CONSTRAINT uq_markers_name UNIQUE (name),
    CONSTRAINT fk_markers_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_markers_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_markers_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_markers_updated_at
BEFORE UPDATE ON cadastros.markers
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_markers_active
ON cadastros.markers (is_active)
WHERE deleted_at IS NULL;

INSERT INTO cadastros.markers (code, name, description, color)
VALUES
    ('PRIORITY', 'Prioridade', 'Marcador para fornecedores prioritários', '#2563EB'),
    ('STRATEGIC', 'Estratégico', 'Marcador para relacionamento estratégico', '#7C3AED'),
    ('FAST_DELIVERY', 'Entrega rápida', 'Marcador para fornecedores com entrega rápida', '#059669')
ON CONFLICT (code) DO NOTHING;

COMMIT;
