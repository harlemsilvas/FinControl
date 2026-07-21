-- FinControl
-- DOM-002: XML import recipient company classification

BEGIN;

ALTER TABLE financeiro.xml_imports
    ADD COLUMN recipient_legal_name varchar(255),
    ADD COLUMN recipient_document_number varchar(32),
    ADD COLUMN recipient_state_registration varchar(32),
    ADD COLUMN recipient_city_name varchar(120),
    ADD COLUMN recipient_state_code char(2),
    ADD COLUMN recipient_kind varchar(20) NOT NULL DEFAULT 'UNKNOWN',
    ADD COLUMN main_company_document_number varchar(32),
    ADD CONSTRAINT ck_xml_imports_recipient_kind CHECK (recipient_kind IN ('MAIN','BRANCH','UNKNOWN'));

CREATE INDEX ix_xml_imports_recipient_document ON financeiro.xml_imports (recipient_document_number);
CREATE INDEX ix_xml_imports_recipient_kind ON financeiro.xml_imports (recipient_kind, imported_at DESC);

COMMIT;