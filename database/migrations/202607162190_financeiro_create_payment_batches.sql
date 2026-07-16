-- FinControl
-- DOM-002: Payment batches

BEGIN;

CREATE TABLE financeiro.payment_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_code varchar(40) NOT NULL,
    bank_account_id uuid NOT NULL,
    scheduled_date date NOT NULL,
    status_id uuid NOT NULL,
    total_amount numeric(18,2) NOT NULL DEFAULT 0,
    notes text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL,
    cancelled_at timestamptz,
    cancelled_by uuid,
    cancellation_reason text,
    CONSTRAINT uq_payment_batches_code UNIQUE (batch_code),
    CONSTRAINT fk_batches_bank_account FOREIGN KEY (bank_account_id)
        REFERENCES tesouraria.bank_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_batches_status FOREIGN KEY (status_id)
        REFERENCES financeiro.payment_batch_statuses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_batches_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_batches_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_batches_cancelled_by FOREIGN KEY (cancelled_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT ck_batches_total CHECK (total_amount >= 0),
    CONSTRAINT ck_batches_cancel_data CHECK (
        cancelled_at IS NULL OR (cancelled_by IS NOT NULL AND cancellation_reason IS NOT NULL)
    )
);

CREATE TRIGGER trg_payment_batches_updated_at BEFORE UPDATE ON financeiro.payment_batches
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_payment_batches_scheduled
ON financeiro.payment_batches (scheduled_date, status_id);

COMMIT;
