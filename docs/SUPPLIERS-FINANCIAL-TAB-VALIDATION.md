# Fornecedores — Onda 2 Parcial: Dados Financeiros

Data: 19/07/2026
Ambiente: local WSL Ubuntu com PostgreSQL no Docker Desktop Windows
Branch: agent/phases-5-11

## Objetivo

Avançar a tela de fornecedores após a Onda 1, mantendo as decisões já aprovadas e evitando antecipar módulos ainda indefinidos.

## Escopo implementado

A etapa atual implementou somente a parte segura da aba Dados Financeiros:

- forma de pagamento preferencial;
- condição de pagamento;
- centro de custo padrão;
- prazo médio em dias;
- dia preferencial de pagamento;
- observação financeira.

As abas abaixo foram deixadas como espaços reservados, sem criar modelo definitivo:

- Documentos;
- Informações Complementares;
- Pedidos.

## Decisões preservadas

- Migrations já aplicadas não foram alteradas.
- Foi criada uma migration nova para alteração estrutural.
- Nenhum objeto foi criado no schema `public`.
- Foram reutilizados cadastros mestres existentes em `cadastros.payment_methods`, `cadastros.payment_terms` e `cadastros.cost_centers`.
- Dados bancários do fornecedor, retenções, documentos e pedidos não foram modelados nesta etapa por dependerem de decisão funcional específica.

## Migration criada

Arquivo:

- `database/migrations/202607191200_cadastros_add_supplier_financial_preferences.sql`

Alterações:

- adiciona em `cadastros.suppliers`:
  - `default_payment_method_id`;
  - `default_payment_term_id`;
  - `default_cost_center_id`;
  - `average_payment_term_days`;
  - `preferred_payment_day`;
  - `financial_notes`;
- cria FKs para formas de pagamento, condições de pagamento e centros de custo;
- cria checks para prazo médio e dia preferencial;
- cria índices parciais para os relacionamentos financeiros;
- faz seed idempotente de condições de pagamento básicas.

## API

Alterações:

- `POST/PATCH/GET /api/v1/suppliers` passa a aceitar e retornar os campos financeiros.
- Novo recurso mestre exposto:
  - `GET /api/v1/payment-methods`.

## Frontend

Alterações em `apps/web/src/master-data/suppliers-page.tsx`:

- abas do formulário passaram a ser funcionais;
- Dados Gerais ficou isolada na primeira aba;
- Dados Financeiros recebeu campos reais integrados à API;
- Documentos, Informações Complementares e Pedidos ficaram como placeholders controlados.

## Validações executadas

### Banco local

Migration aplicada com sucesso no container local `fincontrol-postgres`.

Colunas confirmadas em `cadastros.suppliers`:

- `default_payment_method_id` uuid;
- `default_payment_term_id` uuid;
- `default_cost_center_id` uuid;
- `average_payment_term_days` integer;
- `preferred_payment_day` integer;
- `financial_notes` text.

Condições de pagamento seedadas:

- IMMEDIATE — A vista;
- NET_07 — 7 dias;
- NET_15 — 15 dias;
- NET_30 — 30 dias;
- NET_45 — 45 dias;
- NET_60 — 60 dias;
- TWO_INSTALLMENTS — 2 parcelas;
- THREE_INSTALLMENTS — 3 parcelas.

### Qualidade

Comandos executados com sucesso:

- `npm run lint --workspace apps/api`;
- `npm run lint --workspace apps/web`;
- `npm run build --workspace apps/api`;
- `npm run build --workspace apps/web`.

### Serviços locais

Serviços reiniciados e validados:

- API: `http://127.0.0.1:3000`;
- Web: `http://127.0.0.1:4173/suppliers`.

Health checks:

- `GET /health/live` retornou `status=ok`;
- `GET /health/ready` retornou `status=ok` com banco `fincontrol`.

### Smoke test autenticado

Endpoints consultados com token local:

- `/api/v1/payment-methods?pageSize=100&active=true` retornou 9 registros;
- `/api/v1/payment-terms?pageSize=100&active=true` retornou 8 registros;
- `/api/v1/cost-centers?pageSize=100&active=true` retornou 1 registro;
- `/api/v1/suppliers?pageSize=5&active=true` retornou 4 registros antes do smoke de criação.

Fornecedor fictício criado via API para validar gravação/leitura:

- id: `8b1d0334-9e23-40dd-9d9f-bf0f0ea5352e`;
- resultado: campos financeiros foram gravados e lidos de volta com sucesso.

## Pendências conhecidas

- Corrigir textos truncados/encoding em mensagens antigas da API que ainda aparecem como `d?gitos`, `inv?lido`, etc.
- Definir escopo funcional antes de modelar:
  - documentos/upload;
  - dados bancários do fornecedor;
  - retenções/impostos;
  - informações complementares operacionais;
  - pedidos/compras.
