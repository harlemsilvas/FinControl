BEGIN;

ALTER TABLE cadastros.suppliers
    ADD COLUMN default_payment_method_id uuid,
    ADD COLUMN default_payment_term_id uuid,
    ADD COLUMN default_cost_center_id uuid,
    ADD COLUMN average_payment_term_days integer,
    ADD COLUMN preferred_payment_day integer,
    ADD COLUMN financial_notes text;

ALTER TABLE cadastros.suppliers
    ADD CONSTRAINT fk_suppliers_default_payment_method FOREIGN KEY (default_payment_method_id)
        REFERENCES cadastros.payment_methods(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_suppliers_default_payment_term FOREIGN KEY (default_payment_term_id)
        REFERENCES cadastros.payment_terms(id) ON DELETE SET NULL,
    ADD CONSTRAINT fk_suppliers_default_cost_center FOREIGN KEY (default_cost_center_id)
        REFERENCES cadastros.cost_centers(id) ON DELETE SET NULL,
    ADD CONSTRAINT ck_suppliers_average_payment_term_days
        CHECK (average_payment_term_days IS NULL OR average_payment_term_days >= 0),
    ADD CONSTRAINT ck_suppliers_preferred_payment_day
        CHECK (preferred_payment_day IS NULL OR preferred_payment_day BETWEEN 1 AND 31);

CREATE INDEX ix_suppliers_default_payment_method
ON cadastros.suppliers (default_payment_method_id)
WHERE deleted_at IS NULL AND default_payment_method_id IS NOT NULL;

CREATE INDEX ix_suppliers_default_payment_term
ON cadastros.suppliers (default_payment_term_id)
WHERE deleted_at IS NULL AND default_payment_term_id IS NOT NULL;

CREATE INDEX ix_suppliers_default_cost_center
ON cadastros.suppliers (default_cost_center_id)
WHERE deleted_at IS NULL AND default_cost_center_id IS NOT NULL;

INSERT INTO cadastros.payment_terms (code, name, installment_count, interval_days)
VALUES
    ('IMMEDIATE', 'A vista', 1, 0),
    ('NET_07', '7 dias', 1, 7),
    ('NET_15', '15 dias', 1, 15),
    ('NET_30', '30 dias', 1, 30),
    ('NET_45', '45 dias', 1, 45),
    ('NET_60', '60 dias', 1, 60),
    ('TWO_INSTALLMENTS', '2 parcelas', 2, 30),
    ('THREE_INSTALLMENTS', '3 parcelas', 3, 30)
ON CONFLICT (code) DO NOTHING;

COMMIT;
