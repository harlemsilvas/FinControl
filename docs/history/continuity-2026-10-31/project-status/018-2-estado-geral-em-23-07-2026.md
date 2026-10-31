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
- Pauta aberta para 01/08/2026: revisar versionamento visível e política de
  cache do frontend/deploy para eliminar risco de página antiga após publicação
  na VPS. A solução deve definir fonte única de versão, expor build/SHA para
  diagnóstico e ajustar headers/rotina de verificação pós-deploy.
- Pacote local iniciado em 01/08/2026:
  - menu lateral passa a exibir versão, release e SHA do build;
  - deploy nativo injeta metadados `VITE_*` e gera `version.json` no frontend;
  - Nginx versionado mantém assets com cache imutável e desativa cache para SPA
    e `version.json`.
- Rotina local de backup/restore iniciada em 01/08/2026:
  - backup lógico PostgreSQL versionado em `deploy/vps/bin/backup-db`, com
    dump custom, checksum SHA-256 e metadados;
  - restore versionado em `deploy/vps/bin/restore-db`, com confirmação
    explícita, backup de segurança antes da restauração e parada/restart da API;
  - deploy nativo passa a gerar backup `pre-deploy-{shortSha}` antes de
    migrations;
  - runbook operacional registrado em `docs/VPS-BACKUP-RESTORE-RUNBOOK.md`.
- Gestão web de backups iniciada em 01/08/2026:
  - permissão `BACKUP_MANAGE` criada por migration e associada ao perfil
    `MASTER`;
  - API administrativa permite listar, gerar e exportar backups usando o script
    versionado fixo de backup;
  - tela `/backups` em `Configurações > Backups` permite consulta, geração e
    exportação local de cópia do backup para usuários autorizados;
  - criação e exportação de backup são registradas em auditoria.
