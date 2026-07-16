-- FinControl
-- DOM-002: Payments and reversals

BEGIN;

CREATE TABLE financeiro.payments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_installment_id uuid NOT NULL,
    payment_batch_id uuid,
    bank_account_id uuid NOT NULL,
    payment_method_id uuid NOT NULL,
    payment_date date NOT NULL,
    principal_amount numeric(18,2) NOT NULL,
    interest_amount numeric(18,2) NOT NULL DEFAULT 0,
    penalty_amount numeric(18,2) NOT NULL DEFAULT 0,
    discount_amount numeric(18,2) NOT NULL DEFAULT 0,
    additional_amount numeric(18,2) NOT NULL DEFAULT 0,
    movement_amount numeric(18,2) GENERATED ALWAYS AS
        (principal_amount + interest_amount + penalty_amount + additional_amount - discount_amount) STORED,
    transaction_number varchar(100),
    overpayment_confirmed boolean NOT NULL DEFAULT false,
    overpayment_confirmed_by uuid,
    overpayment_confirmed_at timestamptz,
    status_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL,
    CONSTRAINT fk_payments_installment FOREIGN KEY (payable_installment_id)
        REFERENCES financeiro.payable_installments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_batch FOREIGN KEY (payment_batch_id)
        REFERENCES financeiro.payment_batches(id) ON DELETE SET NULL,
    CONSTRAINT fk_payments_bank_account FOREIGN KEY (bank_account_id)
        REFERENCES tesouraria.bank_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_method FOREIGN KEY (payment_method_id)
        REFERENCES cadastros.payment_methods(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_status FOREIGN KEY (status_id)
        REFERENCES financeiro.payment_statuses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_overpayment_user FOREIGN KEY (overpayment_confirmed_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_payments_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payments_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_payments_principal CHECK (principal_amount > 0),
    CONSTRAINT ck_payments_interest CHECK (interest_amount >= 0),
    CONSTRAINT ck_payments_penalty CHECK (penalty_amount >= 0),
    CONSTRAINT ck_payments_discount CHECK (discount_amount >= 0),
    CONSTRAINT ck_payments_additional CHECK (additional_amount >= 0),
    CONSTRAINT ck_payments_movement CHECK (
        principal_amount + interest_amount + penalty_amount + additional_amount - discount_amount > 0
    ),
    CONSTRAINT ck_payments_overpayment_confirmation CHECK (
        overpayment_confirmed = false OR
        (overpayment_confirmed_by IS NOT NULL AND overpayment_confirmed_at IS NOT NULL)
    )
);

CREATE TABLE financeiro.payment_reversals (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id uuid NOT NULL,
    reason text NOT NULL,
    reversed_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reversed_by uuid NOT NULL,
    CONSTRAINT fk_reversals_payment FOREIGN KEY (payment_id)
        REFERENCES financeiro.payments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_reversals_user FOREIGN KEY (reversed_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT uq_reversals_payment UNIQUE (payment_id)
);

ALTER TABLE financeiro.attachments
ADD CONSTRAINT fk_attachments_payment FOREIGN KEY (payment_id)
REFERENCES financeiro.payments(id) ON DELETE RESTRICT;

CREATE TRIGGER trg_payments_updated_at BEFORE UPDATE ON financeiro.payments
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_payments_installment ON financeiro.payments (payable_installment_id);
CREATE INDEX ix_payments_batch ON financeiro.payments (payment_batch_id) WHERE payment_batch_id IS NOT NULL;
CREATE INDEX ix_payments_date ON financeiro.payments (payment_date DESC);
CREATE INDEX ix_reversals_date ON financeiro.payment_reversals (reversed_at DESC);

COMMIT;
