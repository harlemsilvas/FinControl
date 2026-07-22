# Plano de Deploy VPS — Multiempresa, XML, Pagamentos e Comprovantes

**Data:** 22/07/2026  
**Status:** plano operacional para deploy manual controlado  
**Ambiente:** VPS Hostinger / `https://hrmmotos.com.br/fincontrol/`

## 1. Objetivo

Publicar o pacote atual do FinControl na VPS, incluindo:

- migrations novas de multiempresa, parâmetros, centros de custo, contas bancárias e tesouraria;
- tela de XMLs importados;
- tela de pagamentos com baixa individual, saldo inicial, histórico, estorno e comprovantes;
- storage local privado para comprovantes;
- dependência nova `@fastify/multipart`.

O banco da VPS contém dados de teste e pode ser limpo. Não há exigência de preservar
esses dados antes deste deploy. Os seeds permitidos são os seeds iniciais oficiais,
empresas necessárias no momento e centros de custo.

## 2. Premissas

- O PostgreSQL da VPS roda em Docker como `fincontrol_postgres`.
- O deploy controlado está instalado em `/opt/fincontrol/bin/deploy`.
- A API usa Node.js 22 isolado em `/opt/fincontrol/.local/bin`.
- O frontend é publicado em `/var/www/hrmmotos.com.br/fincontrol/current`.
- O deploy deve usar um commit já enviado ao GitHub.

## 3. Preparação do Commit Local

Antes de qualquer ação na VPS:

```bash
git status --short
./scripts/validate-migrations.sh
npm run typecheck
npm test
npm run build --workspaces --if-present
git add -A
git commit -m "Implementa multiempresa, pagamentos e comprovantes locais"
git push
```

Guardar o `COMMIT_SHA` gerado pelo commit/push. O deploy da VPS deve apontar para esse
commit, não para alterações locais não publicadas.

## 4. Preparação da VPS

Entrar na VPS com usuário administrativo:

```bash
ssh deploy@IP_OU_HOST_DA_VPS
```

Validar serviços:

```bash
sudo docker ps --filter name=fincontrol_postgres
sudo systemctl status nginx --no-pager
sudo -u fincontrol -H env PM2_HOME=/opt/fincontrol/.pm2 pm2 status
```

Criar storage local privado para comprovantes:

```bash
sudo mkdir -p /opt/fincontrol/storage/attachments/payments
sudo chown -R fincontrol:fincontrol /opt/fincontrol/storage
sudo chmod 750 /opt/fincontrol/storage /opt/fincontrol/storage/attachments /opt/fincontrol/storage/attachments/payments
```

Atualizar `/opt/fincontrol/shared/.env` se as variáveis ainda não existirem:

```text
ATTACHMENT_STORAGE_ROOT=/opt/fincontrol/storage
ATTACHMENT_MAX_FILE_SIZE_BYTES=10485760
```

## 5. Limpeza do Banco de Testes

Como os dados atuais da VPS são descartáveis, limpar os schemas de aplicação antes de
rodar as migrations completas.

Carregar as variáveis do app e abrir `psql` no container:

```bash
set -a
. /opt/fincontrol/shared/.env
set +a
sudo docker exec -i -e PGPASSWORD="$DB_PASSWORD" fincontrol_postgres \
  psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME"
```

Executar:

```sql
DROP SCHEMA IF EXISTS financeiro CASCADE;
DROP SCHEMA IF EXISTS tesouraria CASCADE;
DROP SCHEMA IF EXISTS cadastros CASCADE;
DROP SCHEMA IF EXISTS administracao CASCADE;
```

Não remover o database, o usuário, o container ou o volume Docker. Não executar
`docker compose down -v`.

## 6. Migrations Antes da Publicação

Usar o deploy controlado com o `COMMIT_SHA` do pacote. O script da VPS:

- clona o commit;
- executa `npm ci`, atualizando pacotes conforme `package-lock.json`;
- roda validações;
- aplica migrations pendentes;
- só depois troca symlinks, atualiza PM2 e publica o frontend.

Com a base limpa no passo anterior, todas as migrations oficiais serão aplicadas em ordem:

```bash
sudo /opt/fincontrol/bin/deploy COMMIT_SHA
```

Ponto de atenção: se quisermos aplicar migrations manualmente antes do script, usar o
mesmo commit em um checkout temporário e registrar `administracao.schema_versions`.
O caminho preferido é deixar o script executar essa parte, porque ele já registra checksum
e evita reaplicação indevida.

## 7. Seeds Permitidos

Depois das migrations:

- seeds iniciais oficiais já fazem parte das migrations base;
- centros de custo são aplicados pela migration `202607221300_cadastros_seed_cost_centers_from_branchnova.sql`;
- empresas necessárias podem ser cadastradas pela tela `/companies` ou por seed SQL idempotente específico, se aprovado antes da execução;
- parâmetros por empresa devem ser conferidos em `/company-parameters`;
- não aplicar seeds de fornecedores, títulos, XMLs ou pagamentos de teste, salvo validação pontual.

## 8. Validação Pós-Deploy

Validar health e frontend:

```bash
curl -i http://127.0.0.1:3102/health/ready
curl -I https://hrmmotos.com.br/fincontrol/
curl -I https://hrmmotos.com.br/fincontrol/docs/
```

Validar banco:

```bash
set -a
. /opt/fincontrol/shared/.env
set +a
sudo docker exec -i -e PGPASSWORD="$DB_PASSWORD" fincontrol_postgres \
  psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT count(*) FROM administracao.schema_versions;"
```

Validar objetos críticos:

```sql
SELECT to_regclass('cadastros.companies') IS NOT NULL AS companies_ok;
SELECT to_regclass('cadastros.company_parameters') IS NOT NULL AS company_parameters_ok;
SELECT to_regclass('tesouraria.bank_account_movements') IS NOT NULL AS bank_movements_ok;
SELECT to_regclass('financeiro.attachments') IS NOT NULL AS attachments_ok;
SELECT to_regclass('financeiro.xml_imports') IS NOT NULL AS xml_imports_ok;
```

Validar tela:

- login do Operador Master;
- cadastrar/conferir empresas;
- cadastrar/conferir parâmetros por empresa;
- conferir centros de custo;
- importar XML e gerar conta a pagar;
- lançar saldo inicial em `/payments`;
- baixar uma parcela;
- abrir detalhe do pagamento;
- anexar e baixar um comprovante PDF/imagem.

## 9. Rollback

Se o health falhar durante o deploy, o script já tenta retornar os symlinks anteriores.

Rollback manual:

```bash
sudo find /opt/fincontrol/releases -mindepth 1 -maxdepth 1 -type d -printf '%f\n' | sort
sudo /opt/fincontrol/bin/rollback NOME_DO_RELEASE
```

Observação: rollback de código não desfaz migrations. Como a base será limpa e recriada
neste pacote, tratar eventual problema estrutural com nova migration corretiva.
