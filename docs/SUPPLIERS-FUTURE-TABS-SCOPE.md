# Fornecedores — Escopo Futuro das Abas Documentos e Pedidos

Data: 19/07/2026
Branch: agent/phases-5-11

## Objetivo

Registrar o escopo das abas `Documentos` e `Pedidos` do cadastro de fornecedores para evitar criação prematura de tabelas, campos ou fluxos sem contrato funcional aprovado.

## Decisão atual

As abas permanecem visíveis na tela de fornecedores para manter a navegação alinhada ao desenho alvo, mas não devem criar dados operacionais nesta fase.

## Aba Documentos

### Escopo atual

- Não haverá upload próprio de documentos no cadastro do fornecedor nesta etapa.
- XML e notas fiscais devem continuar entrando pelo fluxo financeiro de contas a pagar/importação XML.
- A aba apenas comunica essa regra ao usuário.

### Antes de modelar

Definir:

- quais tipos documentais serão controlados;
- se documento terá validade;
- se haverá alerta de vencimento;
- se documento vencido bloqueia uso do fornecedor;
- onde arquivos serão armazenados;
- permissões de upload, download e exclusão;
- vínculo entre documento do fornecedor e documentos financeiros.

## Aba Pedidos

### Escopo atual

- Não haverá histórico real de pedidos no cadastro do fornecedor nesta etapa.
- A aba depende de um módulo futuro de compras/pedidos.
- Não devem ser criados campos isolados de pedidos dentro de `cadastros.suppliers`.

### Antes de modelar

Definir:

- domínio de compras/pedidos;
- entidades de pedido, itens, entregas e status;
- vínculo com fornecedores;
- indicadores desejados;
- regras de integração com contas a pagar.

## Alteração executada

A tela passou a exibir cards explicativos nas abas `Documentos` e `Pedidos`, deixando claro:

- o que existe agora;
- o que será tratado depois;
- qual decisão evita migration prematura.

## Validação recomendada

- Abrir `http://127.0.0.1:4173/suppliers`;
- clicar em `Novo fornecedor` ou `Editar`;
- acessar as abas `Documentos` e `Pedidos`;
- confirmar que os textos aparecem sem criar campos obrigatórios ou alterar o fluxo de salvar.
