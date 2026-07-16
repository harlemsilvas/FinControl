-- FinControl
-- Migration: Create centralized audit event table
-- Version: 0.1.0

BEGIN;

CREATE TABLE administracao.audit_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_code varchar(40) NOT NULL,
    entity_name varchar(80) NOT NULL,
    entity_id uuid NOT NULL,
    action_code varchar(60) NOT NULL,
    previous_data jsonb,
    new_data jsonb,
    user_id uuid,
    source_code varchar(40),
    ip_address inet,
    user_agent varchar(500),
    correlation_id uuid,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_audit_events_payload
        CHECK (previous_data IS NOT NULL OR new_data IS NOT NULL OR action_code IS NOT NULL)
);

CREATE INDEX ix_audit_events_entity
    ON administracao.audit_events (entity_name, entity_id);

CREATE INDEX ix_audit_events_domain_created_at
    ON administracao.audit_events (domain_code, created_at DESC);

CREATE INDEX ix_audit_events_user_created_at
    ON administracao.audit_events (user_id, created_at DESC)
    WHERE user_id IS NOT NULL;

CREATE INDEX ix_audit_events_correlation_id
    ON administracao.audit_events (correlation_id)
    WHERE correlation_id IS NOT NULL;

COMMENT ON TABLE administracao.audit_events
IS 'Immutable application audit trail. Rows must not be updated or deleted by regular application roles.';

COMMIT;
