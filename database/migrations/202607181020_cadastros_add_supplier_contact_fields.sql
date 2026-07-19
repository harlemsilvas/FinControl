BEGIN;

ALTER TABLE cadastros.suppliers
    ADD COLUMN mobile_phone varchar(40),
    ADD COLUMN secondary_phone varchar(40);

CREATE INDEX ix_suppliers_mobile_phone
    ON cadastros.suppliers (mobile_phone)
    WHERE deleted_at IS NULL AND mobile_phone IS NOT NULL;

COMMIT;
