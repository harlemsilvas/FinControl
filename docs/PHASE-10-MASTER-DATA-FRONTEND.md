# FinControl — Fase 10: Frontend dos Cadastros

**Data:** 16/07/2026
**Status:** concluída
**Próxima fase:** frontend de Contas a Pagar

## Autenticação e sessão

- tela de login responsiva com React Hook Form e Zod;
- mensagens de validação e falhas da API;
- access token mantido em memória;
- refresh token mantido em `sessionStorage`;
- restauração de sessão ao recarregar a aplicação;
- rotação automática do token após respostas `401` de requisições autenticadas;
- logout com revogação no backend e limpeza local;
- rotas privadas com redirecionamento para o login.

## Layout e navegação

- shell responsivo para desktop e telas menores;
- identificação do usuário e perfis ativos;
- menu dos cadastros DOM-001 e DOM-003;
- visão geral com atalhos operacionais;
- página 404 preservada.

## Cadastros implementados

O frontend oferece listagem paginada, pesquisa, criação, edição parcial e inativação
para:

1. fornecedores;
2. categorias financeiras;
3. centros de custo;
4. tipos de documento;
5. formas de pagamento;
6. condições de pagamento;
7. bancos;
8. contas bancárias.

Os formulários respeitam os campos e enums dos contratos da API. Relações hierárquicas
e banco da conta usam seletores alimentados pelos endpoints correspondentes. Conflitos,
referências inválidas e demais erros padronizados são apresentados ao usuário. A API
continua sendo a autoridade final de permissões e validações.

## Comunicação local

O Vite encaminha `/auth`, `/api` e `/health` para `127.0.0.1:3000` durante o
desenvolvimento. A URL padrão do cliente é relativa (`VITE_API_URL=/`), compatível com
proxy reverso no ambiente de produção e sem exigir CORS no desenvolvimento local.

## Validações

```text
npm run lint      PASS — API e web
npm run typecheck PASS — API e web
npm test          PASS — 27 testes API + 3 testes web
npm run build     PASS — API e web

Vite production build:
242 módulos transformados
CSS:  19,86 kB (4,71 kB gzip)
JS:  480,78 kB (153,63 kB gzip)
```
