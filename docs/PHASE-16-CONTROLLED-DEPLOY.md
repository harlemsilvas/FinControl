# Fase 16 — Deploy controlado pela VPS e GitHub Actions

**Status:** deploy controlado manual validado na VPS
**Objetivo:** substituir o deploy manual por um fluxo reproduzivel, acionado manualmente e com rollback.

## Estado validado em 17/07/2026

- Plano de controle instalado na VPS em `/opt/fincontrol/bin` e `/opt/fincontrol/shared/ecosystem.config.cjs`.
- Deploy controlado executado com sucesso usando `/opt/fincontrol/bin/deploy`.
- Release publicado: `14bd734`.
- Symlink da API: `/opt/fincontrol/current -> /opt/fincontrol/releases/14bd734...`.
- Symlink do frontend: `/var/www/hrmmotos.com.br/fincontrol/current -> /var/www/hrmmotos.com.br/fincontrol/releases/14bd734...`.
- Health local validado em `http://127.0.0.1:3102/health/ready`.
- Frontend validado em `https://hrmmotos.com.br/fincontrol/`.
- Swagger UI validado em `https://hrmmotos.com.br/fincontrol/docs/`.
- Build do frontend validado com assets em `/fincontrol/assets/...`.

Correcoes incorporadas durante a validacao:

- `deploy` aguarda o health da API/frontend antes de considerar falha.
- `deploy` builda a web com `VITE_BASE_PATH=/fincontrol/` e `VITE_API_URL=/fincontrol`.
- API de cadastros aceita `active` como boolean ou string para compatibilidade com o frontend.

## Artefatos versionados

- `deploy/vps/bin/deploy`: cria release, instala dependencias, roda validacoes, aplica migrations pendentes, publica symlinks, atualiza PM2 e valida health.
- `deploy/vps/bin/rollback`: aponta API e frontend para um release anterior e recarrega o PM2.
- `deploy/vps/bin/install-control-plane`: instala os scripts nos locais definitivos da VPS.
- `deploy/vps/pm2/ecosystem.config.cjs`: configuracao PM2 do `fincontrol-api`.
- `deploy/vps/systemd/pm2-fincontrol.service`: servico systemd dedicado ao PM2 do usuario `fincontrol`.
- `.github/workflows/deploy-vps.yml`: workflow manual ja existente para chamar `/opt/fincontrol/bin/deploy`.

## Instalar na VPS

No servidor, depois de clonar ou atualizar o repositorio:

```bash
cd /opt/fincontrol/releases/RELEASE_ATUAL
sudo bash deploy/vps/bin/install-control-plane
```

Validar:

```bash
sudo ls -la /opt/fincontrol/bin
sudo ls -la /opt/fincontrol/shared/ecosystem.config.cjs
sudo systemctl daemon-reload
sudo systemctl enable pm2-fincontrol.service
```

## Testar deploy manual controlado

Use um commit ou branch ja enviado ao GitHub:

```bash
sudo /opt/fincontrol/bin/deploy agent/phases-5-11
```

Valide:

```bash
curl -i http://127.0.0.1:3102/health/ready
curl -I https://hrmmotos.com.br/fincontrol/
curl -I https://hrmmotos.com.br/fincontrol/docs/
```

Depois do primeiro deploy controlado, validar o servico systemd:

```bash
sudo systemctl status pm2-fincontrol.service --no-pager
```

## Rollback

Listar releases:

```bash
sudo find /opt/fincontrol/releases -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
```

Voltar para um release:

```bash
sudo /opt/fincontrol/bin/rollback NOME_DO_RELEASE
```

## GitHub Environment

Criar o environment `production` no GitHub e cadastrar:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_KNOWN_HOSTS`

O workflow exige execucao manual e `confirmation=DEPLOY`.

### Deploy manual pelo GitHub Actions

O workflow `.github/workflows/deploy-vps.yml` executa:

1. validacao da confirmacao textual;
2. checkout do `deploy_ref` informado ou do commit do workflow;
3. resolucao para um commit SHA imutavel;
4. checks opcionais (`npm ci`, lint, typecheck, testes, build e validacao de migrations);
5. chamada SSH para a VPS:

```bash
sudo -n /opt/fincontrol/bin/deploy COMMIT_SHA
```

O `deploy_ref` pode ser uma branch, tag ou commit. A VPS sempre recebe o commit
resolvido pelo Actions, nao a branch mutavel.

### Sudo sem senha para o deploy

Como o GitHub Actions nao e uma sessao interativa, o usuario SSH configurado em
`VPS_USER` precisa conseguir executar o deploy sem prompt de senha.

Criar um arquivo sudoers dedicado na VPS:

```bash
sudo visudo -f /etc/sudoers.d/fincontrol-github-actions
```

Conteudo recomendado, trocando `deploy` pelo usuario cadastrado em `VPS_USER`:

```text
deploy ALL=(root) NOPASSWD: /opt/fincontrol/bin/deploy
```

Validar na VPS:

```bash
sudo -n /opt/fincontrol/bin/deploy --help
```

Se esse comando retornar erro de uso do script sem pedir senha, a permissao esta
funcional. Se retornar erro de senha, o workflow falhara antes de alterar a
aplicacao.

### Segredos necessarios

`VPS_HOST`:
host ou IP publico da VPS.

`VPS_USER`:
usuario administrativo usado pelo Actions, por exemplo `deploy` ou `harlem`.

`VPS_SSH_KEY`:
chave privada SSH desse usuario. A chave publica correspondente deve estar em
`~/.ssh/authorized_keys` na VPS.

`VPS_KNOWN_HOSTS`:
linha gerada por:

```bash
ssh-keyscan -H SEU_HOST_OU_IP
```

### Migrations

Nao ha fluxo separado para migrations no Actions. O deploy continua chamando o
script oficial da VPS, que:

- valida ordem, unicidade e transacionalidade das migrations;
- aplica apenas migrations pendentes;
- registra checksum em `administracao.schema_versions`;
- executa `database/scripts/verify_database.sql`.

Novas migrations devem continuar seguindo a convencao atual de nome por data,
sempre posteriores a ultima migration aplicada e versionada em
`database/migrations/`.

Essa e a principal pendencia apos o deploy controlado manual validado.

## Observacoes operacionais

- O script nunca executa `docker compose down -v`.
- O PostgreSQL continua fora do ciclo de deploy da aplicacao.
- Migrations antigas aplicadas manualmente sao registradas como baseline em `administracao.schema_versions` quando os objetos ja existem.
- Novas migrations sao aplicadas uma unica vez e registradas com checksum.
- Se o health check falhar, os symlinks voltam para o release anterior.
