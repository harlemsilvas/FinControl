# Comparativo previsto x pago

**Domínio:** DOM-005 — Inteligência e Relatórios
**Status:** implementado localmente; aguardando validação visual com dados reais

## Leitura dos números

- **Previsto** é a soma do valor original das parcelas ativas com vencimento
  dentro do período, inclusive as parcelas já pagas. Títulos cancelados ou
  removidos logicamente não entram neste lado.
- **Pago** é a soma de `movement_amount` dos pagamentos efetivos com data de
  pagamento dentro do período, mesmo que o vencimento da parcela seja outro.
  Estornos não entram. Encargos aumentam o pago; descontos o reduzem.
- **Diferença** é `pago - previsto`. Ela mostra o descompasso de períodos, não
  o saldo aberto nem a pontualidade de um título individual.
- Pagamentos históricos efetivos permanecem no realizado mesmo se o título
  for posteriormente inativado; não reescrevemos saídas de caixa.

Os dois lados são agregados em conjuntos independentes unidos por `UNION ALL`.
Isso impede multiplicar uma parcela prevista ao associá-la a vários
pagamentos parciais.

## Primeira entrega

- Período com atalhos e datas personalizadas; filtros por empresa, fornecedor
  e categoria aplicados igualmente aos dois lados.
- Visão global limitada no backend às empresas permitidas; Master pode ver
  todas as empresas.
- Totais, contagens e agrupamentos por data e por empresa.
- Impressão e planilha XLSX com resumo e abas por data/empresa.
- Rota `/reports/planned-vs-paid` e entrada própria no menu lateral.

Não é um fluxo de caixa completo: contas a receber, saldo bancário futuro e
conciliação permanecem fora do escopo.

## Validação antes do deploy

1. Conferir um mês com parcela vencida e paga em outro mês.
2. Conferir pagamento parcial, juros/desconto e estorno.
3. Comparar o lado `Pago` com `Pagamentos realizados` usando os mesmos filtros.
4. Testar Master, usuário restrito, planilha e impressão.
