## Checkpoint imediato — Debian e produção em 01/10/2026

- Workspace oficial: `/home/harlem/projetos/FinControl`.
- Branch: `feature/matriz-filial-xml`, sincronizada com `origin`.
- Commit implantado: `ef22570 fix(security): update axios to 1.20.0`.
- `npm audit`: zero vulnerabilidades.
- `Checar_alteracao.sh`: `STATUS: OK`, incluindo migrations, tipos, lint, testes e builds.
- PostgreSQL local: container `fincontrol-postgres` saudável, com dados restaurados no volume `fincontrol_fincontrol_postgres_data`.
- Deploy: workflow `Deploy VPS Native` `36910815189` concluído com sucesso.
- Produção: frontend HTTP 200; API e PostgreSQL com health `ok`.
- Evolução publicada: clicar em uma conta da Agenda abre Pagamentos diretamente
  no diálogo de baixa da parcela selecionada.
- Incidente local corrigido: comprovantes usam `.local/storage` no Debian;
  `/opt/fincontrol/storage` permanece exclusivo da VPS.
- Produção confirmou `version.json` no SHA `21cf4fe8b2d9`, frontend HTTP 200 e
  API/PostgreSQL com health `ok` pelo workflow `36925438980`.
