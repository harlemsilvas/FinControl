BEGIN;

INSERT INTO cadastros.supplier_categories (code, name, description)
VALUES
    ('PARTICULAR', 'Particular', 'Fornecedor de produtos ou serviços para uso pessoal')
ON CONFLICT (code) DO NOTHING;

COMMIT;
