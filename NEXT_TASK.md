# FinControl — Próxima tarefa

Atualizado em 31/10/2026.

## Tarefa ativa

Deploy controlado do pacote funcional de 31/10 (sem migration nova), após
ambiente local recuperado e validado.

- Banco local recuperado: container `fincontrol-postgres-recovered-20261031`,
  porta 55435, volume isolado `fincontrol_recovered_20261031`;
  `fincontrol_validation_20261019` com 201 títulos, 192 pagamentos, 59 migrations
  e fuso America/Sao_Paulo. Origem em `/home/docker-data-old` intacta.
  `.env` deve usar `DB_PORT=55435`.
- Checagem completa STATUS OK com banco real: `checar_alteracao_20261031_142951.log`.
- Pacote: abas Contas/Cancelados, cancelamento que atualiza Agenda/resumos,
  “geração da série concluída” e retorno após salvar edição.
- Deploy: workflow `Deploy VPS Native` com SHA imutável e `DEPLOY`; backup antes;
  health e rollback conforme [PHASE-16](docs/PHASE-16-CONTROLLED-DEPLOY.md).
  Produção anterior aceita: `478bcb7`, deploy `39453420210` (20/10).
- Evidências da recuperação: [localização](docs/LOCAL-DOCKER-RECOVERY-2026-10-31.md).
- Code Review Graph: `.local/code-review-graph`; atualizar após código.

## Backlog que permanece

- Validar relatórios Pagamentos realizados e Previsto x pago com dados reais.
- Revisar alertas preexistentes de dependências @fastify/busboy e node-forge.
- DFe/Sintegra e demais documentos FUTURE permanecem como evolução futura.

Preservar .env, backups e dados originais. Não usar down -v, prune ou troca do
Docker data-root para tentar recuperar o ambiente. Alterações do usuário em
.vscode e remoção do Word não fazem parte do pacote de aplicação.

Histórico integral: [índice por assunto](docs/history/continuity-2026-10-31/README.md).
