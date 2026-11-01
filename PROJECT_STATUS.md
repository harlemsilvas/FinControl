# FinControl — Status atual

Atualizado em 31/10/2026. Memória estrutural: [AI_CONTEXT.md](AI_CONTEXT.md).

## Produção

- Release `0ace2b65a1b1c680ad0d0ad877a7a3c1e5215627` (31/10), deploy
  `41232755286`; anteriores `8c4ac7473f27` (deploy `41227331581`) e
  `478bcb735c41` (deploy `39453420210`, 20/10).
- Health e frontend OK; `main` e branch com CI verde. Aceite visual pendente.
- Conector DFe → FinControl **em produção desde 01/11/2026** (PR #3, release `aa3bf7236dbb`); ver seção abaixo.

## Pacote de 31/10 — publicado

- Abas Contas/Cancelados; busca normal exclui cancelados, histórico preservado.
- Cancelamento atualiza Agenda/resumos e apresenta recusas da API.
- “Geração da série concluída” distingue geração de pagamento.
- Salvar edição retorna à origem; lista restaura filtros/aba/página.
- Checagem completa STATUS OK: `checar_alteracao_20261031_121151.log`.
- Teste PostgreSQL isolado de cancelamento/Agenda/histórico passou com rollback.
  Base temporária encerrada; dados reais não foram alterados.
- Commits `b5765bf` e `8c4ac74` na branch feature/matriz-filial-xml.

## Conector DFe (em produção desde 01/11/2026)

- Decisão do usuário: pull pela rede interna (mesma VPS), chave estática por consumidor,
  somente `procNFe`. Lado DFe: API `/api/integracao/v1` (repositório dfe-sefa-enhaced).
- Lado FinControl: `apps/api/src/domains/integrations/` (cliente, parser, sync, agendador).
- Produção: migration `202610311900` aplicada pelo deploy; `.env` com `DFE_API_BASE_URL=http://127.0.0.1:18003`,
  chave e usuário autor; `DFE_SYNC_ENABLED=true`. Duas empresas (CNPJ 19330326000105 e 51309435000153).
- Primeira carga (01/11): empresa 19330326000105 importou 7 notas novas; 51309435000153 tratou todas como
  duplicatas (já importadas manualmente). Nenhuma conta a pagar gerada automaticamente.
- Travou no 1º NSU até o DFe aceitar o caminho dos XMLs (`DFE_INTEGRACAO_XML_ROOTS` e caminho relativo a `backend/`):
  era problema de leitura no DFe, não XML ausente. A ressalva (XML que nunca aparece) não se confirmou até agora.
- Agenda por horário (branch `feature/dfe-sync-agenda-horario`): seg-sex 7h-18h a cada 5 min; fora disso, 30 min.

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
