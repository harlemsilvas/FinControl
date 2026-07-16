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
