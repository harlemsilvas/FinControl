## Checkpoint atual — migração para Debian em 29/09/2026

- Migração de Windows/WSL para Debian nativo informada pelo usuário; ambiente
  consultado identificado como Debian GNU/Linux 13 (trixie).
- Código mantido em `/home/harlem/projetos/FinControl`; desenvolvimento segue
  com Node.js 22 nativo e PostgreSQL 17 em Docker Engine/Compose no Debian.
- `git status` e `git log` falharam com `not a git repository`, inclusive na
  consulta fora do sandbox; `.git` não estava disponível nessa consulta.
  Branch, HEAD, remotes, diferenças locais e sincronização com GitHub não
  puderam ser confirmados. Não foi executado `git init`, pull, commit ou push.
- Node.js/npm não encontrados no PATH; `node_modules` não encontrado na raiz
  nem nos workspaces. Testes, typecheck e build não foram revalidados.
- Docker CLI `29.8.1` e Compose `v5.5.1` disponíveis. Consulta ao daemon fora
  do sandbox retornou zero containers em execução; banco e dados locais ainda
  não foram validados. A restrição de socket do sandbox não prova falha do daemon.
- Migrations: validação estática aprovada para 58 arquivos ordenados, únicos
  e transacionais; não equivale a aplicação ou validação em PostgreSQL.
- Revisão limitada a documentação: arquitetura funcional, migrations, código,
  backups locais, arquivos privados e documentos de futuro preservados.
- Detalhes e roteiro de retomada: `docs/DEVELOPMENT-SETUP.md` e `NEXT_TASK.md`.

As seções datadas abaixo preservam o histórico. Seus SHAs, branches, resultados
e pendências retratam a respectiva data, não uma nova verificação em Debian.
