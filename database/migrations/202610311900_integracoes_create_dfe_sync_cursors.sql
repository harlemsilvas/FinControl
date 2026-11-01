BEGIN;

-- Nova origem de importacao: NF-e de entrada trazidas da API do DFe (pull).
-- Os relatorios e a exportacao de notas importadas continuam filtrando MANUAL.
ALTER TABLE financeiro.xml_imports DROP CONSTRAINT ck_xml_imports_source;
ALTER TABLE financeiro.xml_imports
    ADD CONSTRAINT ck_xml_imports_source CHECK (import_source IN ('MANUAL', 'DFE_API'));
COMMENT ON COLUMN financeiro.xml_imports.import_source IS
'MANUAL: upload pelo usuario. DFE_API: conector que consulta a API do DFe-SEFAZ Enhanced.';

-- Cursor do conector por CNPJ (NSU da API do DFe, 15 digitos).
CREATE TABLE integracoes.dfe_sync_cursors (
    company_document_number varchar(14) PRIMARY KEY,
    last_nsu varchar(15) NOT NULL DEFAULT '000000000000000',
    imported_count bigint NOT NULL DEFAULT 0,
    last_run_at timestamptz,
    last_success_at timestamptz,
    last_error text,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_dfe_sync_cursors_document CHECK (company_document_number ~ '^[0-9]{14}$'),
    CONSTRAINT ck_dfe_sync_cursors_nsu CHECK (last_nsu ~ '^[0-9]{1,15}$')
);

COMMENT ON TABLE integracoes.dfe_sync_cursors IS
'Ultimo NSU importado da API do DFe por empresa. last_error nunca guarda XML nem credenciais.';

COMMIT;
