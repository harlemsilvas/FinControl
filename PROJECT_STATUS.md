# FinControl — Status atual

Atualizado em 31/10/2026. Memória estrutural: [AI_CONTEXT.md](AI_CONTEXT.md).

## Produção

- Release `8c4ac7473f27aa7f00751f2ad954bef41d2fb075` (31/10), deploy
  `41227331581`; anterior `478bcb735c41` (20/10, deploy `39453420210`).
- Health e frontend OK após o deploy; aceite visual do usuário pendente.
- Automação DFe/Sintegra permanece futura.

## Pacote de 31/10 — publicado

- Abas Contas/Cancelados; busca normal exclui cancelados, histórico preservado.
- Cancelamento atualiza Agenda/resumos e apresenta recusas da API.
- “Geração da série concluída” distingue geração de pagamento.
- Salvar edição retorna à origem; lista restaura filtros/aba/página.
- Checagem completa STATUS OK: `checar_alteracao_20261031_121151.log`.
- Teste PostgreSQL isolado de cancelamento/Agenda/histórico passou com rollback.
  Base temporária encerrada; dados reais não foram alterados.
- Commits `b5765bf` e `8c4ac74` na branch feature/matriz-filial-xml.

## Ambiente local recuperado

- Banco original recuperado em cópia isolada (porta 55435, volume
  `fincontrol_recovered_20261031`); dados conferidos contra o checkpoint de 20/10.
- Docker ativo usa `/mnt/docker-data`; cópia antiga em `/home/docker-data-old`
  preservada, sem alteração. Data-root não foi trocado.
- Evidências: [localização](docs/LOCAL-DOCKER-RECOVERY-2026-10-31.md).
- Code Review Graph 2.3.9: 262 arquivos, índice privado em `.local/code-review-graph`.

## Pendências preservadas

- Validar/publicar controladamente o pacote local quando autorizado.
- Conferir relatórios Pagamentos realizados e Previsto x pago com dados reais.
- Revisar avisos preexistentes em @fastify/busboy e node-forge separadamente.

Histórico integral por assunto: [índice](docs/history/continuity-2026-10-31/README.md).
Próxima ação: [NEXT_TASK.md](NEXT_TASK.md).
