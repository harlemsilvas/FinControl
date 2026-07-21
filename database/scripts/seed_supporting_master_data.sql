\set ON_ERROR_STOP on

DO $seed$
DECLARE
    v_user_id uuid;
BEGIN
    SELECT id INTO v_user_id
      FROM administracao.users
     WHERE lower(email) = 'master@example.com'
     ORDER BY created_at
     LIMIT 1;

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Master user master@example.com not found';
    END IF;

    INSERT INTO cadastros.cost_centers (code, name, created_by, updated_by)
    VALUES ('OPS-VPS-01', 'Operacoes Gerais', v_user_id, v_user_id)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          is_active = true,
          deleted_at = NULL,
          deleted_by = NULL,
          updated_by = EXCLUDED.updated_by;

    INSERT INTO cadastros.cost_centers (code, name, created_by, updated_by)
    VALUES ('ADM-VPS-01', 'Administrativo', v_user_id, v_user_id)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          is_active = true,
          deleted_at = NULL,
          deleted_by = NULL,
          updated_by = EXCLUDED.updated_by;

    INSERT INTO cadastros.cost_centers (code, name, created_by, updated_by)
    VALUES ('MNT-VPS-01', 'Manutencao', v_user_id, v_user_id)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          is_active = true,
          deleted_at = NULL,
          deleted_by = NULL,
          updated_by = EXCLUDED.updated_by;

    INSERT INTO cadastros.payment_terms (code, name, installment_count, interval_days, is_active)
    VALUES ('VISTA', 'Pagamento a Vista', 1, 0, true)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          installment_count = EXCLUDED.installment_count,
          interval_days = EXCLUDED.interval_days,
          is_active = true;

    INSERT INTO cadastros.payment_terms (code, name, installment_count, interval_days, is_active)
    VALUES ('30D', 'Pagamento em 30 Dias', 1, 30, true)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          installment_count = EXCLUDED.installment_count,
          interval_days = EXCLUDED.interval_days,
          is_active = true;

    INSERT INTO cadastros.payment_terms (code, name, installment_count, interval_days, is_active)
    VALUES ('30-60', 'Pagamento 30/60 Dias', 2, 30, true)
    ON CONFLICT (code) DO UPDATE
      SET name = EXCLUDED.name,
          installment_count = EXCLUDED.installment_count,
          interval_days = EXCLUDED.interval_days,
          is_active = true;

    RAISE NOTICE 'PASS: seed complementar com centros de custo e condicoes de pagamento aplicado';
END
$seed$;
