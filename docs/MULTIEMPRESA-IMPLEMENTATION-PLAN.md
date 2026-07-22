# Plano de Implementação Real — Multiempresa e Evolução da Importação XML

**Data:** 21/07/2026  
**Status:** proposto para execução futura  
**Objetivo:** converter a ideia de multiempresa e a evolução da listagem/importação XML em um plano compatível com a arquitetura oficial atual do FinControl.

## 1. Contexto atual

O FinControl já possui:

- backend oficial em `apps/api` com Fastify, PostgreSQL, autenticação, permissões e auditoria;
- frontend oficial em `apps/web` com React, Vite, Router, TanStack Query e design system próprio;
- fluxo inicial de importação XML já funcional em `DOM-002`, com classificação `MAIN`, `BRANCH` e `UNKNOWN`;
- cadastro mestre consolidado para fornecedores, categorias, centros de custo, tipos de documento, formas e condições de pagamento;
- regra documental explícita de que a modelagem multiempresa definitiva ainda não foi implantada.

As ideias levantadas em `branchnova/implementacao_1.md` e `branchnova/implementacao_2.md` são úteis como direção funcional, principalmente para:

- tela dedicada de listagem de XMLs importados;
- filtros mais ricos;
- ações operacionais de reprocessamento e exclusão lógica;
- melhor visibilidade da classificação matriz/filial.

Essas ideias não devem ser acopladas literalmente. Elas precisam ser reescritas sobre a base oficial.

## 2. Princípios obrigatórios deste plano

- Não criar uma aplicação paralela em `src/`.
- Não substituir `Fastify` por `Express`.
- Não usar armazenamento em memória.
- Não alterar migrations já aplicadas.
- Não criar objetos no schema PostgreSQL `public`.
- Preservar autenticação, permissões, auditoria e exclusão lógica.
- Separar claramente o que é evolução do XML no `DOM-002` e o que é modelagem multiempresa em `DOM-001` e `DOM-004`.

## 3. Decisão de escopo

Este plano divide o trabalho em duas trilhas independentes, mas compatíveis:

### Trilha A — Evolução operacional da importação XML

Entrega valor imediato sem exigir a modelagem multiempresa completa.

### Trilha B — Fundação real de multiempresa

Prepara a base correta para vínculo de dados por empresa, parâmetros por empresa e filtragem futura em todo o ERP.

Essa separação é importante porque a documentação atual já permite classificar XML como matriz ou filial, mas ainda não permite afirmar que o restante do sistema esteja pronto para operar com segregação multiempresa completa.

## 4. Trilha A — Evolução operacional da importação XML

### 4.1 Objetivo

Expandir a experiência de consulta e tratamento dos XMLs já importados, aproveitando a estrutura existente em `financeiro.xml_imports`.

### 4.2 Escopo funcional

Criar uma tela oficial de listagem de XMLs importados em `apps/web`, com:

- busca textual;
- filtros por status;
- filtros por período de importação;
- filtros por período de vencimento;
- filtros por fornecedor;
- filtros por tipo de destinatário (`MAIN`, `BRANCH`, `UNKNOWN`);
- filtro por documento do destinatário;
- paginação;
- acesso à ação de gerar título;
- ação de reprocessar XML;
- ação de exclusão lógica quando permitido pela regra de negócio.

### 4.3 Backend necessário

Evoluir o domínio `payables` em `apps/api/src/domains/payables` para incluir:

- `GET /api/v1/xml-imports` com filtros e paginação reais;
- `GET /api/v1/xml-imports/:id` com detalhes e parcelas extraídas;
- `POST /api/v1/xml-imports/:id/reprocess`;
- `DELETE /api/v1/xml-imports/:id` com exclusão lógica.

### 4.4 Regras de negócio da Trilha A

- XML que já gerou título não pode ser excluído logicamente sem regra adicional formalizada.
- Reprocessamento deve limpar erro operacional e devolver o registro ao estado inicial permitido.
- Toda mutação deve registrar auditoria.
- Exclusão deve respeitar soft delete, nunca remoção física.
- Permissão mínima para mutações: `XML_IMPORT_MANAGE`.
- Listagens devem continuar protegidas por autenticação e permissão compatível com consulta financeira.

### 4.5 Banco de dados da Trilha A

Antes de implementar exclusão lógica e reprocessamento, validar se `financeiro.xml_imports` já possui colunas suficientes. Se não possuir, criar nova migration com:

- `deleted_at`;
- `deleted_by`;
- campos auxiliares necessários para rastrear reprocessamento, se os atuais forem insuficientes.

Também avaliar índices adicionais para:

- `recipient_kind`;
- `recipient_document_number`;
- `imported_at`;
- `due_date`;
- status combinado com data.

### 4.6 Frontend necessário

Criar em `apps/web`:

- página de listagem de XMLs importados;
- rota oficial no router;
- item de navegação no shell;
- uso de `httpClient`, `TanStack Query` e componentes do design system já existente;
- reaproveitamento visual e funcional do fluxo de importação XML já implementado.

### 4.7 Resultado esperado da Trilha A

Entregar controle operacional melhor sobre XML sem depender ainda da fundação multiempresa completa.

## 5. Trilha B — Fundação real de multiempresa

### 5.1 Objetivo

Introduzir a modelagem oficial de empresas e filiais de modo compatível com a visão do produto e com a evolução futura de todos os domínios.

### 5.2 Premissa arquitetural

A entidade de empresa deve nascer em `DOM-001 — Cadastros`, com reflexos controlados em:

- `DOM-004 — Administração`, para permissões, contexto e parâmetros;
- `DOM-002 — Financeiro`, para vínculo futuro de títulos, importações e filtros;
- `DOM-005 — Inteligência`, para recortes analíticos por empresa.

### 5.3 Escopo inicial recomendado

Implementar primeiro apenas a fundação estrutural:

- cadastro de empresas;
- relação matriz/filial;
- status ativo/inativo;
- documento principal da empresa;
- parâmetros mínimos por empresa;
- vínculo opcional de usuário a uma ou mais empresas;
- empresa padrão do usuário.

Não incluir nesta primeira entrega:

- consolidação financeira entre empresas;
- rateio de um mesmo título entre empresas;
- segregação obrigatória de todos os registros existentes;
- calendário completo por empresa;
- replicação automática de cadastros entre empresas.

### 5.4 Modelo de dados sugerido

Criar novas migrations para tabelas em schema apropriado, preferencialmente `cadastros` e `administracao`:

- `cadastros.companies`
- `cadastros.company_parameters`
- `administracao.user_companies`

Campos mínimos sugeridos para `cadastros.companies`:

- `id`
- `parent_company_id` nullable
- `company_type` com valores equivalentes a matriz/filial
- `legal_name`
- `trade_name`
- `document_number`
- `state_registration`
- `is_active`
- colunas de auditoria
- suporte a exclusão lógica, se adotado para o domínio

Campos mínimos sugeridos para `cadastros.company_parameters`:

- `company_id`
- configurações financeiras e operacionais formalizadas em colunas ou JSONB estritamente controlado
- colunas de auditoria

Campos mínimos sugeridos para `administracao.user_companies`:

- `user_id`
- `company_id`
- `is_default`
- escopo de acesso futuro, se necessário

### 5.5 Decisão importante sobre configurações

Evitar uma tabela genérica de preferências soltas como no protótipo anterior. Para o sistema oficial, há duas opções aceitáveis:

1. colunas explícitas para parâmetros estáveis de negócio;
2. JSONB controlado apenas para preferências secundárias e versionáveis.

A recomendação é começar por colunas explícitas para regras que impactem validação e comportamento financeiro.

### 5.6 Backend da Trilha B

Criar um novo conjunto de rotas oficiais em `master-data` ou módulo específico de empresas, por exemplo:

- `GET /api/v1/companies`
- `GET /api/v1/companies/:id`
- `POST /api/v1/companies`
- `PATCH /api/v1/companies/:id`
- `GET /api/v1/company-parameters/:companyId`
- `PATCH /api/v1/company-parameters/:companyId`

Também preparar endpoints administrativos para vínculo usuário-empresa, se a regra for aprovada:

- `GET /api/v1/users/:id/companies`
- `PUT /api/v1/users/:id/companies`

### 5.7 Regras de negócio da Trilha B

- Filial deve obrigatoriamente apontar para uma matriz válida.
- Documento da empresa deve ser único no sistema.
- Usuário não pode ficar com mais de uma empresa padrão.
- Exclusão de empresa deve respeitar bloqueios se houver dependências operacionais.
- Parâmetros por empresa devem ser auditados.
- A permissão para gerenciar empresa deve ser separada da permissão genérica de cadastro, se o time desejar granularidade maior.

### 5.8 Frontend da Trilha B

Somente após a API e as migrations estarem validadas, criar:

- página de gestão de empresas;
- página ou seção de parâmetros por empresa;
- seleção de contexto de empresa para usuários com acesso múltiplo;
- filtros futuros por empresa nas telas analíticas e operacionais.

O design deve seguir a shell atual de `apps/web`, não o protótipo paralelo em `src/frontend`.

## 6. Ordem recomendada de execução

### Fase P1 — Formalização funcional

- Revisar e aprovar o escopo mínimo de multiempresa.
- Definir se empresa entra como fundação do MVP ampliado ou como etapa pós-estabilização.
- Confirmar quais parâmetros por empresa serão oficiais na primeira versão.

### Fase P2 — XML operacional

- Evoluir backend de `xml-imports`.
- Criar migrations complementares se necessário.
- Criar tela oficial de listagem dos XMLs importados.
- Validar permissões, auditoria, reprocessamento e exclusão lógica.

### Fase P3 — Fundação de empresas

- Criar migrations de empresas, parâmetros e vínculo usuário-empresa.
- Criar repository e rotas oficiais.
- Adicionar permissões e seeds correspondentes.
- Cobrir com testes de integração e autorização.

### Fase P4 — UI de empresas

- Implementar telas oficiais no frontend.
- Integrar contexto de empresa do usuário.
- Preparar filtros de empresa nas telas que façam sentido imediato.

### Fase P5 — Adoção progressiva nos domínios

- Avaliar inclusão de `company_id` em novos registros de financeiro.
- Planejar migração progressiva das entidades operacionais para segregação por empresa.
- Só depois disso tratar consolidação, filtros obrigatórios e regras mais avançadas.

## 7. Ideias aproveitadas de `branchnova/`

As ideias abaixo são válidas e devem ser aproveitadas no plano oficial:

- criar uma listagem dedicada para XMLs importados;
- enriquecer filtros por status, período e classificação matriz/filial;
- destacar visualmente `MAIN`, `BRANCH` e `UNKNOWN`;
- expor ações operacionais por item;
- usar o documento do destinatário para conferência operacional;
- prever paginação e leitura orientada à operação diária.

As ideias abaixo devem ser descartadas como implementação literal:

- qualquer backend em Express paralelo;
- qualquer persistência em memória;
- componentes ou rotas desacoplados de `apps/web`;
- configurações genéricas sem contrato claro;
- estrutura de `src/` como base de produção.

## 8. Riscos e cuidados

- Implementar multiempresa cedo demais pode forçar refatoração ampla em títulos, pagamentos, agenda e dashboard.
- Acoplar empresa diretamente ao XML sem modelo oficial pode gerar retrabalho.
- Configurações por empresa mal definidas tendem a virar JSON genérico difícil de validar.
- Vínculo usuário-empresa mexe em autenticação, autorização e experiência de navegação; isso precisa entrar de forma controlada.

## 9. Recomendação final

A próxima implementação recomendada é:

1. entregar primeiro a Trilha A, evoluindo a operação de `xml-imports`;
2. documentar formalmente o escopo mínimo da Trilha B;
3. só então abrir as migrations e APIs oficiais de empresas.

Essa ordem gera valor real agora, reaproveita melhor a base existente e evita introduzir uma modelagem multiempresa incompleta no núcleo financeiro.
