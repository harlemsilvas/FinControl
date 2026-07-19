# Revisão da Tela de Contas a Pagar — v2

Data: 19/07/2026
Referências visuais: `C:\projetos\telas\contas-a-pagar`
Branch: agent/phases-5-11

## Objetivo

Consolidar a leitura funcional da nova tela de Contas a Pagar antes de alterar migrations, API ou frontend.

A tela v2 muda principalmente a experiência de cadastro/edição. Ela aproxima o formulário do uso real de uma conta: fornecedor, vencimento, valor, documento, histórico, categoria, ocorrência, marcadores e resumo lateral.

## Arquivos analisados

- `C:\projetos\telas\contas-a-pagar\tela-nova conta-v2.jpg`
- `C:\projetos\telas\contas-a-pagar\tela-nova conta.jpg`
- `C:\projetos\telas\contas-a-pagar\tela-nova conta.png`

## Estado atual implementado

Frontend atual:

- `apps/web/src/payables/payable-form-page.tsx`
- `apps/web/src/payables/payable-form-contract.ts`
- `apps/web/src/payables/payables-types.ts`

API atual:

- `apps/api/src/domains/payables/payables-routes.ts`
- `apps/api/src/domains/payables/payables-repository.ts`

Modelo atual:

- `financeiro.payable_titles`
- `financeiro.payable_installments`
- tabelas auxiliares de status, anexos, tags, aprovações, pagamentos e XML.

## Decisões funcionais existentes que precisam ser preservadas

Do `PROJECT_STATUS.md`:

Campos obrigatórios na primeira página de Contas a Pagar:

- Fornecedor;
- Categoria;
- Descrição / Histórico;
- Número do Documento;
- Tipo de Documento;
- Parcela;
- Data de Emissão;
- Data de Vencimento;
- Forma de Pagamento;
- Valor Original.

Campos opcionais:

- Série;
- Condição de Pagamento;
- Desconto;
- Acréscimo;
- Observação.

Campo calculado:

- Valor Total = Valor Original - Desconto + Acréscimo.

Decisões de posicionamento:

- Projeto não faz parte da primeira página.
- Conta Bancária não aparece no cadastro inicial.
- Conta Bancária será informada na programação ou pagamento.
- Centro de Custo fica em observações/complementos.

## Leitura da tela v2

### Estrutura visual

A tela v2 possui:

- título `Nova Conta a Pagar`;
- breadcrumb financeiro;
- alerta visual de vencimento;
- botões superiores `Cancelar`, `Salvar e Novo`, `Salvar`;
- aba única destacada `Dados da Conta`;
- formulário principal à esquerda;
- card lateral de `Resumo`;
- ações inferiores `Cancelar` e `Salvar conta`.

### Campos visíveis na tela v2

#### Dados da conta

- Forma de Pagamento;
- Fornecedor;
- Vencimento;
- Valor;
- Data de Emissão;
- Número do Documento;
- Histórico / Descrição;
- Categoria.

#### Ocorrência

- Tipo de Ocorrência;
- Dia do Vencimento;
- Número de Parcelas;
- opção `Alterar conta recorrente`;
- Marcadores.

#### Resumo lateral

- Vencimento;
- Valor;
- Ocorrência;
- link para Agenda Financeira.

## Matriz atual x v2

| Campo/área v2 | Estado atual | Observação | Ação recomendada |
|---|---:|---|---|
| Forma de Pagamento | Existe em parcelas | Hoje fica por parcela | Onda 1: exibir no formulário principal e propagar para parcela única/geração inicial. |
| Fornecedor | Existe | Select simples | Melhorar layout e, depois, busca/atalhos. |
| Vencimento | Existe em parcelas | Não está no título | Onda 1: para conta única, mapear para primeira parcela; para parcelada, usar como base. |
| Valor | Existe como `originalAmount` | Label atual é Valor Original | Onda 1: renomear visualmente para Valor mantendo contrato interno. |
| Data de Emissão | Existe | Já está no título | Reaproveitar. |
| Número do Documento | Existe | Obrigatório no modelo atual | Reaproveitar. |
| Histórico / Descrição | Existe | Obrigatório | Reaproveitar. |
| Categoria | Existe | Obrigatório | Reaproveitar. |
| Tipo de Ocorrência | Parcial | Hoje parcelas são aba separada | Onda 1 visual: Única/Parcelada; Recorrente fica travado/documentado. |
| Dia do Vencimento | Não existe em título | Pode ser derivado do vencimento | Onda 1: campo auxiliar no frontend para geração; não precisa migration imediata. |
| Número de Parcelas | Existe em parcelas | Hoje usuário adiciona/remover manualmente | Onda 1: gerar parcelas automaticamente a partir do número. |
| Alterar conta recorrente | Não existe | Depende de recorrências | Deixar desabilitado/explicativo até modelagem de recorrências. |
| Marcadores | Existe no domínio financeiro como tags | UI atual não permite gerenciar no formulário principal | Onda 2: revisar tags/marcadores antes de conectar. |
| Resumo lateral | Não existe | Calculável no frontend | Onda 1: implementar somente visual/calculado. |
| Link Agenda | Agenda existe | Pode navegar para `/agenda` | Onda 1: link simples sem nova API. |

## Diferenças relevantes entre modelo atual e tela v2

### 1. Forma de pagamento no topo

Hoje a forma de pagamento pertence à parcela (`financeiro.payable_installments.payment_method_id`).

A tela v2 mostra forma de pagamento antes da ocorrência. Para preservar o modelo aprovado, a forma de pagamento pode ser usada como valor padrão para as parcelas geradas, sem mover o campo para o título neste momento.

### 2. Vencimento como campo principal

Hoje vencimento é propriedade da parcela (`due_date`).

A tela v2 trata vencimento como campo principal. Para uma conta única, isso é a data da primeira parcela. Para uma conta parcelada, pode ser a data base para geração das parcelas.

### 3. Ocorrência

A tela v2 sugere três conceitos:

- conta única;
- conta parcelada;
- conta recorrente.

O modelo atual suporta parcelas, mas não possui recorrência estruturada. Portanto:

- `Única` e `Parcelada` podem ser implementadas primeiro sem migration;
- `Recorrente` deve ficar para modelagem própria.

### 4. Marcadores

O financeiro já possui `financeiro.tags` e `financeiro.payable_title_tags`, mas a tela atual não oferece boa experiência de criação/seleção no cadastro.

Como fornecedores agora têm `cadastros.markers`, existe uma decisão futura importante: unificar conceito de marcadores/tags ou manter marcadores cadastrais e tags financeiras separados. Não corrigir isso dentro da primeira onda visual de Contas a Pagar.

## Onda 1 recomendada — sem migration

Implementar primeiro uma reorganização visual e comportamental usando o schema atual:

1. Transformar a aba `Dados da Conta` no layout v2.
2. Manter abas avançadas existentes abaixo ou como fluxo secundário, sem remover funcionalidades.
3. Adicionar card lateral de resumo calculado.
4. Colocar `Forma de Pagamento` no topo como campo padrão para parcelas.
5. Colocar `Vencimento` no topo como data base da primeira parcela.
6. Adicionar controles de ocorrência:
   - tipo: `Única` ou `Parcelada`;
   - dia do vencimento;
   - número de parcelas.
7. Gerar parcelas automaticamente no frontend para conta única/parcelada.
8. Deixar recorrência visualmente explicada/desabilitada até modelagem.
9. Manter `Tipo de Documento`, `Série`, `Condição de Pagamento`, `Desconto`, `Acréscimo`, `Centro de Custo`, `Observações`, `Impostos`, `Anexos` e `Aprovações` preservados no fluxo atual, mesmo que fora do bloco principal v2.

## Onda 2 recomendada — depende de decisão

Depois da Onda 1, decidir:

- se marcadores financeiros devem usar `financeiro.tags` ou `cadastros.markers`;
- se recorrência terá tabela própria;
- se a conta recorrente gera títulos futuros automaticamente;
- se anexos/documentos serão upload real;
- se XML importado abre essa tela já preenchida;
- se a tela de edição difere da tela de criação para títulos pagos/parciais.

## Campos que não devem ser movidos agora

- Conta bancária: continua na programação/pagamento.
- Projeto: continua fora da primeira página.
- Centro de custo: continua em observações/complementos.
- Dados bancários do fornecedor: continuam fora de Contas a Pagar.

## Próximo passo de implementação

Se aprovado, iniciar pela Onda 1 sem migration:

- alterar `apps/web/src/payables/payable-form-page.tsx`;
- preservar contrato da API atual;
- validar criação de conta única;
- validar criação de conta parcelada;
- validar edição de título existente;
- documentar resultados em arquivo próprio.
