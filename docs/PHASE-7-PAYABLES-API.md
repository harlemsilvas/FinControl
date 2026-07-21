# FinControl — Fase 7: API de Contas a Pagar

**Data:** 16/07/2026
**Status:** concluída para o modelo e decisões funcionais atuais
**Próxima fase:** testes ampliados do backend

## Escopo implementado

Todos os contratos usam o prefixo `/api/v1` e exigem autenticação:

- títulos: criar, alterar, consultar e listar com paginação, busca e status;
- duplicidade: consulta e alerta não bloqueante por fornecedor, documento, série e parcela;
- parcelas: criação transacional com o título e alteração individual consistente;
- marcadores: criar/vincular e desvincular;
- anexos: registrar metadados e inativar logicamente;
- cancelamento: exige permissão e justificativa, bloqueando títulos com pagamentos efetivos;
- aprovação: criar solicitação e decidir por aprovação, reprovação ou devolução;
- pagamentos: parcial, integral ou acima do saldo com confirmação explícita;
- estornos: motivo obrigatório e recálculo automático de saldo/estado;
- lotes: criar e listar lotes de pagamento;
- XML: registrar e listar o fluxo de importação.

## Regras financeiras aplicadas

- título e parcelas são criados na mesma transação;
- a soma das parcelas deve ser exatamente igual ao total calculado do título;
- valor total nunca é aceito do cliente e continua calculado pelo PostgreSQL;
- título duplicado retorna alerta `409`; a continuidade exige `duplicateConfirmed` e é auditada;
- campos financeiros de títulos/parcelas com pagamentos efetivos ficam protegidos até o estorno;
- título cancelado não recebe pagamentos;
- título pago não pode ser cancelado antes dos estornos;
- pagamento acima do saldo exige `overpaymentConfirmed` e registra o responsável;
- criação de pagamentos e estornos recalcula parcelas e títulos automaticamente;
- operações financeiras compostas usam transações PostgreSQL.

## Segurança

Foram adicionadas `PAYABLE_TITLE_VIEW`, `PAYABLE_ATTACHMENT_MANAGE`,
`PAYABLE_TAG_MANAGE` e `XML_IMPORT_MANAGE`. As permissões financeiras anteriores foram
associadas aos perfis Master, Gestor Financeiro, Operador, Aprovador, Auditor e Consulta
conforme suas responsabilidades aprovadas.

## Banco

A migration `202607162310_financeiro_phase_7_permissions_and_title_balance.sql` foi
aplicada sem alterar migrations anteriores. Ela inclui as permissões, associações de
perfis e a função/gatilho de recálculo do estado do título.

## Limites preservados

- O endpoint de anexos registra metadados e caminho do arquivo. Upload binário, tamanho
  máximo, retenção e adaptador de armazenamento aguardam a política de anexos já marcada
  como decisão futura.
- O XML é registrado no workflow existente; parsing fiscal detalhado e geração automática
  de títulos dependem das regras fiscais futuras.
- A confirmação de pagamento acima do saldo segue o modelo já preparado no banco e deve
  ser ratificada antes da política definitiva de baixa.

## Validações

```text
npm run lint              PASS
npm run typecheck         PASS
npm test                  PASS — 6 arquivos, 18 testes
npm run build             PASS
migration 2310            PASS
verify_database.sql       PASS — PostgreSQL 17.10
test_financial_flow.sql   PASS — transação finalizada com ROLLBACK
```
