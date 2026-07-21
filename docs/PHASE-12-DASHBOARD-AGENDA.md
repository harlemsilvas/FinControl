# Fase 12 — Dashboard e Agenda

**Data:** 16/07/2026
**Status:** concluída
**Próxima fase:** Fase 13 — Docker da aplicação

## Entregas

- Dashboard financeiro em `/`, com total a pagar, vencidos, a vencer e pagamentos efetivos no período.
- Gráfico de saldo por categoria e lista destacada dos próximos compromissos.
- Agenda financeira em `/agenda`, com visões diária, semanal e mensal.
- Filtros por período, fornecedor e categoria.
- Destaques distintos para vencidos, vencimentos do dia e próximos vencimentos.
- Acesso direto da agenda e do dashboard ao título de Contas a Pagar.
- Contratos autenticados `GET /api/v1/dashboard` e `GET /api/v1/agenda`.
- Leituras agregadas no domínio de Inteligência, sem criar ou alterar objetos de banco.

## Decisões

- Títulos cancelados, inativos, excluídos logicamente ou sem saldo aberto não participam da agenda.
- O indicador `pagos` considera pagamentos com status `EFFECTIVE` e data de pagamento dentro do período.
- Os demais indicadores usam saldo aberto e vencimento das parcelas dentro do período selecionado.
- O acesso reutiliza a permissão `PAYABLE_TITLE_VIEW`; o Operador Master permanece autorizado independentemente de vínculo de perfil.

## Correção transversal

O hook de autorização do Fastify foi tornado assíncrono. A implementação anterior não concluía o `preHandler` em rotas protegidas, fazendo as consultas permanecerem pendentes após um login válido.

## Validação

- endpoints do dashboard, agenda e Contas a Pagar testados com autenticação Master contra o PostgreSQL local;
- proteção sem bearer token coberta por teste HTTP;
- cálculo de intervalos e formatação de datas cobertos no frontend;
- lint, typecheck, testes e build executados na raiz do workspace.
