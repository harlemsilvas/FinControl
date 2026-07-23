# Feature futura: etiquetas visuais na Agenda Financeira

**Status:** documentado para analise futura.

## Contexto

A Agenda Financeira foi remodelada visualmente para exibir os vencimentos em
grade mensal/semanal/diaria. No estado atual, o contrato `GET /api/v1/agenda`
retorna dados suficientes para listar a parcela, fornecedor, documento, valor,
vencimento e destaque de situacao.

Para manter os cards compactos, a tela abrevia nomes longos e preserva o nome
completo no tooltip do item.

## Ideias para evolucao

### Nome fantasia ou nome curto no card

Quando o backend da agenda passar a retornar dados adicionais do fornecedor ou
da empresa vinculada ao titulo, usar o campo mais curto para exibicao:

- `tradeName` / nome fantasia, quando existir;
- apelido operacional do fornecedor, se for criado futuramente;
- nome legal completo somente como fallback.

O objetivo e evitar cards largos e melhorar leitura rapida no calendario.

### Tag colorida por empresa

Como o sistema ja possui conceito multiempresa, a agenda pode futuramente exibir
uma pequena tag visual por empresa/CNPJ do titulo.

Exemplo:

```text
[ABC] CIA BRASILEIRA...
[HRM] Transporte ABC...
```

Essa tag deve ser derivada da empresa do titulo/importacao XML, nao da empresa
em sessao, porque o fluxo aprovado e operacional por CNPJ do documento.

### Tags financeiras coloridas

O banco ja possui estrutura tecnica em:

- `financeiro.tags`;
- `financeiro.payable_title_tags`.

Antes de usar tags coloridas na agenda, precisamos implementar ou revisar:

- cadastro/manutencao de Tags;
- campo de cor da tag, se a decisao for usar cor visual;
- regras para tags globais ou por empresa;
- permissao para criar/editar tags;
- experiencia de associar tags ao titulo de contas a pagar;
- criterio de exibicao quando um titulo tiver muitas tags.

## Decisao atual

Nao implementar tags coloridas na agenda agora.

Quando criarmos o cadastro e a manipulacao de Tags, reavaliar se elas devem
aparecer:

- como chips dentro do card;
- como borda/cor secundaria;
- como filtro da agenda;
- ou apenas no detalhe do titulo.

## Cuidados

- Evitar excesso de cores competindo com as cores de situacao: vencido, vence
  hoje, a vencer e pago.
- A cor principal do card deve continuar indicando a situacao financeira.
- Tags devem ser apoio visual, nao substituto do status.
- Em calendario mensal, priorizar legibilidade; se necessario, mostrar apenas
  uma tag principal e deixar as demais no detalhe/tooltip.

## Possivel ordem futura

1. Implementar cadastro de Tags.
2. Permitir associar tags ao titulo de contas a pagar.
3. Expor tags no detalhe/listagem de contas a pagar.
4. Expor tags no contrato da agenda.
5. Aplicar chips/filtros na Agenda Financeira.
