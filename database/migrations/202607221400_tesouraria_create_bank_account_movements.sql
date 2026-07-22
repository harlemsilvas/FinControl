BEGIN;

INSERT INTO administracao.permissions (code, name, description)
VALUES
 ('BANK_ACCOUNT_MOVEMENT_VIEW', 'Consultar movimentos bancários', 'Permite consultar movimentos e saldos oficiais de contas bancárias.'),
 ('BANK_ACCOUNT_MOVEMENT_MANAGE', 'Gerenciar movimentos bancários', 'Permite registrar entradas, transferências e ajustes de saldo bancário.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO administracao.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM administracao.roles r
CROSS JOIN administracao.permissions p
WHERE
  r.code = 'MASTER'
  OR (
    r.code = 'FINANCIAL_MANAGER'
    AND p.code IN ('BANK_ACCOUNT_MOVEMENT_VIEW', 'BANK_ACCOUNT_MOVEMENT_MANAGE')
  )
  OR (
    r.code IN ('AP_OPERATOR', 'AUDITOR', 'VIEWER')
    AND p.code = 'BANK_ACCOUNT_MOVEMENT_VIEW'
  )
ON CONFLICT DO NOTHING;

CREATE TABLE tesouraria.bank_account_movements (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_account_id uuid NOT NULL,
    company_id uuid NOT NULL,
    cost_center_id uuid,
    related_payment_id uuid,
    transfer_group_id uuid,
    reversal_of_movement_id uuid,
    movement_type varchar(40) NOT NULL,
    direction varchar(10) NOT NULL,
    movement_date date NOT NULL,
    amount numeric(18,2) NOT NULL,
    description varchar(255) NOT NULL,
    reference_number varchar(100),
    notes text,
    is_system_generated boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    CONSTRAINT ck_bank_movements_type CHECK (movement_type IN (
        'CASH_BALANCE',
        'MARKETPLACE_REPASS',
        'MANUAL_ENTRY',
        'MANUAL_ADJUSTMENT',
        'PAYABLE_PAYMENT',
        'TRANSFER',
        'REVERSAL'
    )),
    CONSTRAINT ck_bank_movements_direction CHECK (direction IN ('IN', 'OUT')),
    CONSTRAINT ck_bank_movements_amount CHECK (amount > 0),
    CONSTRAINT ck_bank_movements_reversal_type CHECK (
        reversal_of_movement_id IS NULL OR movement_type = 'REVERSAL'
    ),
    CONSTRAINT fk_bank_movements_bank_account FOREIGN KEY (bank_account_id)
        REFERENCES tesouraria.bank_accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bank_movements_company FOREIGN KEY (company_id)
        REFERENCES cadastros.companies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bank_movements_cost_center FOREIGN KEY (cost_center_id)
        REFERENCES cadastros.cost_centers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bank_movements_payment FOREIGN KEY (related_payment_id)
        REFERENCES financeiro.payments(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bank_movements_reversal FOREIGN KEY (reversal_of_movement_id)
        REFERENCES tesouraria.bank_account_movements(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bank_movements_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT
);

CREATE UNIQUE INDEX uq_bank_movements_reversal
ON tesouraria.bank_account_movements (reversal_of_movement_id)
WHERE reversal_of_movement_id IS NOT NULL;

CREATE INDEX ix_bank_movements_account_date
ON tesouraria.bank_account_movements (bank_account_id, movement_date DESC, created_at DESC);

CREATE INDEX ix_bank_movements_company_date
ON tesouraria.bank_account_movements (company_id, movement_date DESC);

CREATE INDEX ix_bank_movements_cost_center
ON tesouraria.bank_account_movements (cost_center_id)
WHERE cost_center_id IS NOT NULL;

CREATE VIEW tesouraria.v_bank_account_balances AS
SELECT
    ba.id AS bank_account_id,
    ba.company_id,
    COALESCE(SUM(
        CASE m.direction
            WHEN 'IN' THEN m.amount
            WHEN 'OUT' THEN -m.amount
            ELSE 0
        END
    ), 0)::numeric(18,2) AS official_balance
FROM tesouraria.bank_accounts ba
LEFT JOIN tesouraria.bank_account_movements m ON m.bank_account_id = ba.id
WHERE ba.deleted_at IS NULL
GROUP BY ba.id, ba.company_id;

COMMENT ON TABLE tesouraria.bank_account_movements
IS 'Livro auditável de movimentos de conta bancária para saldo oficial, baixas, repasses e transferências.';

COMMENT ON VIEW tesouraria.v_bank_account_balances
IS 'Saldo oficial calculado por conta bancária a partir do livro auditável de movimentos, incluindo estornos como movimentos compensatórios.';

COMMIT;
