BEGIN;

ALTER TABLE tesouraria.bank_accounts
ADD COLUMN company_id uuid;

ALTER TABLE tesouraria.bank_accounts
ADD CONSTRAINT fk_bank_accounts_company FOREIGN KEY (company_id)
    REFERENCES cadastros.companies(id) ON DELETE RESTRICT;

CREATE INDEX ix_bank_accounts_company_active
ON tesouraria.bank_accounts (company_id, is_active)
WHERE deleted_at IS NULL;

COMMENT ON COLUMN tesouraria.bank_accounts.company_id
IS 'Empresa proprietária da conta bancária. Obrigatório para novos cadastros pela API.';

COMMIT;
