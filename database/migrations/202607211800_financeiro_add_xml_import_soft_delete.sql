-- FinControl
-- DOM-002: Soft delete support for XML imports

BEGIN;

ALTER TABLE financeiro.xml_imports
    ADD COLUMN deleted_at timestamptz,
    ADD COLUMN deleted_by uuid,
    ADD CONSTRAINT fk_xml_imports_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT;

CREATE INDEX ix_xml_imports_active_status_imported_at
ON financeiro.xml_imports (status_id, imported_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX ix_xml_imports_active_recipient_kind_imported_at
ON financeiro.xml_imports (recipient_kind, imported_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX ix_xml_imports_active_due_date
ON financeiro.xml_imports (due_date)
WHERE deleted_at IS NULL AND due_date IS NOT NULL;

CREATE INDEX ix_xml_imports_active_supplier_imported_at
ON financeiro.xml_imports (supplier_id, imported_at DESC)
WHERE deleted_at IS NULL AND supplier_id IS NOT NULL;

COMMIT;
