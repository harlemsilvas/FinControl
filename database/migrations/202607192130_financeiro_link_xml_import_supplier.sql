-- FinControl
-- DOM-002: Link XML imports to supplier resolved during import

BEGIN;

ALTER TABLE financeiro.xml_imports
    ADD COLUMN supplier_id uuid,
    ADD CONSTRAINT fk_xml_imports_supplier FOREIGN KEY (supplier_id)
        REFERENCES cadastros.suppliers(id) ON DELETE SET NULL;

CREATE INDEX ix_xml_imports_supplier
ON financeiro.xml_imports (supplier_id, imported_at DESC)
WHERE supplier_id IS NOT NULL;

COMMIT;
