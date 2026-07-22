BEGIN;

CREATE INDEX IF NOT EXISTS ix_attachments_payment
ON financeiro.attachments (payment_id)
WHERE payment_id IS NOT NULL;

COMMIT;
