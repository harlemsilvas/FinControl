-- FinControl
-- DOM-004: Permissions required by Phase 6 master-data APIs

BEGIN;

INSERT INTO administracao.permissions (code, name, description)
VALUES
    ('MASTER_DATA_VIEW', 'Consultar cadastros', 'Permite consultar dados mestres e bancários.'),
    ('MASTER_DATA_MANAGE', 'Gerenciar cadastros', 'Permite criar, alterar e inativar dados mestres e bancários.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO administracao.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM administracao.roles r
JOIN administracao.permissions p ON p.code = 'MASTER_DATA_VIEW'
WHERE r.code IN ('MASTER', 'FINANCIAL_MANAGER', 'AP_OPERATOR', 'AUDITOR', 'VIEWER')
ON CONFLICT DO NOTHING;

INSERT INTO administracao.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM administracao.roles r
JOIN administracao.permissions p ON p.code = 'MASTER_DATA_MANAGE'
WHERE r.code IN ('MASTER', 'FINANCIAL_MANAGER', 'AP_OPERATOR')
ON CONFLICT DO NOTHING;

COMMIT;
