-- FinControl
-- DOM-002: Expand XML imports with raw payload and extracted payable data

BEGIN;

ALTER TABLE financeiro.xml_imports
    ALTER COLUMN attachment_id DROP NOT NULL,
    ADD COLUMN raw_xml text,
    ADD COLUMN source_file_name varchar(255),
    ADD COLUMN source_mime_type varchar(120),
    ADD COLUMN source_size_bytes bigint,
    ADD COLUMN source_file_hash varchar(128),
    ADD COLUMN supplier_legal_name varchar(255),
    ADD COLUMN supplier_trade_name varchar(255),
    ADD COLUMN supplier_document_number varchar(32),
    ADD COLUMN supplier_state_registration varchar(32),
    ADD COLUMN supplier_city_name varchar(120),
    ADD COLUMN supplier_state_code char(2),
    ADD COLUMN document_model varchar(10),
    ADD COLUMN document_number varchar(80),
    ADD COLUMN document_series varchar(30),
    ADD COLUMN issue_date date,
    ADD COLUMN operation_date date,
    ADD COLUMN due_date date,
    ADD COLUMN products_amount numeric(14,2),
    ADD COLUMN freight_amount numeric(14,2),
    ADD COLUMN insurance_amount numeric(14,2),
    ADD COLUMN discount_amount numeric(14,2),
    ADD COLUMN other_amount numeric(14,2),
    ADD COLUMN invoice_total_amount numeric(14,2),
    ADD COLUMN payment_amount numeric(14,2),
    ADD COLUMN currency_code char(3) NOT NULL DEFAULT 'BRL',
    ADD COLUMN parsed_data jsonb NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN processed_at timestamptz,
    ADD CONSTRAINT ck_xml_imports_payload_source CHECK (attachment_id IS NOT NULL OR raw_xml IS NOT NULL),
    ADD CONSTRAINT ck_xml_imports_source_size CHECK (source_size_bytes IS NULL OR source_size_bytes > 0);

CREATE TABLE financeiro.xml_import_installments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    xml_import_id uuid NOT NULL,
    installment_number integer NOT NULL,
    due_date date NOT NULL,
    amount numeric(14,2) NOT NULL,
    payment_method_raw varchar(120),
    notes text,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_xml_import_installments_import FOREIGN KEY (xml_import_id)
        REFERENCES financeiro.xml_imports(id) ON DELETE CASCADE,
    CONSTRAINT ck_xml_import_installments_number CHECK (installment_number > 0),
    CONSTRAINT ck_xml_import_installments_amount CHECK (amount > 0),
    CONSTRAINT uq_xml_import_installments_number UNIQUE (xml_import_id, installment_number)
);

CREATE INDEX ix_xml_imports_supplier_document ON financeiro.xml_imports (supplier_document_number);
CREATE INDEX ix_xml_imports_document ON financeiro.xml_imports (document_model, document_series, document_number);
CREATE INDEX ix_xml_imports_due_date ON financeiro.xml_imports (due_date);
CREATE INDEX ix_xml_imports_parsed_data ON financeiro.xml_imports USING gin (parsed_data);
CREATE INDEX ix_xml_import_installments_due_date ON financeiro.xml_import_installments (due_date);

COMMIT;