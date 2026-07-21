# Contas a Pagar — filtros reais da listagem

Data: 19/07/2026
Status: implementado

## Objetivo

Melhorar a listagem de Contas a Pagar com filtros reais e paginação consistente, aproximando a tela do modelo visual aprovado.

## Filtros implementados

A rota `GET /api/v1/payables` passa a aceitar:

- `search` — documento, descrição ou fornecedor;
- `status`;
- `dueFrom`;
- `dueTo`;
- `supplierId`;
- `categoryId`;
- `page`;
- `pageSize`.

## Regras de data

A listagem continua orientada por título. Para exibição e filtros de vencimento, usa a primeira parcela ativa do título:

- `firstDueDate`;
- `paymentMethodName`.

Essa decisão evita migration e preserva o modelo atual, onde vencimento e forma de pagamento pertencem à parcela.

## Atalhos de período no frontend

A tela oferece:

- Hoje;
- Semana atual;
- Mês atual;
- Ano atual;
- Período personalizado.

Alterar datas manualmente muda o filtro para período personalizado.

## Paginação

A tela exibe:

- início e fim do intervalo atual;
- total de registros filtrados;
- tamanho de página: 10, 20, 50 ou 100;
- página atual e total de páginas.

## Limites preservados

- Filtros são aplicados sobre a primeira parcela ativa do título.
- Filtros por múltiplas parcelas do mesmo título ficam para etapa futura, caso a operação exija visão por parcela.
- Nenhuma alteração de schema foi necessária para os filtros.