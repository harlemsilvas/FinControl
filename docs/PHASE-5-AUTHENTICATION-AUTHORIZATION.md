# FinControl — Fase 5: Autenticação e Autorização

**Data:** 16/07/2026
**Status:** implementada; validação automatizada concluída

## Contratos implementados

- `POST /auth/login`: autentica por e-mail e senha e cria uma sessão.
- `POST /auth/refresh`: rotaciona o refresh token; o token anterior é revogado.
- `POST /auth/logout`: revoga a sessão autenticada.
- `GET /auth/me`: retorna identidade, perfis e permissões atuais.
- Access token JWT HS256 com validade padrão de 15 minutos, emissor e audiência validados.
- Refresh token opaco aleatório, armazenado exclusivamente como SHA-256 e válido por 30 dias.
- Senhas armazenadas com `scrypt`, salt aleatório e comparação resistente a timing.
- Sessões e usuários inativos são rejeitados em toda requisição autenticada.
- Operador Master ignora a matriz de permissões; demais usuários exigem permissão por ação.
- Login, falha de login, refresh, falha de refresh, logout e bootstrap são auditados.

## Banco de dados

A migration nova `202607162290_administracao_create_auth_sessions.sql` cria
`administracao.auth_sessions`. Ela foi aplicada com sucesso no PostgreSQL 17 local do
Docker Desktop. Nenhuma migration aplicada anteriormente foi alterada.

## Bootstrap controlado

Defina temporariamente `BOOTSTRAP_MASTER_NAME`, `BOOTSTRAP_MASTER_EMAIL` e
`BOOTSTRAP_MASTER_PASSWORD` no `.env` e execute:

```bash
npm run bootstrap:master --workspace @fincontrol/api
```

O comando é transacional, recusa a execução quando já existe Master ativo, associa o
perfil `MASTER` e registra auditoria. Remova a senha de bootstrap do ambiente depois.

## Política operacional

- Use um segredo de access token diferente e aleatório em cada ambiente.
- A troca do segredo invalida todos os access tokens emitidos.
- Logout e rotação invalidam imediatamente a sessão/token anterior.
- Endpoints de domínios futuros devem compor `authenticate` e `requirePermission`.

## Validações executadas

```text
npm run lint      PASS
npm run typecheck PASS
npm test          PASS — 4 arquivos, 12 testes
npm run build     PASS
migration 2290    PASS — administracao.auth_sessions criada
verify_database   PASS
```
