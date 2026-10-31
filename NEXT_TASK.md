# FinControl — Próxima tarefa

Atualizado em 31/10/2026.

## Tarefa ativa

Release `0ace2b65a1b1c680ad0d0ad877a7a3c1e5215627` publicada em produção
(deploy `41232755286`, 31/10, 19:12 UTC); aguardando aceite visual em produção.

- Inclui: remoção do `src/` legado, consolidação de helpers do web
  (master-data, payables, reports) e testes de integração em série. Sem migration.
- Health, frontend e `/docs/` = 200 após o deploy. CI verde na branch e na main.
- Rollback se necessário: `sudo /opt/fincontrol/bin/rollback 8c4ac7473f27`
  (release anterior, deploy `41227331581`).
- Conferir em produção: telas de fornecedores e payables (tocadas pela refatoração).
- Banco local: `fincontrol-postgres-recovered-20261031`, porta 55435
  ([recuperação](docs/LOCAL-DOCKER-RECOVERY-2026-10-31.md)).

## Backlog que permanece

- Validar relatórios Pagamentos realizados e Previsto x pago com dados reais.
- Revisar alertas preexistentes de dependências @fastify/busboy e node-forge.
- `today()` em payables-types.ts usa UTC; após 21h em São Paulo devolve o dia
  seguinte. Corrigir à parte, com fuso America/Sao_Paulo.
- Método `updateAccess` de session-store.ts sem chamadores (candidato a remoção).
- DFe/Sintegra e demais documentos FUTURE permanecem como evolução futura.

Preservar .env, backups e dados originais. Não usar down -v, prune ou troca do
Docker data-root para tentar recuperar o ambiente. Alterações do usuário em
.vscode e remoção do Word não fazem parte do pacote de aplicação.

Histórico integral: [índice por assunto](docs/history/continuity-2026-10-31/README.md).
