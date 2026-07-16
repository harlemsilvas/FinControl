# Migrations iniciais — FinControl

Ordem de execução:

1. `202607162000_core_enable_extensions.sql`
2. `202607162010_core_create_schemas.sql`
3. `202607162020_administracao_create_updated_at_function.sql`
4. `202607162030_financeiro_create_status_tables.sql`
5. `202607162040_administracao_create_audit_events.sql`
6. `202607162050_financeiro_seed_status_tables.sql`

Essas migrations criam a infraestrutura inicial, sem ainda criar títulos, parcelas e pagamentos.
