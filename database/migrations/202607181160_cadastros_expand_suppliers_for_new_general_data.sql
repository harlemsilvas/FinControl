BEGIN;

ALTER TABLE cadastros.suppliers
    ADD COLUMN status_id uuid,
    ADD COLUMN state_registration varchar(60),
    ADD COLUMN municipal_registration varchar(60),
    ADD COLUMN supplier_category_id uuid,
    ADD COLUMN postal_code varchar(20),
    ADD COLUMN street varchar(200),
    ADD COLUMN street_number varchar(30),
    ADD COLUMN address_complement varchar(120),
    ADD COLUMN neighborhood varchar(120),
    ADD COLUMN city_id uuid,
    ADD COLUMN state_id uuid,
    ADD COLUMN financial_email varchar(255);

UPDATE cadastros.suppliers AS s
SET status_id = status_map.id
FROM (
    SELECT supplier.id AS supplier_id,
           CASE
               WHEN supplier.is_blocked = true THEN blocked.id
               WHEN supplier.is_active = true THEN active.id
               ELSE inactive.id
           END AS id
    FROM cadastros.suppliers AS supplier
    CROSS JOIN LATERAL (
        SELECT id FROM cadastros.supplier_statuses WHERE code = 'ACTIVE'
    ) AS active
    CROSS JOIN LATERAL (
        SELECT id FROM cadastros.supplier_statuses WHERE code = 'INACTIVE'
    ) AS inactive
    CROSS JOIN LATERAL (
        SELECT id FROM cadastros.supplier_statuses WHERE code = 'BLOCKED'
    ) AS blocked
) AS status_map
WHERE s.id = status_map.supplier_id;

UPDATE cadastros.suppliers AS s
SET supplier_category_id = category.id
FROM (
    SELECT id
    FROM cadastros.supplier_categories
    WHERE code = 'SUPPLIER'
) AS category
WHERE s.supplier_category_id IS NULL;

UPDATE cadastros.suppliers
SET financial_email = email
WHERE financial_email IS NULL
  AND email IS NOT NULL;

ALTER TABLE cadastros.suppliers
    ALTER COLUMN status_id SET NOT NULL,
    ALTER COLUMN supplier_category_id SET NOT NULL;

ALTER TABLE cadastros.suppliers
    ADD CONSTRAINT fk_suppliers_status FOREIGN KEY (status_id)
        REFERENCES cadastros.supplier_statuses(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_suppliers_category FOREIGN KEY (supplier_category_id)
        REFERENCES cadastros.supplier_categories(id) ON DELETE RESTRICT,
    ADD CONSTRAINT fk_suppliers_city FOREIGN KEY (city_id)
        REFERENCES cadastros.cities(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_suppliers_state FOREIGN KEY (state_id)
        REFERENCES cadastros.states(id) ON DELETE SET NULL;

CREATE INDEX ix_suppliers_status
ON cadastros.suppliers (status_id);

CREATE INDEX ix_suppliers_category
ON cadastros.suppliers (supplier_category_id);

CREATE INDEX ix_suppliers_city
ON cadastros.suppliers (city_id)
WHERE deleted_at IS NULL;

CREATE INDEX ix_suppliers_state
ON cadastros.suppliers (state_id)
WHERE deleted_at IS NULL;

CREATE INDEX ix_suppliers_postal_code
ON cadastros.suppliers (postal_code)
WHERE deleted_at IS NULL AND postal_code IS NOT NULL;

COMMIT;
