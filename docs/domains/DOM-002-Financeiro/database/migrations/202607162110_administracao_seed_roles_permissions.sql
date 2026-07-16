-- FinControl
-- DOM-004: Initial roles and permissions

BEGIN;

INSERT INTO administracao.roles (code, name, description)
VALUES
    ('MASTER', 'Operador Master', 'Administrador funcional com poder para conceder permissões.'),
    ('FINANCIAL_MANAGER', 'Gestor Financeiro', 'Gestão, aprovação e autorização financeira.'),
    ('AP_OPERATOR', 'Operador de Contas a Pagar', 'Inclusão e manutenção de títulos.'),
    ('APPROVER', 'Aprovador', 'Aprovação e reprovação de títulos.'),
    ('AUDITOR', 'Auditor', 'Consulta e auditoria sem alteração.'),
    ('VIEWER', 'Consulta', 'Acesso somente para leitura.')
ON CONFLICT (code) DO NOTHING;

INSERT INTO administracao.permissions (code, name, description)
VALUES
    ('PAYABLE_TITLE_CREATE', 'Cadastrar título', 'Permite cadastrar contas a pagar.'),
    ('PAYABLE_TITLE_UPDATE', 'Alterar título', 'Permite alterar títulos elegíveis.'),
    ('PAYABLE_TITLE_CANCEL', 'Cancelar título', 'Permite cancelar títulos.'),
    ('PAYABLE_TITLE_APPROVE', 'Aprovar título', 'Permite aprovar, reprovar ou devolver títulos.'),
    ('PAYMENT_CREATE', 'Registrar pagamento', 'Permite registrar pagamentos.'),
    ('PAYMENT_REVERSE', 'Estornar pagamento', 'Permite estornar pagamentos.'),
    ('PAYMENT_BATCH_MANAGE', 'Gerenciar lote', 'Permite criar e processar lotes.'),
    ('DUPLICATE_OVERRIDE', 'Prosseguir após alerta', 'Permite confirmar cadastro após alerta de duplicidade.'),
    ('PHYSICAL_MAINTENANCE', 'Manutenção física', 'Permite executar rotinas físicas restritas.'),
    ('AUDIT_VIEW', 'Consultar auditoria', 'Permite consultar trilhas de auditoria.')
ON CONFLICT (code) DO NOTHING;

COMMIT;
