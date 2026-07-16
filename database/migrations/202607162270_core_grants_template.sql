-- FinControl
-- Security grants template
-- Replace role names according to each environment before production.

BEGIN;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fincontrol_app') THEN
        CREATE ROLE fincontrol_app NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fincontrol_readonly') THEN
        CREATE ROLE fincontrol_readonly NOLOGIN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'fincontrol_migration') THEN
        CREATE ROLE fincontrol_migration NOLOGIN;
    END IF;
END
$$;

GRANT USAGE ON SCHEMA cadastros, financeiro, tesouraria, administracao
TO fincontrol_app, fincontrol_readonly;

GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA cadastros, financeiro, tesouraria
TO fincontrol_app;

GRANT SELECT, INSERT ON administracao.audit_events
TO fincontrol_app;

GRANT SELECT ON ALL TABLES IN SCHEMA cadastros, financeiro, tesouraria, administracao
TO fincontrol_readonly;

ALTER DEFAULT PRIVILEGES IN SCHEMA cadastros, financeiro, tesouraria
GRANT SELECT, INSERT, UPDATE ON TABLES TO fincontrol_app;

ALTER DEFAULT PRIVILEGES IN SCHEMA cadastros, financeiro, tesouraria, administracao
GRANT SELECT ON TABLES TO fincontrol_readonly;

REVOKE UPDATE, DELETE ON administracao.audit_events FROM fincontrol_app;
REVOKE DELETE ON ALL TABLES IN SCHEMA financeiro FROM fincontrol_app;

COMMIT;
