# Validacao local do FinControl

## Objetivo

Este roteiro existe para validar o comportamento real do banco e dos endpoints antes de aplicar qualquer correcao na VPS. Toda correcao estrutural descoberta aqui deve virar migration nova; migrations ja aplicadas permanecem imutaveis.

## Preparacao

1. Garantir Docker Desktop ativo no Windows.
2. Garantir o PostgreSQL local disponivel em `127.0.0.1:5434`.
3. Iniciar a API local ou manter o container `fincontrol-api-1` ativo em `127.0.0.1:3000`.

## Seed de validacao

Script: `database/scripts/seed_local_validation_data.sql`

Ele cria ou reaproveita:

- usuario Master local;
- 2 fornecedores;
- 2 categorias financeiras;
- 1 centro de custo;
- 1 banco e 1 conta bancaria;
- 4 titulos de teste:
  - aberto;
  - parcialmente pago;
  - em aprovacao;
  - vencido.

## Conferencia do seed

Script: `database/scripts/check_local_validation_state.sql`

Ele resume:

- status e saldo dos titulos `LOCAL-*`;
- eventos recentes de auditoria.

## Endpoints prioritarios para smoke test

Autenticacao:

- `POST /auth/login`
- `GET /auth/me`
- `POST /auth/refresh`
- `POST /auth/logout`

Cadastros:

- `GET /api/v1/suppliers`
- `GET /api/v1/financial-categories?pageSize=100&active=true`
- `GET /api/v1/bank-accounts`

Contas a pagar:

- `GET /api/v1/payables`
- `GET /api/v1/payables/{id}`
- `GET /api/v1/payables/duplicates`
- `POST /api/v1/payments`
- `GET /api/v1/payment-batches`
- `GET /api/v1/xml-imports`

Inteligencia:

- `GET /api/v1/dashboard?from=2026-07-01&to=2026-07-31`
- `GET /api/v1/agenda?from=2026-07-01&to=2026-07-31`

## Regra de correcao

Se a falha aparecer:

- apenas no ambiente local, corrigir e validar aqui primeiro;
- local e VPS, transformar o ajuste estrutural em migration nova;
- apenas na VPS, comparar schema, dados seed e variaveis de ambiente antes de alterar codigo.

## Evidencias esperadas

Registrar ao final:

- resultado do seed;
- resultado do check do estado local;
- resultado dos endpoints prioritarios;
- qualquer divergencia entre local e VPS;
- migrations novas necessarias, se houver.
