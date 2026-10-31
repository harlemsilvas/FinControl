## Deploy concluído em 19/10/2026

- Commit funcional: `0c00cc0af631f5f0d0121ee8e9434b49a3f9c7b1` na branch
  `feature/matriz-filial-xml`.
- Primeira execução: workflow `39330875919`, sucesso; preflight 1min23s e
  deploy 3min45s. Publicou as correções e atualizou a rotina instalada.
- Execução final do mesmo SHA: workflow `39331599472`, sucesso; preflight
  1min08s e deploy 3min21s. Aplicou ALTER SYSTEM, recarregou PostgreSQL,
  aprovou SHOW TimeZone = `America/Sao_Paulo` e sincronizou PM2/Compose.
- Verificação oficial da estrutura do banco aprovada na VPS; sem novas
  migrations neste pacote. Backup automático antecedeu a etapa operacional.
- `version.json` confirmou o SHA funcional; frontend HTTP 200; API e banco
  de produção `fincontrol` com status `ok` após a execução final.
- API local confirmou `fincontrol_validation_20261019` com status `ok` e
  frontend local HTTP 200. A base original continua preservada.
- Validação local: `Checar_alteracao.sh` STATUS OK; após ajuste operacional,
  Bash validado e ambos os preflights/deploys completos aprovados.
- Log privado final: `.local/deploy-39331599472.log`.
- Alterações preexistentes do usuário em `.vscode/settings.json` e remoção
  de `docs/PROJECT_HISTORY.md.docx` permaneceram fora dos commits.
- Próxima tarefa: conferência visual do filtro XML e retomada da validação
  financeira dos relatórios, conforme `NEXT_TASK.md`.
