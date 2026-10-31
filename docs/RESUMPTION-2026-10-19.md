# Retomada do FinControl — 19/10/2026

## Ponto recuperado

Não é necessário reconstruir o projeto. A documentação oficial, o Git e os
chats locais concordam sobre o último pacote funcional.

- Branch: `feature/matriz-filial-xml`.
- HEAD e referência local de origin: `c344a20c4ea1522d788c27d6788f2e2507687b67`.
- Deploy histórico: `21cf4fe8b2d97f0777fcb309bb98c4ff2a33e6c7`.
- Última entrega: Agenda abre diretamente o diálogo de baixa da parcela;
  configuração local de comprovantes usa `.local/storage`.
- Pendência funcional: conferir Agenda/comprovantes e os relatórios
  `Pagamentos realizados` e `Previsto x pago`, incluindo meses diferentes,
  pagamentos parciais, estornos, escopo por empresa, impressão e XLSX.

## Fontes locais consultadas

1. Documentação raiz e `docs/CONTINUITY-RUNBOOK.md`.
2. Histórico Git até o commit documental `c344a20`.
3. Sessão de desenvolvimento:
   `/home/harlem/.codex/sessions/2026/09/29/rollout-2026-09-29T15-54-13-01a0ee84-7443-7442-9680-958eb4cd1422.jsonl`.
   A data do nome é a abertura da sessão; seu encerramento registra o deploy
   de 01/10 e o checkpoint `c344a20`.
4. Índice restaurado de chats:
   `/home/harlem/projetos/historico_codex/restauracao-wsl/conversas.md`.
   Contém referências anteriores do FinControl em WSL e Debian.
5. Sessão de recuperação Docker de 17/10:
   `01a14c59-863c-7a53-88e7-1542c97386ef` e relatório
   `/home/harlem/backups/docker-recovery-20261017/RECUPERACAO.md`.
   Registram FinControl recuperado e saudável em 5434 naquela data.

## Backups encontrados

- Mais recente encontrado na pasta de backups consultada:
  `/home/harlem/backups/fincontrol-recuperado-20261017-191611.sql`.
- Dump anterior:
  `database/fincontrol_20260929T204440Z_93ea2c3adf1f_web.dump`.
  Sua restauração e validação em 29/09 estão documentadas no status.

A existência dos arquivos foi conferida. Os checksums ficam somente no
inventário local privado. Na inspeção inicial não houve restauração; a evolução
com backup atual de 19/10 está registrada em `PROJECT_STATUS.md`.
Não substituir o volume recuperado por um dump anterior automaticamente.

## Verificação inicial e limites — histórico da retomada

- Node.js: `v22.23.1`.
- API e frontend não responderam em 3000 e 5173 na consulta local.
- Docker confirmou `fincontrol-postgres` (`postgres:17-alpine`) parado com
  `Exited (0)`; nenhum container foi recriado ou iniciado.
- Não houve fetch, pull, commit, push ou deploy; estado remoto e produção
  atual não foram revalidados.
- Não foram executados migrations, testes, audit ou builds nesta revisão
  documental. Resultados de 01/10 permanecem históricos.
- Alterações do usuário preservadas: `.vscode/settings.json` modificado e
  `docs/PROJECT_HISTORY.md.docx` removido.

## Sequência de continuidade

Seguir `NEXT_TASK.md`: conferir container/volume e configuração, iniciar o
ambiente existente e validar readiness; depois conferir os fluxos e os números
financeiros. Usar `docs/DEVELOPMENT-SETUP.md` e os documentos dos relatórios.
Executar `Checar_alteracao.sh` ao concluir um pacote funcional.
