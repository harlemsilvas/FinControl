# TELA VISÃO GERAL (dashboard)

## Melhorias e correções

- Os itens listados foram analisados, e sugerimos algumas alterações. Veja o que pode ser feito já, e o que envolve estudo de caso.

- Card Vence Hoje - não esta sendo alimentado com valores.
- Os filtros não estão respeitando os espaçoes em Tela de Redimesionamento, e somes. Precisamos trabalhar na folha de estilo, para ficar mais responsiva
- Os filtros Vencimento inicial e Vencimento final vamos limitar a uma informação de Mês/Ano, não vamos deixar a opção de dia. Posso colocar por exemplo Jan/2026 e Jun/2026, mas não limitar à dias.

## Pacote aplicado em 31/07/2026

- O card `Vence hoje` deixou de depender da lista visual limitada de próximos
  compromissos e passa a usar totais próprios retornados pelo endpoint
  `/api/v1/dashboard`.
- A API passa a retornar no `summary`:
  - `today`: total monetário em aberto com vencimento na data atual;
  - `todayCount`: quantidade de títulos em aberto com vencimento na data atual.
- Os filtros `Vencimento inicial` e `Vencimento final` foram substituídos por
  `Mês inicial` e `Mês final` na interface.
- A tela converte internamente os meses selecionados para datas ISO:
  - mês inicial: primeiro dia do mês;
  - mês final: último dia do mês.
- O contrato da API permanece recebendo `from` e `to` como datas ISO, evitando
  quebra de compatibilidade com Agenda Financeira e demais chamadas.
- A grade de filtros recebeu ajustes responsivos para reduzir estouro, corte ou
  desaparecimento dos campos em telas menores.
