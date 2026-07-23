# FinControl — Next Task

**Última atualização:** 23/07/2026  
**Status:** em execução  
**Contexto:** continuidade pós-Fase 16, já com multiempresa, XML operacional,
pagamentos/tesouraria e recorrências implementados localmente

## Objetivo

Concluir a preparação segura do pacote pós-Fase 16 para publicação e deploy
controlado, preservando um ponto de retomada claro caso a sessão seja
interrompida.

## Escopo desta tarefa

- manter o commit funcional `c1fec93 feat(payables): refine recurrence
  lifecycle actions` como checkpoint de código;
- revisar o worktree e separar documentação de continuidade de ruído local;
- fechar um commit documental separado, se aplicável;
- executar validações completas do backend e frontend antes de publicação;
- enviar a branch com o SHA validado ao GitHub;
- preparar o pacote para deploy controlado ou para uso do workflow
  `Deploy Production`, conforme decisão operacional.

## Passos

1. Revisar `git status` e identificar arquivos fora do escopo do pacote atual.
2. Consolidar em commit limpo apenas os documentos de continuidade necessários.
3. Manter fora do pacote, salvo decisão explícita:
   - `.venv`;
   - `.vscode/settings.json`;
   - arquivos `.docx` removidos/conversões não conferidas;
   - planilhas ou imagens não essenciais ao deploy.
4. Executar:
   - `npm run typecheck`
   - `npm test`
   - `npm run build`
5. Confirmar se as migrations novas do pacote estão completas e ordenadas.
6. Fazer `push` da branch com o SHA validado.
7. Decidir entre:
   - deploy controlado manual da branch/commit;
   - ou publicação via workflow `Deploy Production`, se `main` estiver pronta.

## Critério de conclusão

- pacote atual publicado no GitHub com SHA imutável;
- checks locais aprovados;
- documentação de continuidade atualizada;
- pronto para deploy controlado sem depender de alterações locais não
  publicadas.

## Depois disso

Após a publicação do pacote atual, reavaliar a próxima frente principal entre:

- deploy de produção do pacote pós-Fase 16;
- filtros explícitos por empresa nas telas operacionais pendentes;
- sincronização futura de comprovantes com Google Drive;
- evolução do MVP de recorrências.
