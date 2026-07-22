# Feature futura — Contexto de empresa por sessão

**Data:** 22/07/2026  
**Status:** documentado para avaliação futura  
**Decisão atual:** não implementar empresa ativa global por sessão nesta fase.

## Contexto

O FinControl opera com uma única conexão de sistema e pode controlar múltiplas empresas
próprias, como matriz e filiais. A empresa deve ser escolhida conforme o contexto da
operação, não como um filtro global invisível aplicado à sessão inteira.

## Decisão funcional atual

Nesta fase, o sistema deve funcionar assim:

- XML importado: a empresa do lançamento é resolvida pelo CNPJ do destinatário presente no documento fiscal.
- Conta a pagar gerada por XML: deve herdar a empresa resolvida pelo XML e seus parâmetros cadastrados.
- Consultas e relatórios futuros: devem oferecer filtro explícito por uma empresa ou por todas.
- Baixa e pagamento futuros: devem considerar a empresa da conta/título e a conta bancária/saldo da empresa escolhida na operação de tesouraria.

Portanto, não deve existir no topo do sistema um seletor de "empresa ativa" que altere
automaticamente todo o comportamento do ERP.

## O que fica preparado

A fundação multiempresa permanece válida:

- `cadastros.companies`;
- `cadastros.company_parameters`;
- `administracao.user_companies`;
- empresas disponíveis na sessão do usuário;
- empresa padrão do usuário como informação auxiliar.

Esses dados ajudam em filtros, permissões futuras e telas operacionais, mas não devem
ser usados como escopo global obrigatório sem nova decisão.

## Quando reconsiderar empresa ativa por sessão

Implementar contexto de empresa por sessão somente se o produto passar a exigir:

- usuários trabalhando em ambientes segregados por empresa;
- permissões e menus diferentes conforme empresa selecionada;
- dashboards e rotinas operacionais sempre filtrados por uma empresa ativa;
- necessidade de impedir consultas "todas as empresas" para certos perfis;
- auditoria que precise registrar uma empresa ativa independente do documento operacional.

## Desenho técnico futuro, se aprovado

Se essa feature for aprovada futuramente:

- adicionar seletor de empresa ativa no shell;
- persistir `activeCompanyId` no frontend;
- enviar `X-Company-Id` nas requisições;
- validar no backend se o usuário tem acesso à empresa informada;
- aplicar filtros obrigatórios apenas nos endpoints definidos pela regra funcional;
- permitir exceções explícitas para relatórios consolidados e consultas "Todas";
- registrar em auditoria quando a empresa ativa influenciar a operação.

## Risco evitado agora

Remover o seletor global evita que um XML, relatório ou baixa seja associado à empresa
errada por causa de uma seleção de topo esquecida pelo usuário. Para o fluxo fiscal, o
CNPJ do documento é a fonte correta de verdade.
