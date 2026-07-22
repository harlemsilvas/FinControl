BEGIN;

ALTER TABLE cadastros.company_parameters
ADD COLUMN default_financial_category_id uuid;

ALTER TABLE cadastros.company_parameters
ADD CONSTRAINT fk_company_parameters_financial_category FOREIGN KEY (default_financial_category_id)
    REFERENCES cadastros.financial_categories(id) ON DELETE RESTRICT;

ALTER TABLE financeiro.xml_imports
ADD COLUMN company_id uuid;

ALTER TABLE financeiro.xml_imports
ADD CONSTRAINT fk_xml_imports_company FOREIGN KEY (company_id)
    REFERENCES cadastros.companies(id) ON DELETE RESTRICT;

ALTER TABLE financeiro.payable_titles
ADD COLUMN company_id uuid;

ALTER TABLE financeiro.payable_titles
ADD CONSTRAINT fk_payable_titles_company FOREIGN KEY (company_id)
    REFERENCES cadastros.companies(id) ON DELETE RESTRICT;

CREATE INDEX ix_company_parameters_financial_category
ON cadastros.company_parameters (default_financial_category_id)
WHERE deleted_at IS NULL AND default_financial_category_id IS NOT NULL;

CREATE INDEX ix_xml_imports_company_imported_at
ON financeiro.xml_imports (company_id, imported_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX ix_payable_titles_company_status
ON financeiro.payable_titles (company_id, status_id)
WHERE deleted_at IS NULL;

COMMENT ON COLUMN cadastros.company_parameters.default_financial_category_id
IS 'Categoria financeira padrão para títulos gerados a partir de rotinas automatizadas da empresa.';

COMMENT ON COLUMN financeiro.xml_imports.company_id
IS 'Empresa destinatária resolvida pelo CNPJ cadastrado em cadastros.companies.';

COMMENT ON COLUMN financeiro.payable_titles.company_id
IS 'Empresa proprietária do título financeiro.';

COMMIT;
