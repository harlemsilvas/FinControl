BEGIN;

ALTER TABLE cadastros.suppliers
    ADD COLUMN internal_responsible_name varchar(160),
    ADD COLUMN relationship_started_at date,
    ADD COLUMN internal_code varchar(60),
    ADD COLUMN preferred_contact_channel varchar(30),
    ADD COLUMN supplier_operational_type varchar(30),
    ADD COLUMN default_delivery_lead_time_days integer,
    ADD COLUMN minimum_order_amount numeric(15, 2),
    ADD COLUMN preferred_carrier_name varchar(160),
    ADD COLUMN freight_mode varchar(30),
    ADD COLUMN receiving_days varchar(160),
    ADD COLUMN additional_info text;

ALTER TABLE cadastros.suppliers
    ADD CONSTRAINT ck_suppliers_preferred_contact_channel
        CHECK (preferred_contact_channel IS NULL OR preferred_contact_channel IN ('PHONE','WHATSAPP','EMAIL','IN_PERSON')),
    ADD CONSTRAINT ck_suppliers_operational_type
        CHECK (supplier_operational_type IS NULL OR supplier_operational_type IN ('PRODUCT','SERVICE','PRODUCT_AND_SERVICE')),
    ADD CONSTRAINT ck_suppliers_default_delivery_lead_time_days
        CHECK (default_delivery_lead_time_days IS NULL OR default_delivery_lead_time_days >= 0),
    ADD CONSTRAINT ck_suppliers_minimum_order_amount
        CHECK (minimum_order_amount IS NULL OR minimum_order_amount >= 0),
    ADD CONSTRAINT ck_suppliers_freight_mode
        CHECK (freight_mode IS NULL OR freight_mode IN ('CIF','FOB','PICKUP','OWN_DELIVERY','NOT_APPLICABLE'));

CREATE UNIQUE INDEX uq_suppliers_internal_code_active
ON cadastros.suppliers (internal_code)
WHERE deleted_at IS NULL AND internal_code IS NOT NULL;

CREATE INDEX ix_suppliers_operational_type
ON cadastros.suppliers (supplier_operational_type)
WHERE deleted_at IS NULL AND supplier_operational_type IS NOT NULL;

CREATE INDEX ix_suppliers_preferred_contact_channel
ON cadastros.suppliers (preferred_contact_channel)
WHERE deleted_at IS NULL AND preferred_contact_channel IS NOT NULL;

COMMIT;
