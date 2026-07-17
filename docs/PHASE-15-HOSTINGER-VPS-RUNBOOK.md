# Fase 15 — Runbook de provisionamento da VPS Hostinger

**Status:** aguardando execução
**Domínio:** `https://hrmmotos.com.br/fincontrol/`
**Modelo:** PostgreSQL em Docker; API nativa sob PM2; frontend estático sob Nginx

## 1. Arquitetura aprovada

- `deploy`: usuário administrativo, acessado por SSH e autorizado a usar `sudo`.
- `fincontrol`: usuário de serviço sem login, responsável pela aplicação.
- API Node.js em uma porta local ainda a confirmar, sem exposição pública direta, gerenciada pelo PM2.
- Frontend estático servido pelo Nginx.
- PostgreSQL 17 em container Docker, com volume persistente e porta publicada somente em `127.0.0.1`.
- Nginx publica frontend e API sob `/fincontrol`.
- Releases versionados com symlink `current`, permitindo rollback.
- O Compose da VPS controla somente o banco; deploys da aplicação não recriam o PostgreSQL.

## 2. Estrutura de diretórios

```text
/opt/fincontrol/
├── bin/
│   ├── deploy
│   └── rollback
├── infra/
│   └── postgres/
│       ├── compose.yaml
│       └── .env
├── releases/
│   └── <commit-ou-versao>/
├── shared/
│   ├── .env
│   ├── uploads/
│   └── backups/
└── current -> /opt/fincontrol/releases/<versao-atual>

/var/www/hrmmotos.com.br/
└── fincontrol -> /opt/fincontrol/current/apps/web/dist

/etc/nginx/
├── sites-available/hrmmotos.com.br
└── sites-enabled/hrmmotos.com.br
```

O banco usa um volume Docker nomeado. Backups lógicos devem ser gravados fora do volume em `/opt/fincontrol/shared/backups`; o volume nunca deve ser removido por rotinas de deploy.

## 3. Preparação no hPanel

1. Confirmar que a VPS está em execução.
2. Anotar IP público, hostname e versão do Ubuntu.
3. Preferir Ubuntu 22.04 ou 24.04 Plain OS.
4. Em `VPS → Security → Firewall`, permitir entrada somente em:
   - TCP 22 para SSH;
   - TCP 80 para HTTP;
   - TCP 443 para HTTPS.
5. Não expor as portas 3000 e 5432.
6. Manter o terminal web/noVNC disponível durante alterações de SSH.

Referência: [Hostinger — configuração inicial de VPS](https://www.hostinger.com/tutorials/how-to-set-up-vps).

## 4. Criar o usuário administrativo

Entrar inicialmente como root:

```bash
ssh root@IP_DA_VPS
```

Criar o usuário:

```bash
adduser deploy
usermod -aG sudo deploy
```

Validar:

```bash
su - deploy
sudo whoami
```

O resultado deve ser `root`. Não encerrar a sessão root até testar o usuário `deploy` em uma segunda sessão SSH.

## 5. Criar a chave pessoal de acesso à VPS

No WSL local:

```bash
ssh-keygen -t ed25519 -a 100 \
  -f ~/.ssh/fincontrol_hostinger \
  -C "fincontrol-hostinger"
```

Proteger a chave privada com uma senha e copiar somente a pública:

```bash
ssh-copy-id -i ~/.ssh/fincontrol_hostinger.pub deploy@IP_DA_VPS
```

Testar em outra sessão:

```bash
ssh -i ~/.ssh/fincontrol_hostinger deploy@IP_DA_VPS
```

Nunca compartilhar `~/.ssh/fincontrol_hostinger`. Apenas o arquivo `.pub` pode ser cadastrado na VPS ou no hPanel.

Referência: [Hostinger — chaves SSH](https://support.hostinger.com/en/articles/5634532-how-to-generate-ssh-keys-and-add-them-to-hpanel).

## 6. Proteger o SSH

Executar somente depois de confirmar o acesso por chave em uma segunda sessão.

Editar `/etc/ssh/sshd_config` e configurar:

```text
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

Validar e recarregar:

```bash
sudo sshd -t
sudo systemctl reload ssh
```

Manter a sessão atual aberta e testar novamente antes de encerrar.

## 7. Validar programas existentes

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git fail2ban curl ca-certificates build-essential postgresql-client
```

Como a VPS já hospeda outros sistemas, não reinstalar ou trocar versões antes do inventário. Validar:

```bash
node --version
npm --version
nginx -v
git --version
psql --version
pm2 --version
docker --version
docker compose version
sudo systemctl status nginx
```

O projeto exige Node.js 22. Se a versão global for diferente, deve-se avaliar o gerenciador de versões já utilizado pelos outros sistemas antes de qualquer alteração.

Referência: [Hostinger — Node.js no Ubuntu](https://www.hostinger.com/tutorials/how-to-install-nodejs-ubuntu/).

## 8. Criar usuário e diretórios da aplicação

```bash
sudo adduser \
  --system \
  --group \
  --home /opt/fincontrol \
  --shell /usr/sbin/nologin \
  fincontrol
```

```bash
sudo mkdir -p \
  /opt/fincontrol/bin \
  /opt/fincontrol/releases \
  /opt/fincontrol/shared/uploads \
  /opt/fincontrol/shared/backups \
  /var/www/hrmmotos.com.br

sudo chown -R fincontrol:fincontrol /opt/fincontrol
sudo chmod 750 /opt/fincontrol
sudo chmod 750 /opt/fincontrol/shared
sudo chmod 750 /opt/fincontrol/shared/uploads
sudo chmod 750 /opt/fincontrol/shared/backups
```

As permissões de leitura do frontend pelo Nginx serão definidas durante a criação do virtual host.

## 9. Criar Deploy Key do GitHub

Gerar uma chave exclusiva e sem permissão de escrita:

```bash
sudo -u fincontrol mkdir -p /opt/fincontrol/.ssh
sudo -u fincontrol ssh-keygen \
  -t ed25519 \
  -f /opt/fincontrol/.ssh/id_ed25519 \
  -C "fincontrol-vps-deploy" \
  -N ""
```

Exibir somente a chave pública:

```bash
sudo cat /opt/fincontrol/.ssh/id_ed25519.pub
```

No GitHub, acessar `Settings → Deploy keys → Add deploy key`:

- nome: `Hostinger VPS`;
- colar a chave pública;
- deixar `Allow write access` desmarcado.

Antes do clone, cadastrar o host do GitHub em `known_hosts` e conferir a impressão digital publicada oficialmente pelo GitHub.

## 10. Criar o Compose dedicado do PostgreSQL

O arquivo `/opt/fincontrol/infra/postgres/compose.yaml` será criado após confirmar containers, redes, portas e convenções existentes. Requisitos obrigatórios:

- imagem PostgreSQL 17 Alpine fixada;
- nome de projeto e container exclusivos;
- volume nomeado exclusivo e persistente;
- bind somente em `127.0.0.1`;
- porta externa sem conflito, preferencialmente 5434 se estiver livre;
- health check com `pg_isready`;
- `restart: unless-stopped`;
- credenciais lidas de `.env` com permissão 600;
- nenhuma execução de `down -v` nos procedimentos operacionais.

Gerar senhas fortes fora da VPS ou com:

```bash
openssl rand -base64 36
```

Após criar os arquivos, validar e subir:

```bash
cd /opt/fincontrol/infra/postgres
sudo docker compose config
sudo docker compose up -d
sudo docker compose ps
```

Não adicionar o usuário `fincontrol` ao grupo `docker`: esse grupo equivale, na prática, a acesso root. O Compose será operado pelo usuário administrativo `deploy` via `sudo`.

O banco e o usuário da aplicação serão criados pelas variáveis iniciais do container:

```dotenv
POSTGRES_DB=fincontrol
POSTGRES_USER=fincontrol_app
POSTGRES_PASSWORD=UMA_SENHA_LONGA_E_ALEATORIA
```

O PostgreSQL não deve aceitar conexões públicas e sua porta não deve ser aberta no firewall da VPS ou da Hostinger.

## 11. Criar ambiente de produção

Arquivo: `/opt/fincontrol/shared/.env`

```dotenv
NODE_ENV=production
API_HOST=127.0.0.1
API_PORT=3000
LOG_LEVEL=info

DB_HOST=127.0.0.1
DB_PORT=PORTA_LOCAL_DO_CONTAINER
DB_NAME=fincontrol
DB_USER=fincontrol_app
DB_PASSWORD=SENHA_FORTE
DB_POOL_MAX=10
DB_IDLE_TIMEOUT_MS=30000
DB_CONNECTION_TIMEOUT_MS=5000

AUTH_ACCESS_TOKEN_SECRET=SEGREDO_ALEATORIO_COM_MAIS_DE_32_CARACTERES
AUTH_ACCESS_TOKEN_TTL_SECONDS=900
AUTH_REFRESH_TOKEN_TTL_DAYS=30
AUTH_ISSUER=fincontrol-api
AUTH_AUDIENCE=fincontrol
```

Aplicar permissões:

```bash
sudo chown fincontrol:fincontrol /opt/fincontrol/shared/.env
sudo chmod 600 /opt/fincontrol/shared/.env
```

Esse arquivo nunca deve ser enviado ao Git, chat ou logs de CI.

## 12. Ajustes necessários para o subpath

Antes do primeiro deploy, o frontend deve ser adaptado de `/` para `/fincontrol/`:

- configurar Vite com base `/fincontrol/`;
- configurar React Router com basename `/fincontrol`;
- direcionar chamadas para `/fincontrol/api`, `/fincontrol/auth` e `/fincontrol/health`;
- garantir fallback da SPA para `/fincontrol/index.html`;
- redirecionar `/fincontrol` para `/fincontrol/`.

Rotas esperadas:

```text
/fincontrol/          → frontend estático
/fincontrol/api/      → 127.0.0.1:PORTA_API_LOCAL/api/
/fincontrol/auth/     → 127.0.0.1:PORTA_API_LOCAL/auth/
/fincontrol/health/   → 127.0.0.1:PORTA_API_LOCAL/health/
```

Não publicar o frontend atual no subpath antes desses ajustes.

## 13. Nginx

Preservar o virtual host existente de `hrmmotos.com.br`. Antes de editar:

```bash
sudo cp \
  /etc/nginx/sites-available/hrmmotos.com.br \
  /etc/nginx/sites-available/hrmmotos.com.br.backup
```

Adicionar os locations de `/fincontrol` somente após revisar a configuração existente. Sempre validar e recarregar sem interromper conexões:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Referência: [Hostinger — Nginx reverse proxy](https://www.hostinger.com/uk/tutorials/how-to-set-up-nginx-reverse-proxy).

## 14. Processo PM2

Será criado um arquivo `ecosystem.config.cjs` versionado ou instalado no release com:

- execução como `fincontrol`;
- diretório `/opt/fincontrol/current/apps/api`;
- variáveis de `/opt/fincontrol/shared/.env`;
- execução do JavaScript compilado em `dist/server.js`;
- uma instância inicial em modo `fork`;
- reinício automático, limites de memória e rotação de logs;
- API vinculada exclusivamente a `127.0.0.1` e porta sem conflito.

O PM2 deve ser executado pelo usuário operacional definido após o inventário. Comandos previstos:

```bash
pm2 start ecosystem.config.cjs --only fincontrol-api
pm2 save
pm2 status
pm2 logs fincontrol-api --lines 100
```

O `pm2 startup` deve reutilizar o padrão já configurado na VPS; não criar uma segunda inicialização sem revisar o serviço existente.

## 15. Deploy e rollback

O script `/opt/fincontrol/bin/deploy` deverá:

1. validar a referência Git recebida;
2. baixar o código como `fincontrol`;
3. criar release imutável;
4. executar `npm ci`;
5. executar lint, testes e build conforme política de produção;
6. aplicar migrations pendentes explicitamente;
7. executar verificação do banco;
8. apontar `current` de forma atômica;
9. atualizar o symlink do frontend;
10. recarregar a API com `pm2 reload fincontrol-api --update-env`;
11. validar health check e frontend;
12. reverter o symlink se a validação falhar;
13. manter releases anteriores para rollback.

O workflow GitHub `Deploy VPS Native` somente será habilitado quando esse script estiver instalado e validado manualmente.

## 16. GitHub Environment

Criar o environment `production`, preferencialmente com aprovação obrigatória, e cadastrar:

- `VPS_HOST`;
- `VPS_USER`;
- `VPS_SSH_KEY`;
- `VPS_KNOWN_HOSTS`.

A chave usada pelo GitHub Actions para entrar como `deploy` é diferente da Deploy Key usada pela VPS para ler o repositório.

## 17. Ordem segura de execução

1. Confirmar Ubuntu, IP, DNS e configuração HTTP/Nginx atual.
2. Criar `deploy` e testar a chave pessoal em outra sessão.
3. Proteger SSH e firewall.
4. Inventariar Node.js, PM2, Nginx, Docker, Compose, Git e firewall existentes.
5. Criar `fincontrol` e a estrutura de diretórios.
6. Criar Deploy Key somente leitura para o GitHub.
7. Criar o Compose do PostgreSQL, banco, usuário e `.env` de produção.
8. Adaptar e testar o frontend para `/fincontrol`.
9. Criar release inicial e aplicar migrations.
10. Criar e testar o processo PM2.
11. Incorporar os locations ao Nginx existente e validar SSL.
12. Criar e testar deploy e rollback manuais.
13. Configurar o environment `production` no GitHub.
14. Habilitar o deploy controlado da Fase 14.

## 18. Informações necessárias antes da execução assistida

- IP ou hostname SSH da VPS;
- versão do Ubuntu;
- porta SSH, se diferente de 22;
- confirmação de acesso do usuário `deploy` por chave;
- configuração atual do virtual host `hrmmotos.com.br`, sem chaves privadas;
- situação atual do DNS e SSL;
- confirmação de que o repositório GitHub continuará privado ou público.
- versões de Node.js, npm, PM2, Docker e Docker Compose;
- saída sanitizada de containers, redes e portas em uso;
- usuário Unix que atualmente executa os processos PM2;
- configuração PM2 atual e nomes dos processos, sem variáveis ou segredos;

Nunca enviar senhas, chave SSH privada, `.env`, chave privada TLS ou dump de produção pela conversa.
