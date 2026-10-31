## Checkpoint de publicação e workspace em 01/10/2026

### Agenda e baixa direta

- Commit `21cf4fe` publicou o acesso direto da Agenda ao diálogo de baixa da
  parcela selecionada e documentou o storage local de comprovantes no Debian.
- `Checar_alteracao.sh` terminou com `STATUS: OK`; log local
  `checar_alteracao_20261001_173159.log`.
- Workflow `Deploy VPS Native` número `36925438980` concluído com sucesso:
  preflight em 58s e deploy controlado em 4m27s.
- `version.json` confirmou o SHA completo
  `21cf4fe8b2d97f0777fcb309bb98c4ff2a33e6c7`; frontend respondeu HTTP 200 e
  o health público confirmou API e PostgreSQL com status `ok`.
- A tentativa local anterior de anexar comprovante falhou antes da gravação no
  banco porque a API usava `/opt/fincontrol/storage`. O Debian local passou a
  usar `.local/storage`, validado por gravação e remoção real de arquivo; a VPS
  preserva seu caminho privado em `/opt/fincontrol/storage`.

- Repositório limpo e sincronizado na branch `feature/matriz-filial-xml`.
- Commit `8686203` publicou a atualização de dependências, segurança e setup Debian; commit `ef22570` atualizou o Axios para 1.20.0.
- `npm audit` aprovado com zero vulnerabilidades.
- `Checar_alteracao.sh` aprovado com migrations, typecheck, lint, testes e builds; log local `checar_alteracao_20261001_155251.log`.
- PostgreSQL local `fincontrol-postgres` permaneceu saudável no volume nomeado `fincontrol_fincontrol_postgres_data`; API local confirmou banco `fincontrol` e frontend local respondeu HTTP 200.
- Workflow `Deploy VPS Native` número `36910815189` concluído com sucesso para o commit imutável `ef22570`: preflight em 1m17s e deploy em 5m18s.
- Após o deploy, `https://hrmmotos.com.br/fincontrol/` respondeu HTTP 200 e o health público confirmou API e PostgreSQL com status `ok`.
- O clone recuperado passa a ser o workspace Debian oficial no caminho `/home/harlem/projetos/FinControl`; o sufixo `-recuperado` foi removido após confirmação de que não existia outra pasta `FinControl` a preservar.
- Próxima tarefa: validar visualmente e financeiramente os relatórios `Pagamentos realizados` e `Previsto x pago` com os dados restaurados.
