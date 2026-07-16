-- FinControl
-- Administrative maintenance tracking

BEGIN;

CREATE TABLE administracao.maintenance_operations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    operation_code varchar(60) NOT NULL,
    entity_name varchar(100) NOT NULL,
    entity_id uuid,
    reason text NOT NULL,
    requested_by uuid NOT NULL,
    approved_by uuid,
    executed_by uuid,
    requested_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    approved_at timestamptz,
    executed_at timestamptz,
    result_code varchar(30),
    result_details jsonb,
    CONSTRAINT fk_maintenance_requested_by FOREIGN KEY (requested_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_maintenance_approved_by FOREIGN KEY (approved_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_maintenance_executed_by FOREIGN KEY (executed_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT
);

CREATE INDEX ix_maintenance_operations_entity
ON administracao.maintenance_operations (entity_name, entity_id);

CREATE INDEX ix_maintenance_operations_requested
ON administracao.maintenance_operations (requested_at DESC);

COMMIT;
