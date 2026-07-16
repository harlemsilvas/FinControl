# FinControl — Migrations completas do núcleo financeiro

## Ordem de execução

1. `202607162000_core_enable_extensions.sql`
2. `202607162010_core_create_schemas.sql`
3. `202607162020_administracao_create_updated_at_function.sql`
4. `202607162030_financeiro_create_status_tables.sql`
5. `202607162040_administracao_create_audit_events.sql`
6. `202607162050_financeiro_seed_status_tables.sql`
7. `202607162100_administracao_create_users_and_roles.sql`
8. `202607162110_administracao_seed_roles_permissions.sql`
9. `202607162120_cadastros_create_master_data.sql`
10. `202607162130_cadastros_seed_master_data.sql`
11. `202607162140_tesouraria_create_banks_accounts.sql`
12. `202607162150_financeiro_create_payable_titles.sql`
13. `202607162160_financeiro_create_installments.sql`
14. `202607162170_financeiro_create_tags_attachments.sql`
15. `202607162180_financeiro_create_approvals.sql`
16. `202607162190_financeiro_create_payment_batches.sql`
17. `202607162200_financeiro_create_payments_reversals.sql`
18. `202607162210_financeiro_create_xml_imports.sql`
19. `202607162220_financeiro_create_balance_functions.sql`
20. `202607162230_financeiro_create_soft_delete_procedures.sql`
21. `202607162240_financeiro_create_views.sql`
22. `202607162250_financeiro_create_maintenance_log.sql`
23. `202607162260_financeiro_create_validation_functions.sql`
24. `202607162270_core_grants_template.sql`
25. `202607162280_core_schema_version.sql`

## Escopo coberto

- Extensões e schemas;
- usuários, perfis e permissões mínimos;
- fornecedores e cadastros auxiliares;
- bancos e contas bancárias;
- títulos a pagar e parcelas;
- marcadores e anexos;
- aprovações;
- lotes, pagamentos e estornos;
- importação XML;
- auditoria e manutenção;
- funções de saldo, validação e exclusão lógica;
- views operacionais;
- grants de segurança;
- registro opcional de versões.

## Observações

- As seis migrations iniciais já existentes no Drive continuam sendo as primeiras.
- O arquivo `core_grants_template.sql` deve ser revisado por ambiente antes da produção.
- Pagamento acima do saldo permanece permitido apenas mediante confirmação registrada.
- Impostos e retenções não foram incluídos porque permanecem como decisão futura.
