# Padrões Visuais do Frontend

Data: 19/07/2026
Status: aprovado para aplicação progressiva

## Breadcrumb

O breadcrumb passa a ser padrão visual obrigatório para as telas internas do FinControl.

### Objetivo

- Situar o usuário dentro do módulo atual.
- Facilitar retorno para listas e áreas superiores.
- Manter consistência entre cadastros, financeiro, tesouraria, relatórios e configurações.

### Formato recomendado

```text
Domínio > Seção > Ação ou Registro Atual
```

Exemplos:

```text
Cadastros > Fornecedores > Novo Fornecedor
Financeiro > Contas a Pagar > Nova Conta
Financeiro > Contas a Pagar > Editar Conta
Tesouraria > Contas Bancárias > Nova Conta Bancária
```

### Regras de uso

- Usar em todas as telas de cadastro, edição, detalhe e operação.
- Posicionar no cabeçalho da página, antes do título principal.
- Os níveis intermediários devem ser links navegáveis quando houver rota correspondente.
- O último nível representa a tela atual e não precisa ser link.
- O separador visual deve usar `>` para evitar problemas de renderização/encoding.
- Não substituir menus laterais ou abas; breadcrumb é navegação contextual.
- Aplicar progressivamente nas próximas alterações de tela, sem criar refatoração global arriscada neste momento.

### Estado atual

- Aplicado na revisão v2 de Contas a Pagar.
- Componente compartilhado `Breadcrumb` criado para padronizar novas telas.
- Aplicado progressivamente em Dashboard, Agenda Financeira, Cadastros, Fornecedores e Contas a Pagar.
- Aprovado pelo usuário como padrão para o projeto todo.

## Campos monetários

Campos de valor monetário devem seguir o padrão brasileiro na exibição e na edição.

### Regras de uso

- Exibir e editar valores no formato `1.234,56`.
- Não usar `input type="number"` para campos monetários, pois ele exibe controles de incremento/decremento e não respeita bem a máscara brasileira.
- Usar entrada textual com `inputMode="decimal"`, mantendo boa experiência em teclado móvel.
- Converter o valor para número decimal antes de enviar para a API.
- Usar o componente compartilhado `CurrencyInput` para novos campos monetários do frontend.
- Campos numéricos não monetários, como dias, quantidade e número de parcelas, podem continuar como número simples quando fizer sentido.

### Estado atual

- Aplicado nos valores de Contas a Pagar.
- Aplicado no campo `Pedido mínimo` do cadastro de Fornecedores.

## Menu lateral

O menu lateral passa a seguir a organização por áreas funcionais, conforme o modelo visual aprovado para o FinControl.

### Grupos padrão

- Entrada principal: Dashboard.
- Cadastros: fornecedores, categorias, centros de custo, contas bancárias, tipos de documento, formas de pagamento, condições de pagamento e bancos.
- Financeiro: contas a pagar, agenda, aprovações, pagamentos, recorrências e conciliação bancária.
- Relatórios: relatórios, dashboards, fluxo de caixa e indicadores.
- Configurações: usuários, perfis de acesso e parâmetros.

### Regras de uso

- Itens com tela implementada devem apontar para sua rota real.
- Itens planejados, mas ainda não implementados, devem apontar para uma página placeholder funcional com breadcrumb, status claro e próximos passos sugeridos.
- A seção ativa deve usar destaque visual azul, mantendo o fundo lateral em azul-marinho.
- A estrutura deve ser mantida como padrão para novas telas internas.`n- Quando uma tela placeholder for implementada de verdade, sua rota deve ser reaproveitada para evitar mudança desnecessária de navegação.
