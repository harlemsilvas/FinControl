# Localização do PostgreSQL original — 31/10/2026

## Resultado da inspeção somente de leitura

Docker ativo: contexto default, data-root `/mnt/docker-data`. O container do
FinControl não está registrado nesse daemon. A cópia antiga contém duas
instalações, ambas com container fincontrol-postgres, imagem postgres:17-alpine,
projeto Compose fincontrol e serviço postgres.

| Cópia | ID do container (prefixo) | Último encerramento em São Paulo |
| --- | --- | --- |
| /home/docker-data-old/docker | 16a75f3ed8ba | 02/10/2026 21:09:37 |
| /home/docker-data-old/engine | 58b822bb0a2d | 20/10/2026 19:40:38 |

Ambas registram Running=false e ExitCode=0. A segunda é a candidata mais recente
pelos metadados; isso não comprova integridade lógica nem equivalência dos dados.

## Volume candidato mais recente

`/home/docker-data-old/engine/volumes/fincontrol_fincontrol_postgres_data/_data`

- PG_VERSION = 17; global/pg_control, base/ e pg_wal/ presentes.
- Sem postmaster.pid; proprietário numérico 70, modo 0700 preservado.
- O container foi criado em 17/10 e iniciado pela última vez em 20/10.
- Mount original registrado: /mnt/docker/engine/volumes/fincontrol_fincontrol_postgres_data/_data.
- A cópia mais antiga está no mesmo sufixo de volume sob /home/docker-data-old/docker.
- Nenhum cluster foi iniciado ou alterado nesta inspeção.

## Próxima ação

Recuperar por cópia isolada do volume engine, mantendo o original intacto.
Antes de iniciar o PostgreSQL 17 nessa cópia, registrar tamanho e checksums,
conferir permissões/dono e verificar pg_control. Usar volume e porta próprios;
não apontar o daemon atual para a árvore antiga. Depois conferir bancos,
schema_versions, dados financeiros e fuso antes de alterar o .env.

Referência do checkpoint de 20/10: fincontrol_validation_20261019, 201 títulos,
192 pagamentos e 59 migrations. Esses números ainda não foram consultados na
cópia física encontrada. Recuperação não foi executada por esta entrega.

## Acesso e evidências privadas

O usuário liberou ACL de leitura/listagem na raiz e em diretórios superiores.
As linhas seguintes coladas juntas causaram erro; substituídas por execução
única de .local/inspect-old-fincontrol.py como root no terminal do usuário.
O script só lê metadados/PG_VERSION, omite Env e senhas e não modifica a origem.
Resultado: .local/docker-old-inventory.json, modo 0600, sem erros registrados.
Não conceder chmod/chown recursivo nem ACL recursiva nos arquivos PGDATA.

## Code Review Graph

Versão 2.3.9, build completo e consulta de chamadas conferida. Índice ignorado
pelo Git: .local/code-review-graph; 262 arquivos, 1.758 nós, 17.332 relações.
Sem embeddings externos. Registro no diretório pessoal aponta para esse índice.

```bash
code-review-graph status --repo . --data-dir .local/code-review-graph --json
code-review-graph update --repo .
```

Grafo auxilia navegação no código; não substitui documentação, diff ou testes.
