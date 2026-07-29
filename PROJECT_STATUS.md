# FinControl — Status Consolidado do Projeto

**Código:** DOC-11  
**Versão:** 0.4  
**Data:** 29/07/2026
**Status atual:** sistema além da Fase 16, com pacote pós-Fase 16 validado no
CI e evolução multiempresa em andamento por filtros explícitos nas telas
operacionais

## 1. Objetivo deste arquivo

Este documento registra o estado consolidado do projeto sem substituir:

- `AI_CONTEXT.md`, que guarda memória estrutural;
- `NEXT_TASK.md`, que aponta a próxima tarefa executável;
- backlog, checklist, planos e documentos `FUTURE-*`, que continuam como apoio
  detalhado e roadmap.

## 2. Estado geral em 23/07/2026

### Fases oficiais concluídas

- Fases 1 e 2 concluídas e documentadas em
  `docs/PHASE-1-2-VALIDATION.md`.
- Fase 3 concluída pelos scripts `verify_database.sql` e
  `test_financial_flow.sql`.
- Fase 4 concluída em `docs/PHASE-4-BACKEND-FOUNDATION.md`.
- Fase 5 concluída em
  `docs/PHASE-5-AUTHENTICATION-AUTHORIZATION.md`.
- Fase 6 concluída em `docs/PHASE-6-MASTER-DATA-API.md`.
- Fase 7 concluída em `docs/PHASE-7-PAYABLES-API.md`.
- Fase 8 concluída em `docs/PHASE-8-BACKEND-TESTING.md`.
- Fase 9 concluída em `docs/PHASE-9-FRONTEND-FOUNDATION.md`.
- Fase 10 concluída em `docs/PHASE-10-MASTER-DATA-FRONTEND.md`.
- Fase 11 concluída em `docs/PHASE-11-PAYABLES-FRONTEND.md`.
- Fase 12 concluída em `docs/PHASE-12-DASHBOARD-AGENDA.md`.
- Fase 13 concluída em `docs/PHASE-13-LOCAL-CONTAINERS.md`.
- Fase 14 concluída em `docs/PHASE-14-CI-CD.md`.
- Fase 15 executada e documentada em
  `docs/PHASE-15-HOSTINGER-VPS-RUNBOOK.md`.
- Fase 16 validada em `docs/PHASE-16-CONTROLLED-DEPLOY.md`.

### Produção e deploy

- Deploy manual controlado na VPS validado.
- Produção publicada em `https://hrmmotos.com.br/fincontrol/`.
- Swagger UI publicado em `https://hrmmotos.com.br/fincontrol/docs/`.
- Workflow `.github/workflows/deploy-production.yml` já existe no repositório.
- Pendência operacional ainda aberta: uso efetivo do environment `production`
  do GitHub com deploy do pacote mais recente validado.

## 3. Avanços além da Fase 16

### 21/07/2026 a 23/07/2026 — trilha pós-Fase 16

O projeto continuou após o marco de deploy manual validado. Os avanços dessa
trilha já existem em documentação e, em parte, no código local atual.

### XML Imports operacional

Documentos de referência:

- `docs/XML-IMPORTS-TECHNICAL-AUDIT-2026-07-21.md`
- `docs/XML-IMPORTS-LIST-PAGE.md`
- `docs/MULTIEMPRESA-IMPLEMENTATION-PLAN.md`
- `docs/MULTIEMPRESA-EXECUTION-BACKLOG.md`
- `docs/MULTIEMPRESA-DEVELOPMENT-CHECKLIST.md`

Estado consolidado:

- auditoria técnica da estrutura de `xml_imports` realizada;
- listagem operacional de XMLs documentada;
- exclusão lógica para XML importado planejada e checklist correspondente
  marcado como concluído;
- endpoints de listagem, detalhe, reprocessamento e exclusão lógica
  documentados e checklist marcado como concluído;
- tela `XMLs Importados` documentada e checklist marcado como concluído.

### Fundação multiempresa

Documentos de referência:

- `docs/MULTIEMPRESA-IMPLEMENTATION-PLAN.md`
- `docs/MULTIEMPRESA-EXECUTION-BACKLOG.md`
- `docs/MULTIEMPRESA-DEVELOPMENT-CHECKLIST.md`
- `docs/FUTURE-COMPANY-SESSION-CONTEXT.md`

Estado consolidado:

- escopo mínimo congelado para matriz e filial;
- fundação persistente prevista e checklist operacional amplamente concluído;
- decisão formal de não usar empresa ativa global por sessão nesta fase;
- filtros explícitos por empresa já começaram por Dashboard, Agenda Financeira
  e Notas Fiscais e Contas; relatórios analíticos e demais telas seguem como
  expansão pendente.

### Pagamentos, saldo oficial e comprovantes

Documentos de referência:

- `docs/PAYABLES-PAYMENT-SETTLEMENT.md`
- `docs/VPS-DEPLOY-PLAN-2026-07-22.md`
- `docs/MULTIEMPRESA-DEVELOPMENT-CHECKLIST.md`

Estado consolidado:

- fluxo de baixa manual individual já documentado e implementado no checklist;
- saldo inicial por movimento e saldo oficial por conta definidos;
- movimentos de conta bancária e histórico de pagamentos incorporados à trilha;
- comprovantes locais privados previstos e checklist marcado como implementado;
- sincronização futura com Google Drive permanece pendente e explicitamente
  futura.

### Notas Fiscais e Contas

Estado consolidado:

- a listagem operacional de contas a pagar passou a se apresentar ao usuário
  como `Notas Fiscais e Contas`, preservando o domínio técnico de payables;
- item do menu financeiro renomeado para o mesmo rótulo da tela;
- painel de totais da listagem transformado em painel recolhível com ações
  `Exibir painel` e `Ocultar painel`;
- atalho `Calendário` da listagem conectado à rota real `/agenda`;
- filtro de status da listagem inicia em `Notas ativas` (`OPEN`) e a ação de
  limpar filtros retorna para esse padrão;
- filtro de status também oferece a opção `Todos`, permitindo listar títulos em
  qualquer situação quando necessário;
- coluna inicial de seleção em lote removida da listagem enquanto a rotina de
  seleção múltipla não estiver disponível.

### Identidade visual do navegador

Estado consolidado:

- o frontend passou a publicar `favicon.svg` com o marcador visual de três
  barras usado no menu lateral do FinControl;
- o `index.html` referencia esse ícone para exibição na aba do navegador antes
  do nome da aplicação.

### Correções operacionais de navegação e cadastros em 28/07/2026

Estado consolidado:

- itens da Agenda Financeira passam a abrir a tela `Baixa de Pagamentos`
  filtrada por data de vencimento e status `OPEN`, sem abrir automaticamente o
  modal de baixa;
- a baixa manual continua iniciando pelo botão `Baixar` da linha selecionada;
- a tela `Baixa de Pagamentos` passa a iniciar sempre com status `OPEN`;
- endpoint de parcelas elegíveis para baixa aceita filtros diretos por título
  e parcela, evitando depender da primeira página da fila;
- cadastro genérico busca o detalhe do registro antes de abrir edição, evitando
  selects como `Empresa` e `Banco` vazios na primeira abertura de contas
  bancárias;
- campos gerados no cadastro genérico receberam `aria-label` para melhorar
  acessibilidade e estabilidade dos testes;
- no cadastro de nova conta, o campo `Fornecedor` passa a ocupar a linha inteira
  em telas grandes, evitando truncamento/estouro visual com nomes longos.
- na edição de conta a pagar, os campos `Vencimento` e `Valor` da aba
  `Dados da Conta` passam a ficar bloqueados e orientam o usuário a alterar
  esses dados pela aba `Parcelas`, que é a fonte efetiva de persistência da
  cobrança.

### Vínculo obrigatório de empresa em títulos manuais em 28/07/2026

Estado consolidado:

- títulos criados manualmente passam a exigir `Empresa` no formulário e no
  contrato da API;
- a empresa informada é gravada em `financeiro.payable_titles.company_id`;
- a edição de títulos permite corrigir o vínculo de empresa enquanto não houver
  pagamento efetivo;
- validação de duplicidade de títulos manuais passa a considerar a empresa,
  evitando conflito indevido entre obrigações similares de empresas distintas;
- recorrências permanecem com uma empresa por série, e títulos gerados por XML
  continuam herdando a empresa resolvida pelo CNPJ do destinatário.

### Filtros explícitos por empresa em telas operacionais em 29/07/2026

Estado consolidado:

- a decisão de não criar empresa ativa global por sessão foi preservada;
- Dashboard, Agenda Financeira e `Notas Fiscais e Contas` passam a oferecer
  filtro explícito de `Empresa`, com opção padrão `Todas as empresas`;
- endpoints `/api/v1/dashboard`, `/api/v1/agenda` e `/api/v1/payables` aceitam
  `companyId` como filtro opcional;
- Agenda e Dashboard passam a exibir o nome da empresa nos títulos futuros e
  vencimentos, evitando confusão entre obrigações similares de empresas
  distintas;
- o link da Agenda para `Baixa de Pagamentos` preserva a empresa selecionada
  quando o filtro estiver ativo.

### Administração de usuários e acessos em 29/07/2026

Estado consolidado:

- iniciado o MVP operacional de `Configurações > Usuários`;
- backend passa a expor rotas administrativas para listar, criar, editar,
  inativar e reativar usuários;
- criação/edição de usuários permite associar perfis existentes e empresas
  permitidas, com empresa padrão e escopo `Operacional` ou `Somente leitura`;
- usuários não-master precisam estar vinculados a pelo menos uma empresa;
- nova permissão `USER_MANAGE` foi criada por migration e associada ao perfil
  `MASTER`;
- a tela `/users` foi conectada ao menu existente de Configurações;
- ainda não foi implementada edição granular de permissões por usuário ou tela;
  o MVP usa os perfis existentes como camada oficial de autorização.
- refinamento do MVP adicionou troca/redefinição de senha:
  - `POST /auth/password/forgot` solicita recuperação com resposta pública
    genérica, sem revelar se o e-mail existe;
  - `POST /auth/password/reset` redefine senha com token temporário opaco,
    persistido apenas como SHA-256;
  - `POST /api/v1/users/:id/password-reset` permite ao Master enfileirar
    recuperação por e-mail para um usuário ativo;
  - nova tabela `administracao.password_reset_tokens` registra tokens,
    expiração, uso e contexto de solicitação;
  - nova tabela `administracao.email_outbox` registra o e-mail pendente de
    envio, preservando auditoria até a integração SMTP real;
  - a tela de login oferece `Esqueci minha senha` e a rota pública
    `/password-reset` conclui a redefinição pelo token.
- autoalterações perigosas foram bloqueadas:
  - backend recusa o próprio usuário tentando alterar `isMaster`, perfis ou
    empresas permitidas;
  - backend já bloqueava autoinativação e o frontend passou a refletir esse
    bloqueio visualmente;
  - a tela `/users` omite campos sensíveis do payload quando o registro editado
    é o próprio usuário logado.
- envio SMTP real permanece como pendência de infraestrutura; o contrato atual
  enfileira o e-mail em `administracao.email_outbox`.

### Preflight automatizado de alteração em 28/07/2026

Estado consolidado:

- criado o script raiz `Checar_alteracao.sh` para validação final de alterações;
- o script grava logs em `logs/alteracoes/`, diretório ignorado pelo Git;
- o script executa `git diff --check`, validação de migrations, typecheck,
  lint, testes e build;
- saída padrão deliberadamente curta: `STATUS: OK` ou `STATUS: FAIL` com o
  caminho do log;
- decisão operacional: ao finalizar uma alteração completa, executar
  `./Checar_alteracao.sh`; analisar o log apenas quando o status final for
  `FAIL`;
- adicionado alias `npm run check:alteracao`.

### Ajuste do deploy nativo da VPS em 28/07/2026

Estado consolidado:

- workflow `Deploy VPS Native` atualizado para resolver `deploy_ref` por branch,
  tag, SHA completo ou SHA curto a partir do histórico remoto antes de chamar a
  VPS;
- workflows GitHub atualizados para actions com runtime Node 24, mantendo
  `node-version: 22` para os comandos do projeto;
- script versionado `deploy/vps/bin/deploy` passa a validar explicitamente o
  Node.js 22 isolado em `/opt/fincontrol/.local/bin/node`, o npm correspondente
  e o PM2 antes de criar release;
- rollback versionado passa a usar o mesmo PATH isolado do usuário
  `fincontrol`, evitando depender do Node global do root.

### Correções de CI pós-push em 28/07/2026

Estado consolidado:

- script `database/scripts/test_financial_flow.sql` ajustado para criar
  fornecedor de teste com `status_id` e `supplier_category_id`, alinhado às
  constraints atuais de cadastro;
- teste opt-in
  `apps/api/test/integration/recurrences.integration.test.ts` deixou de
  depender de cadastros já existentes no banco local;
- o teste de integração de recorrências passa a criar, dentro de transação com
  rollback, usuário, empresa, fornecedor, categoria e centro de custo próprios;
- referências seedadas por migration (`INVOICE`, `PIX`, `IMMEDIATE`,
  `ACTIVE`, `SUPPLIER`) são verificadas explicitamente, evitando enviar
  `"undefined"` para campos UUID no PostgreSQL.

### Recorrências

Documento de referência:

- `docs/PAYABLES-RECURRENCES.md`

Estado consolidado:

- especificação MVP aprovada em 23/07/2026;
- migration de recorrências criada no código local;
- permissões de recorrências criadas no código local;
- API e tela de recorrências implementadas no código local;
- atalhos de recorrência na listagem e no detalhe de contas a pagar
  implementados;
- cancelamento de série com prévia dos títulos futuros afetados implementado;
- revisão de série a partir de data futura implementada, com encerramento da
  série anterior e criação de nova vigência;
- mensagens de erro de recorrência refinadas para o usuário final;
- cobertura de backend e frontend ampliada para os fluxos de recorrência;
- validação backend/frontend/PostgreSQL local registrada em
  `docs/PAYABLES-RECURRENCES-VALIDATION-2026-07-23.md`.

## 4. Estado do código local em 23/07/2026

- Branch ativa observada durante a retomada: `feature/matriz-filial-xml`.
- Commit funcional principal: `c1fec93 feat(payables): refine recurrence
  lifecycle actions`.
- Commit documental de continuidade: `3fb353e docs: update continuity
  checkpoint`.
- Commit de ajuste de teste pós-validação: `a7b0a06 test(web): align
  recurrence list fixture`.
- Commit de qualidade para preflight de deploy: `c3df287 test: satisfy deploy
  quality checks`.
- Commit documental de preflight: `975ca71 docs: record deploy preflight
  checkpoint`.
- Branch `feature/matriz-filial-xml` publicada em `origin` e configurada com
  upstream.
- Validações executadas antes do commit `c1fec93`:
  - `node ./node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`;
  - `node ./node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit`;
  - `node ./node_modules/vitest/vitest.mjs run apps/api/test/payables-repository.test.ts apps/api/test/http-contract.test.ts apps/web/src/payables/payables-list-page.test.tsx apps/web/src/payables/payable-form-page.test.tsx apps/web/src/payables/recurrences-page.test.tsx`.
- Resultado observado: 5 arquivos de teste e 59 testes aprovados.
- Validação completa executada após `c3df287`:
  - `bash scripts/validate-migrations.sh`: aprovado, 53 migrations ordenadas,
    únicas e transacionais;
  - `npm run lint`: aprovado;
  - `npm run typecheck`: aprovado;
  - `npm test`: aprovado, com API 79 testes aprovados e 5 testes de integração
    opt-in pulados; web 27 testes aprovados;
  - `npm run build`: aprovado, com build da API e build Vite do frontend.
- O worktree contém arquivos paralelos fora do escopo funcional principal
  como `.venv`, `.vscode`, conversões antigas de `.docx`, imagem movida e
  planilha em `docs/`; esses itens devem ser tratados com cuidado antes de
  publicação.
- Próximo checkpoint seguro: decidir se o deploy será manual por SHA da branch
  ou via merge para `main` e workflow `Deploy Production`.

### Incidente de deploy observado

- Durante tentativa de deploy do pacote publicado, a etapa `Verifying database`
  falhou porque o banco não continha:
  - `financeiro.payable_recurrence_statuses`;
  - `financeiro.payable_recurrences`;
  - `financeiro.payable_recurrence_titles`.
- A migration que cria essas tabelas existe no pacote:
  `database/migrations/202607231000_financeiro_create_payable_recurrences.sql`.
- Hipótese operacional principal: o banco/release marcou ou pulou migrations
  antes de aplicar a migration de recorrências, ou o deploy executado na VPS
  usou um estado de release/script diferente do pacote validado.
- Próximo passo seguro: diagnosticar na VPS `schema_versions`, presença física
  da migration na release e `to_regclass` das três tabelas antes de qualquer
  correção manual.

### Correção operacional em 28/07/2026 — saldo inicial

- Identificado erro ao tentar lançar saldo inicial em conta bancária que já
  possui movimento ativo de `Saldo de Caixa`.
- O backend retornava a mensagem técnica em inglês
  `Bank account already has an active cash balance movement`.
- A tela usava campo numérico com spinner para `Valor inicial`, fora do padrão
  monetário definido para o sistema.
- Correção local aplicada:
  - mensagem backend em português para `CASH_BALANCE_ALREADY_EXISTS`;
  - tradução amigável no frontend para o mesmo código;
  - `MoneyField` da tela de pagamentos passa a usar `CurrencyInput`;
  - testes de tesouraria e pagamentos ampliados para cobrir o comportamento.
- Decisão complementar: enquanto a Conciliação Bancária não estiver
  implementada, a tela de pagamentos terá a ação provisória `Entrada de caixa`,
  registrando movimento `MANUAL_ADJUSTMENT` de entrada para alimentar o saldo
  oficial e permitir pagamentos operacionais.
- Essa ação deve ser reavaliada/desabilitada quando a rotina de Conciliação
  Bancária entrar no sistema.

## 5. Ordem de leitura e retomada

Toda nova sessão deve começar por:

1. `AI_CONTEXT.md`
2. `PROJECT_STATUS.md`
3. `NEXT_TASK.md`
4. `AGENTS.md`
5. `README.md`
6. documentos de detalhe citados pelos arquivos acima
7. migrations relevantes ao escopo

## 6. Documentos vivos que não devem ser abandonados

### Continuidade imediata

- `AI_CONTEXT.md`
- `PROJECT_STATUS.md`
- `NEXT_TASK.md`
- `docs/CONTINUITY-RUNBOOK.md`

### Planos e checklist em andamento

- `docs/MULTIEMPRESA-IMPLEMENTATION-PLAN.md`
- `docs/MULTIEMPRESA-EXECUTION-BACKLOG.md`
- `docs/MULTIEMPRESA-DEVELOPMENT-CHECKLIST.md`
- `docs/VPS-DEPLOY-PLAN-2026-07-22.md`

### Futuro deliberadamente adiado

- `docs/FUTURE-COMPANY-SESSION-CONTEXT.md`
- `docs/FUTURE-AGENDA-TAGS-AND-COMPANY-LABELS.md`
- `docs/FUTURE-IBGE-CITIES-SEED.md`
- `docs/SUPPLIERS-FUTURE-TABS-SCOPE.md`

Esses documentos devem permanecer versionados e acessíveis. Eles representam
decisões futuras, negativas temporárias ou roadmap documentado, e nao devem ser
apagados nem confundidos com a tarefa ativa.

## 7. Próximo marco de projeto

O próximo marco estratégico é publicar o pacote pós-Fase 16 já validado
localmente, mantendo a documentação de continuidade junto do pacote, para então:

- executar deploy controlado com SHA imutável;
- ou publicar pela rotina `Deploy Production`, se `main` estiver pronta.
