-- FinControl
-- Phase 7 permissions and payable-title status recalculation

BEGIN;

INSERT INTO administracao.permissions (code, name, description)
VALUES
 ('PAYABLE_TITLE_VIEW', 'Consultar títulos', 'Permite consultar títulos e parcelas.'),
 ('PAYABLE_ATTACHMENT_MANAGE', 'Gerenciar anexos', 'Permite vincular e inativar anexos financeiros.'),
 ('PAYABLE_TAG_MANAGE', 'Gerenciar marcadores', 'Permite criar e vincular marcadores.'),
 ('XML_IMPORT_MANAGE', 'Gerenciar importação XML', 'Permite registrar e acompanhar importações XML.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO administracao.role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM administracao.roles r CROSS JOIN administracao.permissions p
WHERE
 (r.code = 'MASTER') OR
 (r.code = 'FINANCIAL_MANAGER' AND p.code IN ('PAYABLE_TITLE_VIEW','PAYABLE_TITLE_CREATE','PAYABLE_TITLE_UPDATE','PAYABLE_TITLE_CANCEL','PAYABLE_TITLE_APPROVE','PAYMENT_CREATE','PAYMENT_REVERSE','PAYMENT_BATCH_MANAGE','DUPLICATE_OVERRIDE','PAYABLE_ATTACHMENT_MANAGE','PAYABLE_TAG_MANAGE','XML_IMPORT_MANAGE','AUDIT_VIEW')) OR
 (r.code = 'AP_OPERATOR' AND p.code IN ('PAYABLE_TITLE_VIEW','PAYABLE_TITLE_CREATE','PAYABLE_TITLE_UPDATE','PAYMENT_CREATE','PAYMENT_BATCH_MANAGE','DUPLICATE_OVERRIDE','PAYABLE_ATTACHMENT_MANAGE','PAYABLE_TAG_MANAGE','XML_IMPORT_MANAGE')) OR
 (r.code = 'APPROVER' AND p.code IN ('PAYABLE_TITLE_VIEW','PAYABLE_TITLE_APPROVE')) OR
 (r.code IN ('AUDITOR','VIEWER') AND p.code = 'PAYABLE_TITLE_VIEW')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION financeiro.recalculate_title_status(p_title_id uuid)
RETURNS void LANGUAGE plpgsql AS $$
DECLARE v_status_code varchar(40); v_status_id uuid; v_balance numeric(18,2); v_paid numeric(18,2); v_due date;
BEGIN
  SELECT COALESCE(sum(open_balance),0), COALESCE(sum(amount-open_balance),0), min(due_date)
    INTO v_balance, v_paid, v_due FROM financeiro.payable_installments
   WHERE payable_title_id=p_title_id AND deleted_at IS NULL;
  SELECT s.code INTO v_status_code FROM financeiro.payable_titles t
    JOIN financeiro.payable_title_statuses s ON s.id=t.status_id WHERE t.id=p_title_id FOR UPDATE;
  IF v_status_code IN ('CANCELLED','IN_APPROVAL','APPROVED','SCHEDULED','REJECTED','DRAFT') AND v_paid=0 THEN RETURN; END IF;
  v_status_code := CASE WHEN v_balance=0 THEN 'PAID' WHEN v_paid>0 THEN 'PARTIALLY_PAID'
    WHEN v_due<CURRENT_DATE THEN 'OVERDUE' ELSE 'OPEN' END;
  SELECT id INTO v_status_id FROM financeiro.payable_title_statuses WHERE code=v_status_code;
  UPDATE financeiro.payable_titles SET status_id=v_status_id WHERE id=p_title_id;
END $$;

CREATE OR REPLACE FUNCTION financeiro.trg_installment_recalculate_title()
RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN
  PERFORM financeiro.recalculate_title_status(COALESCE(NEW.payable_title_id,OLD.payable_title_id)); RETURN COALESCE(NEW,OLD);
END $$;

CREATE TRIGGER trg_installments_recalculate_title
AFTER INSERT OR UPDATE OF open_balance,status_id ON financeiro.payable_installments
FOR EACH ROW EXECUTE FUNCTION financeiro.trg_installment_recalculate_title();

COMMIT;
