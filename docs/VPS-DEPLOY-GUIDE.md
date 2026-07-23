# Guia de login e deploy na VPS

**Projeto:** FinControl
**Ambiente:** VPS Hostinger
**URL:** `https://hrmmotos.com.br/fincontrol/`
**API local:** `http://127.0.0.1:3102`

## Regra principal

A VPS nao faz `git push`. Ela apenas le o codigo do GitHub e executa o deploy.

O codigo novo deve ser enviado ao GitHub a partir do ambiente local/WSL. Na VPS, o deploy e feito com:

```bash
sudo /opt/fincontrol/bin/deploy <commit-ou-branch>
```

## Usuario correto

Entrar na VPS com usuario administrativo que tenha `sudo`, como `harlem` ou `deploy`.

Nao fazer login operacional como `fincontrol`. Esse usuario e de servico e dono da aplicacao.

## Entrar na VPS

Com usuario/senha ou chave padrao:

```bash
ssh harlem@IP_OU_HOST_DA_VPS
```

Com chave especifica:

```bash
ssh -i ~/.ssh/SUA_CHAVE harlem@IP_OU_HOST_DA_VPS
```

## Validar estado antes do deploy

```bash
curl -i http://127.0.0.1:3102/health/ready
curl -I https://hrmmotos.com.br/fincontrol/
curl -I https://hrmmotos.com.br/fincontrol/docs/
```

Conferir release atual:

```bash
readlink -f /opt/fincontrol/current
readlink -f /var/www/hrmmotos.com.br/fincontrol/current
```

## Fazer deploy

### Caminho preferencial: GitHub Actions

Depois que o codigo estiver commitado e enviado ao GitHub:

1. Acessar `Actions` no GitHub.
2. Abrir o workflow `Deploy VPS Native`.
3. Clicar em `Run workflow`.
4. Informar `deploy_ref` com uma branch, tag ou commit.
5. Manter `run_checks=true`, salvo emergencia operacional.
6. Digitar `DEPLOY` em `confirmation`.
7. Aprovar o environment `production`, se houver revisores configurados.

O workflow resolve o `deploy_ref` para um commit imutavel e chama na VPS:

```bash
sudo -n /opt/fincontrol/bin/deploy COMMIT_SHA
```

O script remoto continua sendo o unico responsavel por instalar dependencias,
validar, aplicar migrations pendentes, publicar symlinks, recarregar PM2 e
validar health checks.

### Fallback: deploy por SSH

Deploy da branch atual de trabalho:

```bash
sudo /opt/fincontrol/bin/deploy agent/phases-5-11
```

Deploy de um commit especifico:

```bash
sudo /opt/fincontrol/bin/deploy COMMIT_SHA
```

Exemplo:

```bash
sudo /opt/fincontrol/bin/deploy d6fbfb0
```

O script executa:

- clone do codigo como usuario `fincontrol`;
- `npm ci`;
- typecheck;
- testes;
- build da API;
- build do frontend com `/fincontrol/`;
- migrations pendentes;
- validacao do banco;
- publicacao dos symlinks;
- reload do PM2;
- health checks da API e do frontend.

## Validar depois do deploy

```bash
readlink -f /opt/fincontrol/current
readlink -f /var/www/hrmmotos.com.br/fincontrol/current
curl -i http://127.0.0.1:3102/health/ready
curl -I https://hrmmotos.com.br/fincontrol/
curl -I https://hrmmotos.com.br/fincontrol/docs/
```

Validar assets do frontend:

```bash
curl -s https://hrmmotos.com.br/fincontrol/ | grep /fincontrol/assets
```

## Logs da API

```bash
sudo -u fincontrol -H env PATH="/opt/fincontrol/.local/bin:$PATH" \
  PM2_HOME=/opt/fincontrol/.pm2 \
  pm2 logs fincontrol-api --lines 120 --nostream
```

Status do PM2:

```bash
sudo -u fincontrol -H env PATH="/opt/fincontrol/.local/bin:$PATH" \
  PM2_HOME=/opt/fincontrol/.pm2 \
  pm2 status
```

## Rollback

Listar releases disponiveis:

```bash
sudo find /opt/fincontrol/releases -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
```

Voltar para um release:

```bash
sudo /opt/fincontrol/bin/rollback NOME_DO_RELEASE
```

Validar apos rollback:

```bash
curl -i http://127.0.0.1:3102/health/ready
curl -I https://hrmmotos.com.br/fincontrol/
```

## Servicos importantes

PostgreSQL em Docker:

```bash
sudo docker compose -f /opt/fincontrol/infra/postgres/compose.yaml \
  --env-file /opt/fincontrol/infra/postgres/.env ps
```

PM2 dedicado:

```bash
sudo systemctl status pm2-fincontrol.service --no-pager
```

Nginx:

```bash
sudo nginx -t
sudo systemctl status nginx --no-pager
```

## URLs de verificacao

- App: `https://hrmmotos.com.br/fincontrol/`
- Swagger UI: `https://hrmmotos.com.br/fincontrol/docs/`
- OpenAPI JSON: `https://hrmmotos.com.br/fincontrol/openapi.json`
- Health publico: `https://hrmmotos.com.br/fincontrol/health/ready`
- Health local: `http://127.0.0.1:3102/health/ready`

## Pendencia futura

O deploy manual controlado ja esta validado. A proxima evolucao e configurar o GitHub Environment `production` e acionar o workflow `Deploy VPS Native` diretamente pelo GitHub Actions.
