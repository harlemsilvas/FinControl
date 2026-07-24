# FinControl — Status Consolidado do Projeto

**Código:** DOC-11  
**Versão:** 0.4  
**Data:** 23/07/2026  
**Status atual:** sistema além da Fase 16, com pacote local pós-Fase 16
validado localmente e em preparação para publicação/deploy controlado

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
- filtros explícitos por empresa ainda permanecem como parte pendente de
  evolução em telas operacionais e relatórios.

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
- Próximo checkpoint seguro: versionar esta atualização de continuidade,
  publicar a branch no GitHub e decidir deploy do SHA final validado.

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
