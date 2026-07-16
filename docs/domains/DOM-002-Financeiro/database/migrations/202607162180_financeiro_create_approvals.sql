-- FinControl
-- DOM-002: Approval workflow records

BEGIN;

CREATE TABLE financeiro.approvals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_title_id uuid NOT NULL,
    approval_level integer NOT NULL,
    approver_id uuid NOT NULL,
    status_id uuid NOT NULL,
    reason text,
    decided_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL,
    CONSTRAINT fk_approvals_title FOREIGN KEY (payable_title_id)
        REFERENCES financeiro.payable_titles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_approvals_approver FOREIGN KEY (approver_id)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_approvals_status FOREIGN KEY (status_id)
        REFERENCES financeiro.approval_statuses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_approvals_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_approvals_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_approvals_title_level_approver UNIQUE (payable_title_id, approval_level, approver_id),
    CONSTRAINT ck_approvals_level CHECK (approval_level >= 1)
);

CREATE TRIGGER trg_approvals_updated_at BEFORE UPDATE ON financeiro.approvals
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_approvals_pending
ON financeiro.approvals (approver_id, status_id, created_at);

CREATE INDEX ix_approvals_title
ON financeiro.approvals (payable_title_id, approval_level);

COMMIT;
