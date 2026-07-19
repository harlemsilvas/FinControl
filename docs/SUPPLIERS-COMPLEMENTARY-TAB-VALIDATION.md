# Fornecedores — Onda 3 Parcial: Informações Complementares

Data: 19/07/2026
Ambiente: local WSL Ubuntu com PostgreSQL no Docker Desktop Windows
Branch: agent/phases-5-11

## Objetivo

Implementar a primeira versão funcional da aba Informações Complementares do cadastro de fornecedores, usando a lista aprovada pelo usuário e evitando criar cadastros auxiliares antes da necessidade real.

## Escopo implementado

Campos adicionados ao fornecedor:

- responsável interno;
- data de início do relacionamento;
- código interno;
- canal preferencial de contato;
- tipo operacional;
- prazo de entrega padrão em dias;
- pedido mínimo;
- transportadora preferencial;
- modalidade de frete;
- dias para recebimento;
- informações adicionais.

## Decisões preservadas

- Migrations já aplicadas não foram alteradas.
- Foi criada uma migration nova para alteração estrutural.
- Nenhum objeto foi criado no schema `public`.
- Não foram criadas tabelas auxiliares para canal, tipo operacional ou frete nesta etapa.
- Os campos foram mantidos opcionais para não travar o cadastro de fornecedores.
- A aba Pedidos segue sem modelo operacional, pois depende de módulo futuro de compras/pedidos.
- A aba Documentos segue sem upload próprio nesta etapa; XML/notas continuam no fluxo financeiro.

## Migration criada

Arquivo:

- `database/migrations/202607191330_cadastros_add_supplier_complementary_info.sql`

Alterações em `cadastros.suppliers`:

- `internal_responsible_name`;
- `relationship_started_at`;
- `internal_code`;
- `preferred_contact_channel`;
- `supplier_operational_type`;
- `default_delivery_lead_time_days`;
- `minimum_order_amount`;
- `preferred_carrier_name`;
- `freight_mode`;
- `receiving_days`;
- `additional_info`.

Checks adicionados:

- canal preferencial: `PHONE`, `WHATSAPP`, `EMAIL`, `IN_PERSON`;
- tipo operacional: `PRODUCT`, `SERVICE`, `PRODUCT_AND_SERVICE`;
- prazo de entrega padrão não negativo;
- pedido mínimo não negativo;
- modalidade de frete: `CIF`, `FOB`, `PICKUP`, `OWN_DELIVERY`, `NOT_APPLICABLE`.

Índices adicionados:

- índice único parcial para `internal_code` em fornecedores não excluídos;
- índice parcial para `supplier_operational_type`;
- índice parcial para `preferred_contact_channel`.

## API

`POST/PATCH/GET /api/v1/suppliers` passa a aceitar e retornar os campos complementares.

## Frontend

Alterações em `apps/web/src/master-data/suppliers-page.tsx`:

- aba Informações Complementares deixou de ser placeholder;
- campos complementares foram adicionados com labels em português;
- selects simples foram usados para canal preferencial, tipo operacional e modalidade de frete;
- campos numéricos receberam validação de valor não negativo.

## Validações executadas

### Banco local

Migration aplicada com sucesso no container local `fincontrol-postgres`.

Colunas confirmadas em `cadastros.suppliers`:

- `internal_responsible_name` varchar;
- `relationship_started_at` date;
- `internal_code` varchar;
- `preferred_contact_channel` varchar;
- `supplier_operational_type` varchar;
- `default_delivery_lead_time_days` integer;
- `minimum_order_amount` numeric;
- `preferred_carrier_name` varchar;
- `freight_mode` varchar;
- `receiving_days` varchar;
- `additional_info` text.

### Qualidade

Comandos executados com sucesso:

- `npm run lint --workspace apps/api`;
- `npm run build --workspace apps/api`;
- `npm run lint --workspace apps/web`;
- `npm run build --workspace apps/web`.

### Serviços locais

Serviços reiniciados e validados:

- API: `http://127.0.0.1:3000`;
- Web: `http://127.0.0.1:4173/suppliers`.

Health checks:

- `GET /health/live` retornou `status=ok`;
- `GET /health/ready` retornou `status=ok` com banco `fincontrol`.

### Smoke test autenticado

Fornecedor fictício criado via API para validar gravação/leitura:

- id: `6e70ec76-31da-4e2b-821e-f8f3187d7704`;
- resultado: campos complementares foram gravados e lidos de volta com sucesso.

## Pendências conhecidas

- Definir futuramente se `responsável interno` deve virar vínculo com usuário.
- Definir futuramente se `transportadora preferencial` deve virar cadastro próprio.
- Definir futuramente upload/documentos e pedidos/compras antes de criar novas estruturas.
