# FinControl — Fase 4: Fundação Técnica do Backend

**Data:** 16/07/2026  
**Status:** concluída para o escopo de bootstrap técnico  
**Próxima fase:** autenticação e autorização

## Escopo implementado

- workspace npm com suporte a aplicações em `apps/*`;
- Node.js 22 e TypeScript em modo estrito;
- API Fastify modular em `apps/api`;
- configuração por variáveis de ambiente validada com Zod;
- pool PostgreSQL com limites e timeouts configuráveis;
- logs JSON estruturados e campos sensíveis redigidos;
- tratamento padronizado de erros com identificador da requisição;
- encerramento gracioso em `SIGINT` e `SIGTERM`;
- health check de processo em `GET /health/live`;
- readiness check PostgreSQL em `GET /health/ready`;
- resposta padronizada para rotas inexistentes;
- lint, typecheck, testes e build.

Nenhuma migration existente foi alterada. Nenhum endpoint funcional de
autenticação, cadastro ou financeiro foi antecipado.

## Validações executadas

```text
npm install       PASS — 238 pacotes auditados, 0 vulnerabilidades
npm run typecheck PASS
npm run lint      PASS
npm test          PASS — 2 arquivos, 6 testes
npm run build     PASS
```

Validação real com a API compilada:

```text
GET /health/live  200 — processo saudável
GET /health/ready 200 — PostgreSQL fincontrol acessível
GET /missing      404 — erro padronizado
```

## Decisões técnicas do bootstrap

- Fastify foi escolhido entre as opções Express/Fastify aprovadas por oferecer
  logging estruturado e injeção HTTP para testes sem alterar a arquitetura de
  domínios definida.
- O pool `pg` pertence à camada de infraestrutura.
- Rotas recebem abstrações de infraestrutura, permitindo testes sem banco real.
- Liveness não consulta dependências; readiness valida o PostgreSQL.
- Configuração inválida impede a inicialização da aplicação.

## Comandos

Na raiz do projeto:

```bash
npm run dev
npm run typecheck
npm run lint
npm test
npm run build
npm start
```

## Próximo marco

Fase 5 — Autenticação e autorização:

1. confirmar contratos e política de tokens;
2. implementar hash seguro de senha;
3. implementar login e refresh token;
4. aplicar perfis e permissões;
5. criar Operador Master inicial de forma controlada;
6. auditar login e operações críticas;
7. adicionar testes de autorização e integração.
