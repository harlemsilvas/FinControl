-- FinControl
-- DOM-002: Financial balance helper functions

BEGIN;

CREATE OR REPLACE FUNCTION financeiro.calculate_installment_paid_amount(p_installment_id uuid)
RETURNS numeric(18,2)
LANGUAGE sql
STABLE
AS $$
    SELECT COALESCE(SUM(p.principal_amount), 0)::numeric(18,2)
    FROM financeiro.payments p
    JOIN financeiro.payment_statuses ps ON ps.id = p.status_id
    LEFT JOIN financeiro.payment_reversals pr ON pr.payment_id = p.id
    WHERE p.payable_installment_id = p_installment_id
      AND ps.code = 'EFFECTIVE'
      AND pr.id IS NULL;
$$;

CREATE OR REPLACE FUNCTION financeiro.recalculate_installment_balance(p_installment_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_amount numeric(18,2);
    v_paid numeric(18,2);
    v_balance numeric(18,2);
    v_status_id uuid;
    v_due_date date;
BEGIN
    SELECT amount, due_date
      INTO v_amount, v_due_date
    FROM financeiro.payable_installments
    WHERE id = p_installment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Installment % not found', p_installment_id;
    END IF;

    v_paid := financeiro.calculate_installment_paid_amount(p_installment_id);
    v_balance := GREATEST(v_amount - v_paid, 0);

    SELECT id INTO v_status_id
    FROM financeiro.payable_installment_statuses
    WHERE code =
        CASE
            WHEN v_balance = 0 THEN 'PAID'
            WHEN v_paid > 0 THEN 'PARTIALLY_PAID'
            WHEN v_due_date < CURRENT_DATE THEN 'OVERDUE'
            ELSE 'OPEN'
        END;

    UPDATE financeiro.payable_installments
       SET open_balance = v_balance,
           status_id = v_status_id
     WHERE id = p_installment_id;
END;
$$;

CREATE OR REPLACE FUNCTION financeiro.trg_payment_recalculate_installment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    PERFORM financeiro.recalculate_installment_balance(
        COALESCE(NEW.payable_installment_id, OLD.payable_installment_id)
    );
    RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE FUNCTION financeiro.trg_reversal_recalculate_installment()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    v_installment_id uuid;
BEGIN
    SELECT payable_installment_id
      INTO v_installment_id
      FROM financeiro.payments
     WHERE id = NEW.payment_id;

    PERFORM financeiro.recalculate_installment_balance(v_installment_id);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trg_payments_recalculate_installment
AFTER INSERT OR UPDATE OF status_id, principal_amount ON financeiro.payments
FOR EACH ROW EXECUTE FUNCTION financeiro.trg_payment_recalculate_installment();

CREATE TRIGGER trg_reversals_recalculate_installment
AFTER INSERT ON financeiro.payment_reversals
FOR EACH ROW EXECUTE FUNCTION financeiro.trg_reversal_recalculate_installment();

COMMIT;
