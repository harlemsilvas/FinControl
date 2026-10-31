## Correção local de filtros XML em 19/10/2026

- Solicitação ativa: datas de emissão inclusivas e somente dois campos de
  período em XMLs Importados.
- Diagnóstico: tela usava importação/vencimento; conversão de importação para
  date dependia do fuso PostgreSQL e podia deslocar a data civil para UTC.
- Implementação local adiciona `issueFrom`/`issueTo`, simplifica a tela e fixa
  São Paulo para os filtros legados de importação. Sem migration.
- Backup atual conferido em base separada conforme checkpoint acima; aguarda
  conferência visual da nota 26466, sem commit ou alteração em produção.


Validações em 19/10: API 120 testes aprovados e 5 integrações opt-in puladas;
web 62 testes aprovados; types, lint e builds aprovados. A primeira execução
`Checar_alteracao.sh` registrou FAIL por whitespace documental e lint do teste
novo; ambos corrigidos e revalidados por `git diff --check` e lint web isolado.
O teste da tela foi reexecutado após a correção (3 aprovados). Log inicial:
`logs/alteracoes/checar_alteracao_20261019_181628.log`. Não se declara STATUS OK
da execução inicial. Conferência da nota real pendente do backup atualizado.
