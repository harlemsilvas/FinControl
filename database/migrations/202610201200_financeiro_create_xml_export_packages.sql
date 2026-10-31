BEGIN;

ALTER TABLE financeiro.xml_imports
    ADD COLUMN import_source varchar(20) NOT NULL DEFAULT 'MANUAL',
    ADD CONSTRAINT ck_xml_imports_source CHECK (import_source = 'MANUAL');
COMMENT ON COLUMN financeiro.xml_imports.import_source IS
'Importacao manual nesta fase. Integracoes automaticas exigem evolucao explicita.';
CREATE INDEX ix_xml_imports_manual_company_issue
ON financeiro.xml_imports(company_id, issue_date, id)
WHERE deleted_at IS NULL AND import_source = 'MANUAL';

CREATE TABLE financeiro.xml_export_packages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_by uuid NOT NULL REFERENCES administracao.users(id),
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at timestamptz NOT NULL,
    status varchar(20) NOT NULL DEFAULT 'PREVIEW',
    filters jsonb NOT NULL,
    snapshot jsonb NOT NULL,
    company_ids uuid[] NOT NULL,
    total_count integer NOT NULL CHECK (total_count > 0),
    included_count integer NOT NULL CHECK (included_count >= 0),
    unavailable_count integer NOT NULL CHECK (unavailable_count >= 0),
    source_bytes bigint NOT NULL CHECK (source_bytes >= 0),
    archive_bytes integer,
    archive_sha256 varchar(64),
    archive_data bytea,
    generated_at timestamptz,
    failure_code varchar(60),
    CONSTRAINT ck_xml_export_status CHECK (status IN ('PREVIEW','READY','FAILED','EXPIRED')),
    CONSTRAINT ck_xml_export_counts CHECK (included_count + unavailable_count = total_count),
    CONSTRAINT ck_xml_export_ready CHECK (status <> 'READY' OR (archive_data IS NOT NULL AND archive_sha256 IS NOT NULL AND archive_bytes > 0)),
    CONSTRAINT ck_xml_export_expiration CHECK (expires_at > created_at)
);
CREATE INDEX ix_xml_export_packages_owner ON financeiro.xml_export_packages(created_by, created_at DESC);
CREATE INDEX ix_xml_export_packages_expiration ON financeiro.xml_export_packages(expires_at)
WHERE status <> 'EXPIRED';

INSERT INTO administracao.permissions(code,name,description) VALUES
('XML_REPORT_VIEW','Consultar notas importadas','Permite consultar relatorio de notas importadas manualmente por empresa.'),
('XML_EXPORT_MANAGE','Exportar XMLs de notas','Permite preparar, gerar e baixar pacotes XML das empresas autorizadas.')
ON CONFLICT(code) DO NOTHING;
INSERT INTO administracao.role_permissions(role_id,permission_id)
SELECT r.id,p.id FROM administracao.roles r CROSS JOIN administracao.permissions p
WHERE r.code='MASTER' AND p.code IN ('XML_REPORT_VIEW','XML_EXPORT_MANAGE')
ON CONFLICT DO NOTHING;

COMMIT;
