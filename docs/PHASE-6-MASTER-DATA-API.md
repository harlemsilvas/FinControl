# FinControl — Fase 6: APIs de Cadastros e Tesouraria

**Data:** 16/07/2026
**Status:** concluída e validada
**Próxima fase:** API de Contas a Pagar

## Escopo implementado

Todos os recursos usam o prefixo `/api/v1`:

| Recurso | Caminho | Domínio |
|---|---|---|
| Fornecedores | `/suppliers` | DOM-001 |
| Categorias financeiras | `/financial-categories` | DOM-001 |
| Centros de custo | `/cost-centers` | DOM-001 |
| Tipos de documento | `/document-types` | DOM-001 |
| Formas de pagamento | `/payment-methods` | DOM-001 |
| Condições de pagamento | `/payment-terms` | DOM-001 |
| Bancos | `/banks` | DOM-003 |
| Contas bancárias | `/bank-accounts` | DOM-003 |

Cada caminho oferece:

- `GET /`: listagem paginada com `page`, `pageSize`, `search` e `active`;
- `GET /:id`: consulta individual;
- `POST /`: criação;
- `PATCH /:id`: alteração parcial;
- `DELETE /:id`: inativação ou exclusão lógica, nunca exclusão física.

As listagens aceitam no máximo 100 registros por página. Identificadores, campos
obrigatórios, limites, e-mails, valores enumerados e referências são validados antes
da persistência. Violações de unicidade retornam `409`; referências ou constraints
inválidas retornam `400`.

## Segurança e auditoria

- `MASTER_DATA_VIEW`: consulta dos dados mestres e bancários.
- `MASTER_DATA_MANAGE`: criação, alteração e inativação.
- Master, Gestor Financeiro e Operador de Contas a Pagar recebem leitura e escrita.
- Auditor e Consulta recebem apenas leitura.
- Todas as mutações registram valores anteriores/novos em `administracao.audit_events`.

A migration nova `202607162300_administracao_seed_master_data_permissions.sql` foi
aplicada ao PostgreSQL local. Nenhuma migration anterior foi alterada.

## Validações executadas

```text
npm run lint      PASS
npm run typecheck PASS
npm test          PASS — 5 arquivos, 15 testes
npm run build     PASS
migration 2300    PASS — 2 permissões e associações de perfis
verify_database   PASS — PostgreSQL 17.10
```
