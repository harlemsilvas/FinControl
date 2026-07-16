-- FinControl
-- DOM-003: Minimal banks and bank accounts

BEGIN;

CREATE TABLE tesouraria.banks (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(20) NOT NULL,
    name varchar(160) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_banks_code UNIQUE (code)
);

CREATE TABLE tesouraria.bank_accounts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bank_id uuid NOT NULL,
    account_name varchar(160) NOT NULL,
    branch_number varchar(30),
    account_number varchar(40) NOT NULL,
    account_type varchar(30) NOT NULL DEFAULT 'CHECKING',
    pix_key varchar(255),
    is_default boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT fk_bank_accounts_bank FOREIGN KEY (bank_id)
        REFERENCES tesouraria.banks(id) ON DELETE RESTRICT,
    CONSTRAINT fk_bank_accounts_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_bank_accounts_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_bank_accounts_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_banks_updated_at BEFORE UPDATE ON tesouraria.banks
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();
CREATE TRIGGER trg_bank_accounts_updated_at BEFORE UPDATE ON tesouraria.bank_accounts
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE UNIQUE INDEX uq_bank_accounts_number_active
ON tesouraria.bank_accounts (bank_id, branch_number, account_number)
WHERE deleted_at IS NULL;

COMMIT;
