# FinControl — Fase 9: Fundação do Frontend

**Data:** 16/07/2026
**Status:** concluída
**Próxima fase:** frontend dos cadastros

## Fundação criada

Foi criado o workspace `apps/web` com:

- React 19.2 e React DOM;
- Vite 7.3;
- TypeScript 5.9 em modo estrito;
- Tailwind CSS 4 integrado ao Vite;
- React Router 7;
- TanStack Query para estado de servidor;
- Axios com base URL, timeout, bearer token e erros padronizados;
- React Hook Form, Zod e resolvers para formulários futuros;
- armazenamento de sessão com access token em memória e refresh token em `sessionStorage`;
- design system inicial com `Button`, `Input` e `Card` acessíveis;
- shell responsivo, rota inicial e página 404;
- Vitest, Testing Library e ambiente jsdom.

A Fase 9 não implementa telas funcionais de login ou cadastros. Esses itens permanecem
na Fase 10, conforme a ordem aprovada.

## Organização

```text
apps/web/src/
├── api/
├── app/
├── auth/
├── components/ui/
├── config/
├── layouts/
├── pages/
├── state/
└── test/
```

## Comandos

```bash
npm run dev:web
npm run test --workspace @fincontrol/web
npm run typecheck --workspace @fincontrol/web
npm run build --workspace @fincontrol/web
npm run preview:web
```

A API é configurada por `VITE_API_URL` no ambiente do workspace web.

## Validações

```text
npm install       PASS — 157 pacotes adicionados, 0 vulnerabilidades
npm run lint      PASS — API e web
npm run typecheck PASS — API e web
npm test          PASS — 27 testes API + 1 teste web
npm run build     PASS — API e web

Vite production build:
229 módulos transformados
CSS:  13,29 kB (3,56 kB gzip)
JS:  409,17 kB (130,78 kB gzip)
```
