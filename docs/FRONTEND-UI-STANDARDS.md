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
- Não substituir menus laterais ou abas; breadcrumb é navegação contextual.
- Aplicar progressivamente nas próximas alterações de tela, sem criar refatoração global arriscada neste momento.

### Estado atual

- Aplicado na revisão v2 de Contas a Pagar.
- Aprovado pelo usuário como padrão para o projeto todo.
