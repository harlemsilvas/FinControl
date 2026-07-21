# FinControl API

Fundação técnica da API do FinControl, construída com Node.js 22, TypeScript,
Fastify e PostgreSQL.

## Executar

Na raiz do repositório:

```bash
npm install
npm run dev
```

Por padrão, a API escuta em `http://127.0.0.1:3000`.

## Health checks

- `GET /health/live`: confirma que o processo HTTP está respondendo;
- `GET /health/ready`: confirma que a API alcança o PostgreSQL.

## Qualidade

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Estrutura

```text
src/
├── common/          # erros e componentes compartilhados
├── config/          # configuração validada por ambiente
├── domains/         # módulos de domínio
├── infrastructure/  # PostgreSQL e integrações técnicas
└── presentation/    # servidor e camada HTTP
```

As migrations permanecem externas e imutáveis em `database/migrations`.

