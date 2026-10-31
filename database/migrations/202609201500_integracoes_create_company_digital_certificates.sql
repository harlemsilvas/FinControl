BEGIN;

CREATE TABLE integracoes.company_digital_certificates (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL REFERENCES cadastros.companies(id),
    certificate_type varchar(10) NOT NULL DEFAULT 'A1',
    display_name varchar(160) NOT NULL,
    original_file_name varchar(255) NOT NULL,
    fingerprint_sha256 varchar(64) NOT NULL,
    serial_number varchar(160) NOT NULL,
    subject_name text NOT NULL,
    issuer_name text NOT NULL,
    certificate_document_number varchar(14),
    valid_from timestamptz NOT NULL,
    valid_until timestamptz NOT NULL,
    encrypted_payload bytea NOT NULL,
    encryption_iv bytea NOT NULL,
    authentication_tag bytea NOT NULL,
    encryption_version smallint NOT NULL DEFAULT 1,
    is_active boolean NOT NULL DEFAULT true,
    last_validated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid REFERENCES administracao.users(id),
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid REFERENCES administracao.users(id),
    deleted_at timestamptz,
    deleted_by uuid REFERENCES administracao.users(id),
    CONSTRAINT ck_company_digital_certificates_type CHECK (certificate_type = 'A1'),
    CONSTRAINT ck_company_digital_certificates_fingerprint CHECK (fingerprint_sha256 ~ '^[0-9a-f]{64}$'),
    CONSTRAINT ck_company_digital_certificates_validity CHECK (valid_until > valid_from)
);

CREATE UNIQUE INDEX ux_company_digital_certificates_active_company
    ON integracoes.company_digital_certificates(company_id)
    WHERE is_active AND deleted_at IS NULL;

CREATE INDEX ix_company_digital_certificates_expiration
    ON integracoes.company_digital_certificates(valid_until)
    WHERE is_active AND deleted_at IS NULL;

INSERT INTO administracao.permissions (code, name, description)
VALUES ('DIGITAL_CERTIFICATE_MANAGE', 'Gerenciar certificados digitais',
        'Permite cadastrar, substituir, validar e desativar certificados digitais A1 das empresas.')
ON CONFLICT (code) DO UPDATE SET name=EXCLUDED.name, description=EXCLUDED.description, is_active=true;

INSERT INTO administracao.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM administracao.roles r
CROSS JOIN administracao.permissions p
WHERE r.code = 'MASTER' AND p.code = 'DIGITAL_CERTIFICATE_MANAGE'
ON CONFLICT DO NOTHING;

COMMENT ON TABLE integracoes.company_digital_certificates IS
'Cofre de certificados A1 por empresa. PFX e senha sao armazenados exclusivamente em payload AES-256-GCM.';

COMMIT;
