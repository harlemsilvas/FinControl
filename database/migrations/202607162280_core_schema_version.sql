-- FinControl
-- Internal migration registry

BEGIN;

CREATE TABLE administracao.schema_versions (
    version varchar(40) PRIMARY KEY,
    description varchar(255) NOT NULL,
    checksum varchar(128),
    applied_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    applied_by varchar(160) NOT NULL DEFAULT CURRENT_USER
);

COMMENT ON TABLE administracao.schema_versions
IS 'Optional internal migration registry; migration framework may use its own table.';

COMMIT;
