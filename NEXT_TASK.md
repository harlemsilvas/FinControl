# FinControl — Próxima tarefa

Atualizado em 31/10/2026.

## Tarefa ativa

Pacote de 31/10 publicado em produção; aguardando aceite visual do usuário.

- Deploy `41227331581` (31/10, 18:06 UTC) do SHA
  `8c4ac7473f27aa7f00751f2ad954bef41d2fb075`; sem migration nova (59 já aplicadas).
  Health da API e do frontend OK; `/fincontrol/`, `/health/ready` e `/docs/` = 200.
- Rollback se necessário: `sudo /opt/fincontrol/bin/rollback 478bcb735c41`.
- Backup pré-deploy confirmado na VPS (18:06 UTC):
  `fincontrol_20261031T180635Z_478bcb735c41_pre-deploy-8c4ac7473f27.dump`
  (com `.dump.json` e `.sha256`) em `/opt/fincontrol/shared/backups`.
- Conferir em produção: abas Contas/Cancelados, Agenda após cancelar, série
  concluída, retorno após salvar edição.
- Banco local recuperado: `fincontrol-postgres-recovered-20261031`, porta 55435
  (`.env` deve usar `DB_PORT=55435`). Evidências em
  [localização](docs/LOCAL-DOCKER-RECOVERY-2026-10-31.md).

## Backlog que permanece

- Validar relatórios Pagamentos realizados e Previsto x pago com dados reais.
- Revisar alertas preexistentes de dependências @fastify/busboy e node-forge.
- DFe/Sintegra e demais documentos FUTURE permanecem como evolução futura.

Preservar .env, backups e dados originais. Não usar down -v, prune ou troca do
Docker data-root para tentar recuperar o ambiente. Alterações do usuário em
.vscode e remoção do Word não fazem parte do pacote de aplicação.

Histórico integral: [índice por assunto](docs/history/continuity-2026-10-31/README.md).
