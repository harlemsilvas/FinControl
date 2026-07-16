-- FinControl
-- DOM-002: Controlled logical deletion procedures

BEGIN;

CREATE OR REPLACE FUNCTION financeiro.soft_delete_payable_title(
    p_title_id uuid,
    p_user_id uuid
)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
    v_has_payments boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM financeiro.payable_installments i
        JOIN financeiro.payments p ON p.payable_installment_id = i.id
        LEFT JOIN financeiro.payment_reversals r ON r.payment_id = p.id
        WHERE i.payable_title_id = p_title_id
          AND r.id IS NULL
    ) INTO v_has_payments;

    IF v_has_payments THEN
        RAISE EXCEPTION 'Title % has effective payments and cannot be logically deleted', p_title_id;
    END IF;

    UPDATE financeiro.payable_titles
       SET is_active = false,
           deleted_at = CURRENT_TIMESTAMP,
           deleted_by = p_user_id,
           updated_by = p_user_id
     WHERE id = p_title_id
       AND deleted_at IS NULL;

    UPDATE financeiro.payable_installments
       SET deleted_at = CURRENT_TIMESTAMP,
           deleted_by = p_user_id,
           updated_by = p_user_id
     WHERE payable_title_id = p_title_id
       AND deleted_at IS NULL;
END;
$$;

COMMENT ON FUNCTION financeiro.soft_delete_payable_title(uuid, uuid)
IS 'Performs controlled logical deletion of a title and its unpaid installments.';

COMMIT;
