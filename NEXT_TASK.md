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

## Conector DFe → FinControl — em produção desde 01/11/2026 (PR #3); agenda por horário em PR próprio

- Conector pull das NF-e de entrada (`procNFe`) da API do DFe para `xml_imports`
  com `import_source='DFE_API'`, status RECEIVED e **sem gerar conta a pagar**.
  Desligado por padrão (`DFE_SYNC_ENABLED=false`). Detalhes: [docs/DFE-API-CONNECTOR.md](docs/DFE-API-CONNECTOR.md).
- Migration `202610311900` aplicada em produção pelo deploy (libera `DFE_API`, cria `integracoes.dfe_sync_cursors`).
- Validado: typecheck, lint, testes unitários (147), 14 de integração em PostgreSQL 16 descartável e contrato real
  contra a API do DFe.
- Agenda por horário: `DFE_SYNC_INTERVAL_SECONDS` (5 min) vale seg-sex entre `DFE_SYNC_BUSINESS_START_HOUR` (7) e
  `DFE_SYNC_BUSINESS_END_HOUR` (18), fuso America/Sao_Paulo; fora disso `DFE_SYNC_OFFPEAK_INTERVAL_SECONDS` (30 min).
  Feriados não são tratados. Após o merge, fazer deploy (a API relê o `.env` no restart).
- Acompanhar: `integracoes.dfe_sync_cursors` (`last_error`). XML ainda indisponível no DFe: o conector aguarda e
  repete (decisão do usuário). Se um NSU travar por dias, definir prazo máximo antes de pular e registrar.
- Tela de revisão: as notas aparecem na lista de XML importados (status RECEIVED); não há
  filtro por origem na tela.

## Backlog que permanece

- Validar relatórios Pagamentos realizados e Previsto x pago com dados reais.
- Revisar alertas preexistentes de dependências @fastify/busboy e node-forge.
- `today()` em payables-types.ts usa UTC; após 21h em São Paulo devolve o dia
  seguinte. Corrigir à parte, com fuso America/Sao_Paulo.
- Método `updateAccess` de session-store.ts sem chamadores (candidato a remoção).
- Manifestação do destinatário e demais documentos FUTURE permanecem como evolução futura.

Preservar .env, backups e dados originais. Não usar down -v, prune ou troca do
Docker data-root para tentar recuperar o ambiente. Alterações do usuário em
.vscode e remoção do Word não fazem parte do pacote de aplicação.

Histórico integral: [índice por assunto](docs/history/continuity-2026-10-31/README.md).
