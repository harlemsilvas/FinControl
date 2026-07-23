-- FinControl
-- DOM-002: Payable recurrence permissions

BEGIN;

INSERT INTO administracao.permissions (code, name, description)
VALUES
    ('RECURRENCE_VIEW', 'Consultar recorrências', 'Permite consultar contas recorrentes.'),
    ('RECURRENCE_CREATE', 'Cadastrar recorrência', 'Permite cadastrar contas recorrentes.'),
    ('RECURRENCE_UPDATE', 'Alterar recorrência', 'Permite alterar contas recorrentes elegíveis.'),
    ('RECURRENCE_CANCEL', 'Cancelar recorrência', 'Permite suspender, reativar ou cancelar contas recorrentes.'),
    ('RECURRENCE_GENERATE', 'Gerar recorrência', 'Permite gerar títulos a partir de contas recorrentes.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO administracao.role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM administracao.roles r
CROSS JOIN administracao.permissions p
WHERE
    r.code = 'MASTER'
    OR (
        r.code = 'FINANCIAL_MANAGER'
        AND p.code IN ('RECURRENCE_VIEW','RECURRENCE_CREATE','RECURRENCE_UPDATE','RECURRENCE_CANCEL','RECURRENCE_GENERATE')
    )
    OR (
        r.code = 'AP_OPERATOR'
        AND p.code IN ('RECURRENCE_VIEW','RECURRENCE_CREATE','RECURRENCE_UPDATE','RECURRENCE_GENERATE')
    )
    OR (
        r.code IN ('AUDITOR','VIEWER')
        AND p.code = 'RECURRENCE_VIEW'
    )
ON CONFLICT DO NOTHING;

COMMIT;
