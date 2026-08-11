-- FinControl
-- DOM-004: Backup management permissions

BEGIN;

INSERT INTO administracao.permissions (code, name, description)
VALUES
    ('BACKUP_MANAGE', 'Gerenciar backups', 'Permite consultar, gerar e exportar backups do banco de dados.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO administracao.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM administracao.roles r
CROSS JOIN administracao.permissions p
WHERE r.code = 'MASTER'
  AND p.code = 'BACKUP_MANAGE'
ON CONFLICT DO NOTHING;

COMMIT;
