# FinControl — Backup e Restore do Banco na VPS

**Status:** rotina operacional versionada
**Ambiente alvo:** VPS Hostinger
**Banco:** PostgreSQL em Docker (`fincontrol_postgres`)
**Diretorio de backups:** `/opt/fincontrol/shared/backups`

## Objetivo

Manter backups logicos do banco de dados fora do volume Docker do PostgreSQL,
com checksum e ponto de restauracao antes de deploys/migrations.

## Arquivos versionados

- `deploy/vps/bin/backup-db`
- `deploy/vps/bin/restore-db`
- `deploy/vps/bin/install-control-plane`
- `deploy/vps/bin/deploy`

## Instalacao dos comandos na VPS

Depois de publicar uma release que contenha os scripts:

```bash
sudo bash /opt/fincontrol/current/deploy/vps/bin/install-control-plane
```

Comandos instalados:

```bash
/opt/fincontrol/bin/backup-db
/opt/fincontrol/bin/restore-db
```

## Permissao para gerar backup pela tela web

A API roda como usuario da aplicacao. Para permitir backup pela tela sem abrir
sudo amplo, crie uma regra restrita:

```bash
sudo visudo -f /etc/sudoers.d/fincontrol-backup
```

Conteudo:

```text
fincontrol ALL=(root) NOPASSWD: /opt/fincontrol/bin/backup-db web
```

Permissoes do arquivo:

```bash
sudo chmod 440 /etc/sudoers.d/fincontrol-backup
```

No `.env` da VPS:

```bash
BACKUP_DIRECTORY=/opt/fincontrol/shared/backups
BACKUP_SCRIPT_PATH=/opt/fincontrol/bin/backup-db
BACKUP_SCRIPT_USE_SUDO=true
```

## Uso pela tela web

Usuarios autorizados acessam:

```text
Configuracoes > Backups
```

Permissao exigida:

```text
BACKUP_MANAGE
```

O perfil `MASTER` recebe essa permissao por migration. Usuarios nao-Master
precisam estar vinculados a um perfil que tenha `BACKUP_MANAGE`.

A tela permite:

- consultar backups existentes;
- gerar backup imediato;
- exportar o arquivo `.dump` para uma copia local.

Endpoints administrativos:

```text
GET  /api/v1/backups
POST /api/v1/backups
GET  /api/v1/backups/:name/download
```

A geracao e a exportacao pela tela sao registradas em
`administracao.audit_events`.

## Backup manual

```bash
sudo /opt/fincontrol/bin/backup-db manual
```

O arquivo gerado segue o padrao:

```text
/opt/fincontrol/shared/backups/fincontrol_YYYYMMDDTHHMMSSZ_RELEASE_REASON.dump
```

Arquivos auxiliares:

```text
.dump.sha256
.dump.json
```

## Backup automatico no deploy

O script `/opt/fincontrol/bin/deploy` cria automaticamente um backup antes de
aplicar migrations:

```text
reason = pre-deploy-<short_sha>
```

Isso protege o banco antes de qualquer alteracao estrutural feita por migration.

## Consultar backups disponiveis

```bash
sudo find /opt/fincontrol/shared/backups -maxdepth 1 -type f -name '*.dump' -printf '%TY-%Tm-%Td %TH:%TM  %f\n' | sort
```

## Validar checksum de um backup

```bash
cd /opt/fincontrol/shared/backups
sudo sha256sum -c nome_do_backup.dump.sha256
```

## Restore

Restore e uma operacao destrutiva: ele limpa objetos existentes e restaura o
conteudo do dump informado. O script exige confirmacao explicita `RESTORE`.

Antes de restaurar, o script:

- valida o checksum quando o arquivo `.sha256` existe;
- cria um backup de seguranca com motivo `pre-restore`;
- para a API no PM2;
- restaura o dump com `pg_restore`;
- sobe a API novamente e salva o estado do PM2.

Comando:

```bash
sudo /opt/fincontrol/bin/restore-db nome_do_backup.dump RESTORE
```

Tambem e aceito o caminho absoluto dentro de `/opt/fincontrol/shared/backups`:

```bash
sudo /opt/fincontrol/bin/restore-db /opt/fincontrol/shared/backups/nome_do_backup.dump RESTORE
```

## Validacao apos restore

```bash
curl -fsS http://127.0.0.1:3102/health/ready
sudo docker exec -i -e PGPASSWORD="$DB_PASSWORD" fincontrol_postgres \
  psql -U "$DB_USER" -d "$DB_NAME" -c "SELECT count(*) FROM administracao.schema_versions;"
```

Se estiver como root, carregue o `.env` antes da consulta:

```bash
. /opt/fincontrol/shared/.env
```

## Retencao

Por padrao, o backup remove arquivos `.dump`, `.dump.sha256` e `.dump.json`
com mais de 14 dias.

Para alterar temporariamente:

```bash
sudo BACKUP_RETENTION_DAYS=30 /opt/fincontrol/bin/backup-db manual
```

## Politica de seguranca

- Nunca enviar dumps de producao pela conversa.
- Nunca versionar arquivos `.dump`, `.backup`, `.sql` de producao ou checksums
  que identifiquem dados reais.
- Manter backups fora do volume Docker do PostgreSQL.
- Antes de migrations de maior risco, executar backup manual e guardar o nome
  do arquivo no registro operacional da tarefa.
