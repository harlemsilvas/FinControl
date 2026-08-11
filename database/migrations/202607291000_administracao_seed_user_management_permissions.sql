-- FinControl
-- DOM-004: User management permissions

BEGIN;

INSERT INTO administracao.permissions (code, name, description)
VALUES
    ('USER_MANAGE', 'Gerenciar usuários', 'Permite criar, alterar, inativar e reativar usuários do sistema.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO administracao.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM administracao.roles r
CROSS JOIN administracao.permissions p
WHERE r.code = 'MASTER'
  AND p.code = 'USER_MANAGE'
ON CONFLICT DO NOTHING;

COMMIT;
