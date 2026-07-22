# Backlog de Execução — Multiempresa e XML Imports

**Data:** 21/07/2026  
**Status:** proposto  
**Origem:** [MULTIEMPRESA-IMPLEMENTATION-PLAN.md](/mnt/c/Projetos/FinControl/docs/MULTIEMPRESA-IMPLEMENTATION-PLAN.md)

## 1. Objetivo do backlog

Detalhar a execução técnica do plano em itens implementáveis, com dependências, ordem sugerida, critérios de aceite e impacto por camada:

- banco de dados;
- backend;
- frontend;
- permissões;
- testes;
- documentação.

## 2. Estratégia de entrega

O backlog está dividido em dois blocos:

- **Bloco A:** evolução operacional da importação XML, com entrega de valor imediata;
- **Bloco B:** fundação oficial de multiempresa, com adoção progressiva.

A recomendação é executar integralmente o Bloco A antes de iniciar o Bloco B.

---

## 3. Bloco A — XML Imports operacional

### A1. Auditoria técnica do estado atual de `xml_imports`

**Objetivo:** confirmar exatamente o que já existe no banco, na API e no frontend para evitar duplicidade de implementação.

**Camadas impactadas:**

- documentação;
- backend;
- banco.

**Tarefas:**

- revisar migrations já aplicadas relacionadas a `financeiro.xml_imports`;
- revisar os contratos atuais em `apps/api/src/domains/payables`;
- revisar o fluxo atual de importação no frontend;
- listar campos já disponíveis, campos ausentes e restrições existentes;
- decidir se a listagem nova será extensão do contrato atual ou contrato novo.

**Dependências:** nenhuma.

**Critérios de aceite:**

- inventário atualizado dos campos do XML;
- decisão documentada sobre paginação, filtros e detalhamento;
- confirmação explícita do que exige nova migration.

### A2. Especificação funcional da listagem de XMLs

**Objetivo:** congelar o comportamento funcional da nova tela antes da implementação.

**Camadas impactadas:**

- documentação;
- frontend;
- backend.

**Tarefas:**

- definir filtros obrigatórios e opcionais;
- definir ações por linha e restrições de visibilidade;
- definir colunas da grade;
- definir comportamento de paginação;
- definir mensagens para status vazio, erro, duplicidade e XML sem geração de título;
- definir se haverá drawer/modal/página de detalhes por item.

**Dependências:** A1.

**Critérios de aceite:**

- documento funcional curto publicado em `docs/`;
- filtros e ações aprovados;
- contrato de resposta esperado pela UI definido.

### A3. Migration complementar para exclusão lógica de XML

**Objetivo:** preparar persistência compatível com exclusão lógica e rastreabilidade.

**Camadas impactadas:**

- banco.

**Tarefas:**

- criar migration nova para `financeiro.xml_imports` se faltarem:
  - `deleted_at`;
  - `deleted_by`;
- criar foreign key para `administracao.users` em `deleted_by`, se aplicável;
- criar índices adequados para consultas ignorando excluídos;
- validar naming e padrões do banco já existente.

**Dependências:** A1.

**Critérios de aceite:**

- migration nova criada sem alterar migrations antigas;
- banco validado localmente;
- listagens preparadas para ignorar excluídos por padrão.

### A4. Evolução do contrato `GET /api/v1/xml-imports`

**Objetivo:** transformar a listagem atual em endpoint operacional real com paginação e filtros.

**Camadas impactadas:**

- backend;
- testes.

**Tarefas:**

- adicionar query params para:
  - `page`;
  - `pageSize`;
  - `search`;
  - `status`;
  - `dueFrom`;
  - `dueTo`;
  - `supplierId`;
  - `recipientKind`;
  - `recipientDocumentNumber`;
  - `importedFrom`;
  - `importedTo`;
- normalizar resposta paginada;
- padronizar validações Zod;
- aplicar filtros apenas sobre registros não excluídos logicamente;
- manter autenticação e autorização existentes.

**Dependências:** A1, A2, A3.

**Critérios de aceite:**

- endpoint responde com paginação consistente;
- filtros combináveis funcionam;
- erros de validação retornam padrão atual da API;
- endpoint continua protegido por autenticação.

### A5. Novo `GET /api/v1/xml-imports/:id`

**Objetivo:** permitir consulta detalhada de uma importação XML.

**Camadas impactadas:**

- backend;
- testes.

**Tarefas:**

- buscar cabeçalho do XML por `id`;
- incluir parcelas extraídas da importação;
- incluir status, vínculo com fornecedor e título gerado, se houver;
- retornar `404` padronizado para recurso inexistente ou excluído.

**Dependências:** A1.

**Critérios de aceite:**

- detalhamento completo disponível;
- parcelas retornadas ordenadas;
- comportamento consistente para XML inexistente.

### A6. Novo `POST /api/v1/xml-imports/:id/reprocess`

**Objetivo:** permitir retorno controlado do XML para novo tratamento operacional.

**Camadas impactadas:**

- backend;
- testes;
- auditoria.

**Tarefas:**

- validar se o XML pode ser reprocessado conforme status atual;
- limpar mensagens de erro e marcações operacionais definidas;
- reatribuir status inicial permitido;
- registrar evento de auditoria.

**Dependências:** A1, A2.

**Critérios de aceite:**

- XML reprocessável volta ao estado correto;
- XML bloqueado por regra retorna erro de negócio;
- auditoria registra usuário e contexto da ação.

### A7. Novo `DELETE /api/v1/xml-imports/:id`

**Objetivo:** permitir exclusão lógica segura.

**Camadas impactadas:**

- backend;
- banco;
- testes;
- auditoria.

**Tarefas:**

- validar se o XML já gerou título;
- bloquear exclusão quando houver dependência operacional proibitiva;
- gravar `deleted_at` e `deleted_by`;
- registrar evento de auditoria;
- garantir idempotência operacional adequada.

**Dependências:** A3.

**Critérios de aceite:**

- exclusão é lógica, não física;
- XML já convertido em título não pode ser excluído, salvo regra futura;
- listagens deixam de exibir o registro excluído por padrão.

### A8. Refatoração do repository de XML imports

**Objetivo:** manter as regras de consulta e mutação isoladas na camada de repository.

**Camadas impactadas:**

- backend;
- testes.

**Tarefas:**

- criar métodos específicos para:
  - listagem paginada;
  - consulta detalhada;
  - reprocessamento;
  - exclusão lógica;
- organizar SQL com filtros dinâmicos sem quebrar legibilidade;
- preservar padrões de erro do projeto.

**Dependências:** A4, A5, A6, A7.

**Critérios de aceite:**

- regras concentradas no repository;
- SQLs testáveis e previsíveis;
- sem duplicação desnecessária na camada de rotas.

### A9. Página oficial `XMLs Importados` no frontend

**Objetivo:** entregar a visualização operacional dos XMLs dentro da shell oficial do sistema.

**Camadas impactadas:**

- frontend;
- testes.

**Tarefas:**

- criar página em `apps/web/src/payables`;
- criar filtros com estado sincronizado de consulta;
- exibir tabela paginada;
- destacar `MAIN`, `BRANCH` e `UNKNOWN`;
- exibir status e datas formatadas em PT-BR;
- incluir ação de abrir detalhes;
- incluir ação de gerar título quando aplicável;
- incluir ação de reprocessar;
- incluir ação de excluir logicamente;
- tratar loading, empty state e erros.

**Dependências:** A2, A4, A5, A6, A7.

**Critérios de aceite:**

- página acessível a partir da navegação oficial;
- filtros disparam consultas corretas;
- mutações atualizam a listagem sem recarga manual;
- interface respeita o design system atual.

### A10. Roteamento e navegação da nova página

**Objetivo:** integrar a nova tela ao frontend oficial.

**Camadas impactadas:**

- frontend.

**Tarefas:**

- registrar rota no router;
- adicionar item no menu lateral;
- validar acesso por sessão autenticada.

**Dependências:** A9.

**Critérios de aceite:**

- rota navegável na aplicação;
- item visível no shell apropriado;
- navegação protegida por login.

### A11. Testes do Bloco A

**Objetivo:** proteger a evolução funcional com cobertura automatizada.

**Camadas impactadas:**

- backend;
- frontend.

**Tarefas backend:**

- testes HTTP para filtros da listagem;
- testes de autorização;
- testes de detalhe por `id`;
- testes de reprocessamento;
- testes de exclusão lógica;
- testes para XML com título já gerado.

**Tarefas frontend:**

- testes da listagem com filtros;
- testes de estados vazios e erro;
- testes das ações de reprocessar e excluir;
- testes de navegação para geração de título/detalhes.

**Dependências:** A4 a A10.

**Critérios de aceite:**

- suíte existente passa com a nova cobertura;
- cenários críticos ficam protegidos;
- build, lint e typecheck aprovados.

### A12. Documentação de entrega do Bloco A

**Objetivo:** registrar a evolução de forma rastreável.

**Camadas impactadas:**

- documentação.

**Tarefas:**

- atualizar documento de escopo XML, se necessário;
- criar documento de fase ou subfase;
- registrar decisões, endpoints, filtros e limites.

**Dependências:** A11.

**Critérios de aceite:**

- documentação coerente com o código entregue;
- limitações remanescentes explicitadas.

---

## 4. Bloco B — Fundação oficial de multiempresa

### B1. Fechamento do escopo funcional mínimo de multiempresa

**Objetivo:** formalizar o recorte inicial para evitar expansão indevida.

**Camadas impactadas:**

- documentação;
- produto;
- arquitetura.

**Tarefas:**

- confirmar o que entra no primeiro ciclo:
  - empresa;
  - filial;
  - parâmetros mínimos;
  - vínculo usuário-empresa;
  - empresa padrão;
- confirmar o que fica fora:
  - consolidação;
  - rateio entre empresas;
  - obrigatoriedade de `company_id` em todo domínio financeiro atual.

**Dependências:** conclusão do Bloco A recomendada.

**Critérios de aceite:**

- escopo mínimo aprovado e documentado;
- sem ambiguidades sobre limites da primeira entrega.

### B2. Modelagem lógica e física de empresas

**Objetivo:** definir a base de dados oficial do novo domínio.

**Camadas impactadas:**

- banco;
- documentação.

**Tarefas:**

- modelar `cadastros.companies`;
- modelar `cadastros.company_parameters`;
- modelar `administracao.user_companies`;
- decidir tipos, constraints, índices e soft delete;
- decidir se parâmetros de empresa começam com colunas explícitas, JSONB controlado ou combinação dos dois.

**Dependências:** B1.

**Critérios de aceite:**

- modelo aprovado;
- constraints principais documentadas;
- aderência ao padrão dos schemas existentes.

### B3. Migrations iniciais de multiempresa

**Objetivo:** materializar a fundação do domínio no PostgreSQL.

**Camadas impactadas:**

- banco.

**Tarefas:**

- criar migration para `cadastros.companies`;
- criar migration para `cadastros.company_parameters`;
- criar migration para `administracao.user_companies`;
- criar índices e constraints;
- adicionar seeds mínimos apenas se a regra exigir dados iniciais;
- validar compatibilidade com banco atual.

**Dependências:** B2.

**Critérios de aceite:**

- migrations aplicam sem alterar histórico;
- constraints validam matriz/filial e unicidade documental;
- banco permanece consistente.

### B4. Permissões e perfis do domínio de empresas

**Objetivo:** inserir o novo domínio no modelo de segurança.

**Camadas impactadas:**

- banco;
- backend;
- documentação.

**Tarefas:**

- definir permissões, por exemplo:
  - `COMPANY_VIEW`;
  - `COMPANY_MANAGE`;
  - `COMPANY_PARAMETER_MANAGE`;
  - `USER_COMPANY_MANAGE`;
- criar migration de seed de permissões;
- associar aos perfis existentes de forma controlada.

**Dependências:** B3.

**Critérios de aceite:**

- permissões disponíveis no banco;
- perfis adequados associados;
- acesso indevido bloqueado.

### B5. Repository e contratos backend de empresas

**Objetivo:** criar a camada de persistência e os endpoints oficiais.

**Camadas impactadas:**

- backend;
- testes.

**Tarefas:**

- implementar repository de empresas;
- implementar validações Zod;
- criar endpoints:
  - `GET /api/v1/companies`;
  - `GET /api/v1/companies/:id`;
  - `POST /api/v1/companies`;
  - `PATCH /api/v1/companies/:id`;
- suportar listagem paginada, busca e status ativo.

**Dependências:** B3, B4.

**Critérios de aceite:**

- CRUD parcial compatível com padrão dos cadastros;
- validações de matriz/filial e documento único ativas;
- autorização aplicada corretamente.

### B6. Backend de parâmetros por empresa

**Objetivo:** permitir configuração oficial mínima por empresa.

**Camadas impactadas:**

- backend;
- testes.

**Tarefas:**

- implementar leitura e alteração de parâmetros;
- decidir se os parâmetros serão linha única por empresa;
- auditar toda alteração;
- refletir apenas regras aprovadas no escopo mínimo.

**Dependências:** B5.

**Critérios de aceite:**

- parâmetros consultáveis e editáveis;
- sem campo genérico sem contrato;
- auditoria registrada.

### B7. Backend de vínculo usuário-empresa

**Objetivo:** preparar contexto de acesso multiempresa por usuário.

**Camadas impactadas:**

- backend;
- administração;
- testes.

**Tarefas:**

- criar endpoints administrativos para vínculo usuário-empresa;
- garantir uma única empresa padrão por usuário;
- validar remoção da empresa padrão e troca segura;
- definir formato de retorno para uso futuro na sessão.

**Dependências:** B5.

**Critérios de aceite:**

- vínculo múltiplo funcional;
- regra de empresa padrão garantida;
- operações auditadas quando aplicável.

### B8. Testes backend do domínio de empresas

**Objetivo:** proteger a fundação multiempresa.

**Camadas impactadas:**

- backend.

**Tarefas:**

- testes de criação e edição de empresas;
- testes para matriz e filial;
- testes para unicidade documental;
- testes de autorização;
- testes de parâmetros;
- testes de vínculo usuário-empresa e empresa padrão.

**Dependências:** B5, B6, B7.

**Critérios de aceite:**

- casos críticos cobertos;
- suíte da API segue verde.

### B9. Frontend de gestão de empresas

**Objetivo:** entregar UI oficial para o novo cadastro.

**Camadas impactadas:**

- frontend;
- testes.

**Tarefas:**

- criar página de empresas em `apps/web/src/master-data` ou módulo equivalente;
- implementar listagem paginada, busca, criação e edição;
- suportar seleção de matriz ao cadastrar filial;
- tratar status ativo/inativo;
- integrar com contratos da API.

**Dependências:** B5.

**Critérios de aceite:**

- cadastro funcional dentro da shell atual;
- regras básicas refletidas na UI;
- erros da API apresentados corretamente.

### B10. Frontend de parâmetros por empresa

**Objetivo:** permitir administração dos parâmetros mínimos aprovados.

**Camadas impactadas:**

- frontend;
- testes.

**Tarefas:**

- criar seção ou página de parâmetros;
- mapear somente campos oficiais aprovados;
- tratar salvamento, carregamento e erros;
- respeitar permissões do usuário.

**Dependências:** B6, B9.

**Critérios de aceite:**

- tela consistente com o domínio;
- sem preferências genéricas descontroladas;
- experiência de edição previsível.

### B11. Frontend de vínculo usuário-empresa

**Objetivo:** oferecer administração do escopo de empresas por usuário.

**Camadas impactadas:**

- frontend;
- testes.

**Tarefas:**

- criar UI administrativa de associação;
- permitir definir empresa padrão;
- exibir conjunto de empresas vinculadas;
- tratar cenários sem empresa vinculada.

**Dependências:** B7.

**Critérios de aceite:**

- vínculo administrável via UI;
- empresa padrão claramente identificada;
- erros de validação tratados.

### B12. Preparação do contexto de sessão por empresa

**Objetivo:** deixar o sistema pronto para futuras restrições por empresa sem forçar adoção total imediata.

**Camadas impactadas:**

- backend;
- frontend;
- autenticação.

**Tarefas:**

- definir se a sessão já retorna empresas acessíveis;
- definir se haverá seletor de empresa ativo já na primeira entrega;
- evitar impor `company_id` em todos os fluxos existentes antes do tempo;
- preparar extensibilidade para filtros e contexto futuros.

**Dependências:** B7, B9, B11.

**Critérios de aceite:**

- base pronta para evolução futura;
- sem regressão no login e autorização atuais.

### B13. Adoção progressiva nos demais domínios

**Objetivo:** planejar a expansão segura do conceito de empresa sem misturar isso à fundação inicial.

**Camadas impactadas:**

- financeiro;
- inteligência;
- administração;
- documentação.

**Tarefas futuras sugeridas:**

- avaliar `company_id` em títulos a pagar novos;
- avaliar filtros por empresa em agenda e dashboard;
- avaliar restrição por empresa em cadastros correlatos;
- avaliar parâmetros de aprovação, competência e calendário por empresa.

**Dependências:** B12.

**Critérios de aceite:**

- roadmap posterior documentado;
- nenhuma adoção prematura no ciclo inicial.

### B14. Documentação de entrega do Bloco B

**Objetivo:** registrar formalmente o novo domínio e seus limites.

**Camadas impactadas:**

- documentação.

**Tarefas:**

- atualizar documentação de domínios;
- criar documento de fase ou subfase;
- registrar contratos da API, permissões e limitações;
- registrar claramente o que ainda não é multiempresa completo.

**Dependências:** B8 a B12.

**Critérios de aceite:**

- documentação alinhada ao código entregue;
- limites do primeiro ciclo explícitos.

---

## 5. Sequência executiva recomendada

### Sprint 1

- A1
- A2
- A3

### Sprint 2

- A4
- A5
- A6
- A7
- A8

### Sprint 3

- A9
- A10
- A11
- A12

### Sprint 4

- B1
- B2
- B3
- B4

### Sprint 5

- B5
- B6
- B7
- B8

### Sprint 6

- B9
- B10
- B11
- B12
- B14

`B13` deve permanecer como desdobramento posterior, não como parte obrigatória da fundação inicial.

---

## 6. Critério de pronto por bloco

### Bloco A pronto quando:

- XML imports têm listagem oficial com filtros reais;
- reprocessamento existe com regra e auditoria;
- exclusão lógica existe com proteção contra inconsistência;
- frontend oficial consome os contratos;
- testes e documentação estão atualizados.

### Bloco B pronto quando:

- empresas existem como domínio oficial no banco e na API;
- parâmetros mínimos por empresa existem com auditoria;
- vínculo usuário-empresa existe com empresa padrão;
- frontend oficial administra esses dados;
- o sistema está preparado para evolução multiempresa futura, sem forçar adoção total imediata.

---

## 7. Recomendação prática

Se for necessário escolher apenas uma próxima entrega de engenharia, a recomendação é iniciar por:

1. `A1` a `A3` para fechar o diagnóstico e a base do banco;
2. `A4` a `A8` para fechar o backend de `xml-imports`;
3. `A9` a `A12` para entregar valor visível ao usuário final.

Somente depois disso vale abrir a execução do domínio oficial de empresas.
