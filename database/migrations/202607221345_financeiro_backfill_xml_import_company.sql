BEGIN;

UPDATE financeiro.xml_imports x
SET company_id = c.id,
    recipient_kind = c.company_type
FROM cadastros.companies c
WHERE x.company_id IS NULL
  AND regexp_replace(coalesce(x.recipient_document_number, ''), '\D', '', 'g') = c.document_number
  AND c.is_active
  AND c.deleted_at IS NULL
  AND x.deleted_at IS NULL;

COMMENT ON COLUMN financeiro.xml_imports.company_id
IS 'Empresa destinatária resolvida pelo CNPJ cadastrado em cadastros.companies; XMLs antigos são preenchidos por backfill.';

COMMIT;
