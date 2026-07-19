# Validacao local e remota executada em 17/07/2026

## Contexto

Objetivo da rodada:

- povoar o PostgreSQL local com massa ficticia controlada;
- validar leitura e escrita da API contra o banco real local;
- comparar o comportamento da VPS com o ambiente local;
- inserir uma base minima na VPS para permitir validacao visual das paginas e fluxos.

## Ambiente local validado

- Docker Desktop ativo no Windows;
- PostgreSQL local em `127.0.0.1:5434`;
- API local em `127.0.0.1:3000`;
- autenticacao do Master funcionando com `master@example.com`.

## Artefatos criados

- `database/scripts/seed_local_validation_data.sql`
- `database/scripts/seed_local_validation_data_v2.sql`
- `database/scripts/check_local_validation_state.sql`
- `database/scripts/seed_vps_minimal_validation_data.sql`
- `scripts/run_sql_file.mjs`
- `scripts/check_local_validation_state.mjs`
- `scripts/local_api_smoke.mjs`
- `scripts/local_api_mutation_check.mjs`
- `scripts/local_api_mutation_check_v2.mjs`
- `scripts/api_mutation_check_generic.mjs`
- `docs/LOCAL-VALIDATION-RUNBOOK.md`

## Problemas encontrados durante a validacao local

1. O primeiro seed local usava a forma de pagamento `BANK_SLIP`, mas a migration oficial seeda `BOLETO`.
2. O primeiro seed local tinha um `SELECT` final com coluna ambigua (`document_number`).
3. O primeiro utilitario de mutacao montava o lote com `bankAccountId = null`; a falha foi do script de teste, nao da API.

Nenhum desses pontos exigiu migration. Foram correcoes apenas nos artefatos de validacao.

## Resultado do banco local

Massa ficticia validada:

- 2 fornecedores;
- 2 categorias financeiras;
- 1 conta bancaria;
- 4 titulos:
  - `LOCAL-OPEN-001`
  - `LOCAL-PARTIAL-001`
  - `LOCAL-APPROVAL-001`
  - `LOCAL-OVERDUE-001`

Estado final confirmado apos mutacoes:

- `LOCAL-OPEN-001`: `PARTIALLY_PAID`, saldo aberto `850.00`
- `LOCAL-PARTIAL-001`: `PARTIALLY_PAID`, saldo aberto `300.00`
- `LOCAL-APPROVAL-001`: `IN_APPROVAL`, saldo aberto `1525.00`
- `LOCAL-OVERDUE-001`: `OVERDUE`, saldo aberto `620.00`

Eventos de auditoria confirmados:

- `PAYMENT.CREATED`
- `PAYMENT_BATCH.CREATED`
- eventos de autenticacao

## Resultado dos endpoints locais

Leituras validadas com sucesso:

- `POST /auth/login`
- `GET /auth/me`
- `GET /api/v1/suppliers`
- `GET /api/v1/financial-categories`
- `GET /api/v1/payables`
- `GET /api/v1/payables/:id`
- `GET /api/v1/payables/duplicates`
- `GET /api/v1/payment-batches`
- `GET /api/v1/xml-imports`
- `GET /api/v1/dashboard`
- `GET /api/v1/agenda`

Escritas validadas com sucesso:

- `POST /api/v1/payments`
- `POST /api/v1/payment-batches`

## Diagnostico da VPS antes do seed minimo

Foi confirmada a seguinte situacao em `17/07/2026`:

- a API estava online e respondendo `200`;
- o banco remoto usava o usuario `fincontrol_app`;
- o usuario `fincontrol_app` tinha grants e `EXECUTE` nas rotinas principais;
- as tabelas e views principais existiam;
- os dados operacionais estavam vazios:
  - `suppliers = 0`
  - `financial_categories = 0`
  - `bank_accounts = 0`
  - `payable_titles = 0`

Conclusao: o principal problema remoto nao era schema quebrado, mas ausencia de dados minimos para uso e validacao.

## Seed minimo preservado na VPS

O seed `database/scripts/seed_vps_minimal_validation_data.sql` foi aplicado e deve permanecer no banco para testes visuais e funcionais.

Base minima criada na VPS:

- 3 fornecedores;
- 3 categorias financeiras;
- 1 banco;
- 1 conta bancaria;
- 3 titulos:
  - `VPS-TIT-001`: aberto;
  - `VPS-TIT-002`: parcialmente pago;
  - `VPS-TIT-003`: vencido.

## Resultado dos endpoints da VPS

Leituras validadas com sucesso em `https://hrmmotos.com.br/fincontrol`:

- `POST /auth/login`
- `GET /auth/me`
- `GET /api/v1/suppliers`
- `GET /api/v1/financial-categories`
- `GET /api/v1/payables`
- `GET /api/v1/dashboard`
- `GET /api/v1/agenda`

Evidencias remotas observadas:

- 3 fornecedores retornados na listagem;
- 3 categorias retornadas na listagem;
- 3 titulos retornados na listagem;
- dashboard com:
  - `totalPayable = 1370.00`
  - `overdue = 920.00`
  - `upcoming = 450.00`
  - `paid = 500.00`

## Decisao operacional

Os dados seedados na VPS devem permanecer por enquanto para:

- validar as paginas do frontend corretamente;
- validar filtros, cards, agenda e listagens;
- reproduzir erros funcionais sem depender de cadastro manual repetitivo.

## Conclusao da rodada

O ambiente local ficou consistente e a API respondeu corretamente contra o PostgreSQL real.

A VPS tambem respondeu corretamente depois da insercao da massa minima de validacao.

Nesta rodada, nao foi identificada necessidade de migration nova.

O proximo foco deve ser:

- validar escrita remota com o utilitario generico;
- validar as paginas do frontend com os dados da VPS;
- somente gerar migration se algum erro estrutural aparecer em escrita real ou em consultas mais complexas.
