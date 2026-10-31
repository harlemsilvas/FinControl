## Backup atualizado e fuso em 19/10/2026

- Backup informado pelo usuário em `backup/` conferido contra Downloads,
  com SHA-256 idêntico; pasta já ignorada e cópia de trabalho com modo 600.
- PostgreSQL existente iniciado; backup restaurado somente em
  `fincontrol_validation_20261019`. Verificação oficial PASS: 58 migrations,
  201 títulos, 192 pagamentos. Base original preservada, ainda usada no `.env`.
- Nota 26466 confirma emissão 29/09 e importação em 30/09 às 21:24 em São Paulo,
  que correspondia a 01/10 no fuso UTC do servidor; diagnóstico confirmado.
- Política oficial de negócio: `America/Sao_Paulo`; API valida TZ e configura
  todas as conexões do pool, Compose local/VPS e PM2 declaram o fuso e a tela
  de XML formata importação explicitamente. Datas civis não são timestamps.
- PostgreSQL local recebeu ALTER SYSTEM e recarga; VPS ainda não alterada.
- Não houve promoção da base, migration, commit, push ou deploy.


Validação final do pacote de fuso em 19/10: `Checar_alteracao.sh` com
`STATUS: OK` (migrations, tipos, lint, testes e builds), log local
`logs/alteracoes/checar_alteracao_20261019_184620.log`. Compose local e sintaxe
PM2 validados; teste da tela em UTC aprovado. `SHOW TimeZone` em conexão nova
confirmou `America/Sao_Paulo`; verificação oficial do banco restaurado PASS.
