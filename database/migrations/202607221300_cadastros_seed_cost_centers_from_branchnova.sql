BEGIN;

WITH seed(code, name, parent_code, description) AS (
    VALUES
        ('ADM-01', 'Administrativo ABC', NULL, 'Custos gerais e matriz'),
        ('CONT-01', 'Contabilidade ABC', 'ADM-01', 'Contabilidade e Auditoria'),
        ('RH-01', 'Recursos Humanos ABC', 'ADM-01', 'Recursos Humanos e Folha'),
        ('TI-01', 'TI ABC', 'ADM-01', 'Tecnologia da Informação'),
        ('COM-01', 'Comercial/Vendas ABC', NULL, 'Gastos comerciais e marketing'),
        ('MKT-01', 'Marketing ABC', 'COM-01', 'Marketing e Tráfego Pago'),
        ('VEND-01', 'Vendas ABC', 'COM-01', 'Comissões e Equipe de Vendas'),
        ('OP-01', 'Operação/Logística ABC', NULL, 'Custos de operação e entrega'),
        ('EST-01', 'Estoque ABC', 'OP-01', 'Armazenagem e Estoque'),
        ('EMB-01', 'Embalagens ABC', 'OP-01', 'Embalagens e Insumos'),
        ('FRETE-01', 'Fretes ABC', 'OP-01', 'Fretes e Expedição'),
        ('PROJ-01', 'Projetos / Filiais ABC', NULL, 'Unidades de negócio'),
        ('LJ-01', 'Loja Física ABC', 'PROJ-01', 'Ponto de venda físico'),
        ('SITE-01', 'Loja Virtual ABC', 'PROJ-01', 'Loja Virtual / E-commerce'),
        ('ADM-02', 'Administrativo HRM', NULL, 'Custos gerais e matriz'),
        ('CONT-02', 'Contabilidade HRM', 'ADM-02', 'Contabilidade e Auditoria'),
        ('RH-02', 'Recursos Humanos HRM', 'ADM-02', 'Recursos Humanos e Folha'),
        ('TI-02', 'TI HRM', 'ADM-02', 'Tecnologia da Informação'),
        ('COM-02', 'Comercial/Vendas HRM', NULL, 'Gastos comerciais e marketing'),
        ('MKT-02', 'Marketing HRM', 'COM-02', 'Marketing e Tráfego Pago'),
        ('VEND-02', 'Vendas HRM', 'COM-02', 'Comissões e Equipe de Vendas'),
        ('OP-02', 'Operação/Logística HRM', NULL, 'Custos de operação e entrega'),
        ('EST-02', 'Estoque HRM', 'OP-02', 'Armazenagem e Estoque'),
        ('EMB-02', 'Embalagens HRM', 'OP-02', 'Embalagens e Insumos'),
        ('FRETE-02', 'Fretes HRM', 'OP-02', 'Fretes e Expedição'),
        ('PROJ-02', 'Projetos / Filiais HRM', NULL, 'Unidades de negócio'),
        ('LJ-02', 'Loja Física HRM', 'PROJ-02', 'Ponto de venda físico'),
        ('SITE-02', 'Loja Virtual HRM', 'PROJ-02', 'Loja Virtual / E-commerce')
)
INSERT INTO cadastros.cost_centers (code, name, description, is_active)
SELECT code, name, description, true
FROM seed
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = true,
    updated_at = CURRENT_TIMESTAMP;

WITH seed(code, parent_code) AS (
    VALUES
        ('ADM-01', NULL),
        ('CONT-01', 'ADM-01'),
        ('RH-01', 'ADM-01'),
        ('TI-01', 'ADM-01'),
        ('COM-01', NULL),
        ('MKT-01', 'COM-01'),
        ('VEND-01', 'COM-01'),
        ('OP-01', NULL),
        ('EST-01', 'OP-01'),
        ('EMB-01', 'OP-01'),
        ('FRETE-01', 'OP-01'),
        ('PROJ-01', NULL),
        ('LJ-01', 'PROJ-01'),
        ('SITE-01', 'PROJ-01'),
        ('ADM-02', NULL),
        ('CONT-02', 'ADM-02'),
        ('RH-02', 'ADM-02'),
        ('TI-02', 'ADM-02'),
        ('COM-02', NULL),
        ('MKT-02', 'COM-02'),
        ('VEND-02', 'COM-02'),
        ('OP-02', NULL),
        ('EST-02', 'OP-02'),
        ('EMB-02', 'OP-02'),
        ('FRETE-02', 'OP-02'),
        ('PROJ-02', NULL),
        ('LJ-02', 'PROJ-02'),
        ('SITE-02', 'PROJ-02')
)
UPDATE cadastros.cost_centers AS child
SET parent_id = parent.id,
    updated_at = CURRENT_TIMESTAMP
FROM seed
LEFT JOIN cadastros.cost_centers AS parent
    ON parent.code = seed.parent_code
WHERE child.code = seed.code
  AND child.parent_id IS DISTINCT FROM parent.id;

COMMIT;
