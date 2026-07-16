-- FinControl
-- DOM-002: Payable installments

BEGIN;

CREATE TABLE financeiro.payable_installments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_title_id uuid NOT NULL,
    installment_number integer NOT NULL,
    installment_count integer NOT NULL,
    amount numeric(18,2) NOT NULL,
    due_date date NOT NULL,
    payment_method_id uuid NOT NULL,
    open_balance numeric(18,2) NOT NULL,
    status_id uuid NOT NULL,
    notes text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT fk_installments_title FOREIGN KEY (payable_title_id)
        REFERENCES financeiro.payable_titles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_installments_method FOREIGN KEY (payment_method_id)
        REFERENCES cadastros.payment_methods(id) ON DELETE RESTRICT,
    CONSTRAINT fk_installments_status FOREIGN KEY (status_id)
        REFERENCES financeiro.payable_installment_statuses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_installments_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_installments_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_installments_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT uq_installments_title_number UNIQUE (payable_title_id, installment_number),
    CONSTRAINT ck_installments_number CHECK (installment_number >= 1),
    CONSTRAINT ck_installments_count CHECK (installment_count >= 1),
    CONSTRAINT ck_installments_sequence CHECK (installment_number <= installment_count),
    CONSTRAINT ck_installments_amount CHECK (amount > 0),
    CONSTRAINT ck_installments_balance CHECK (open_balance >= 0)
);

CREATE TRIGGER trg_payable_installments_updated_at
BEFORE UPDATE ON financeiro.payable_installments
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_installments_due_status
ON financeiro.payable_installments (due_date, status_id)
WHERE deleted_at IS NULL;

CREATE INDEX ix_installments_title
ON financeiro.payable_installments (payable_title_id);

COMMIT;
