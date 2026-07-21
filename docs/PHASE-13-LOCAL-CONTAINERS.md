# Fase 13 — Containers locais da aplicação

**Data:** 16/07/2026
**Status:** concluída
**Próxima fase:** Fase 14 — CI/CD

## Decisão de implantação

Foi adotado um modelo híbrido:

- desenvolvimento padrão no WSL: Node.js nativo para API e frontend, PostgreSQL no Docker Desktop;
- homologação local: PostgreSQL, API e frontend no Docker Desktop, acionado pelo terminal WSL;
- VPS: PostgreSQL em container Docker persistente; API Node.js nativa gerenciada pelo PM2; frontend estático publicado pelo Nginx.

Não deve ser instalado um segundo daemon Docker dentro do Ubuntu WSL. O cliente executado no WSL usa a integração do Docker Desktop do Windows.

## Modos do Compose

Somente PostgreSQL, fluxo normal de desenvolvimento:

```bash
docker compose up -d postgres
```

Aplicação completa local:

```bash
docker compose --profile app up -d --build
```

O frontend containerizado fica disponível em `http://127.0.0.1:8080` e a API em `http://127.0.0.1:3000`.

Para parar o profile completo sem remover o volume do PostgreSQL:

```bash
docker compose --profile app down
```

Não use `down -v` em um banco com dados que devam ser preservados.

## Componentes

- `apps/api/Dockerfile`: build multi-stage, Node.js 22 Alpine, dependências de produção e usuário sem privilégios.
- `apps/web/Dockerfile`: build Vite multi-stage e publicação estática por Nginx.
- `apps/web/nginx.conf`: fallback da SPA e proxy interno para `/auth`, `/api` e `/health`.
- `.dockerignore`: impede o envio de segredos, dependências e artefatos ao contexto de build.
- `compose.yaml`: PostgreSQL padrão e profile opcional `app`, com rede privada implícita, volume persistente e health checks.

## Banco de dados

O profile da aplicação não aplica migrations automaticamente. Antes de subir API e frontend sobre um banco novo, execute o fluxo documentado de migrations e validação. Essa separação evita alterações implícitas de schema ao reiniciar containers.

## Evolução da decisão de produção

O Compose completo de produção não será usado. Na VPS, apenas o PostgreSQL será containerizado em um Compose dedicado, enquanto API e frontend permanecerão nativos para integração com a infraestrutura já existente. As imagens da aplicação continuam reproduzíveis para validação local, CI e contingência. A configuração de PostgreSQL, PM2, Nginx, SSL, backup e rollback pertence à Fase 15.

## Validação executada

- `docker compose --profile app config --quiet` aprovado;
- imagens `fincontrol-api:local` e `fincontrol-web:local` construídas;
- containers PostgreSQL, API e web reportaram `healthy`;
- frontend retornou HTTP 200 em `127.0.0.1:8080`;
- proxy Nginx → API → PostgreSQL retornou HTTP 200 em `/health/ready`.
