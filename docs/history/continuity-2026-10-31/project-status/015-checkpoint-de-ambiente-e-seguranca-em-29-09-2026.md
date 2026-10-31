## Checkpoint de ambiente e segurança em 29/09/2026

- Histórico Git recuperado do GitHub na branch `feature/matriz-filial-xml`, a
  partir do checkpoint `93ea2c3` que contém os três relatórios operacionais.
- Ambiente Debian validado com Node.js 22.23.1, npm 12.1.0, Docker Engine e
  PostgreSQL 17.11.
- Backup `fincontrol_20260929T204440Z_93ea2c3adf1f_web.dump` restaurado primeiro
  em banco separado e aprovado por `verify_database.sql`; banco promovido para
  `fincontrol` com 58 migrations, 3 usuários, 3 empresas, 191 títulos e 155
  pagamentos. Estado anterior preservado como `fincontrol_pre_restore_20260929`.
- Configuração legada `docker-credential-desktop` removida; configuração
  anterior preservada localmente com permissão privada.
- Dependências de segurança atualizadas: Nodemailer 10.0.12, Vitest 4.1.11,
  `uuid` 11.1.1 no ExcelJS e `brace-expansion` 1.1.21.
- `npm audit` aprovado com zero vulnerabilidades. Exportação XLSX real testada.
- `./Checar_alteracao.sh` aprovado com migrations, typecheck, lint, testes e
  builds; log local `checar_alteracao_20260929_181205.log`.
- API e frontend reiniciados localmente; `/health/ready` confirmou API e banco
  com status `ok`.
