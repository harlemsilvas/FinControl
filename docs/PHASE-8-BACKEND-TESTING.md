# FinControl — Fase 8: Testes do Backend

**Data:** 16/07/2026
**Status:** concluída
**Próxima fase:** bootstrap do frontend

## Estratégia implementada

A suíte foi separada em dois níveis:

1. `npm test`: testes rápidos, isolados e repetíveis, sem depender do PostgreSQL;
2. `npm run test:integration --workspace @fincontrol/api`: testes explícitos contra o
   PostgreSQL local configurado no `.env`.

Os testes de integração são ignorados na suíte rápida por padrão. A variável interna
`RUN_DATABASE_INTEGRATION=true`, definida pelo próprio script npm, habilita sua execução.

## Cobertura funcional

- configuração e falhas de ambiente;
- criptografia de senhas e tokens;
- login, refresh e auditoria de autenticação;
- autorização por permissão, bypass controlado do Master e sessão revogada;
- health checks e respostas padronizadas;
- contratos HTTP de validação, autenticação, conflito e referência inválida;
- persistência e inativação de dados mestres;
- soma de parcelas, duplicidade e confirmação de pagamento acima do saldo;
- conexão real e isolamento do schema `public`;
- rollback conjunto de operação e auditoria;
- concorrência real sobre uma constraint única;
- persistência e leitura de evento de auditoria confirmado.

## Resultados

```text
npm run lint              PASS
npm run typecheck         PASS
npm test                  PASS — 27 testes; 4 de integração ignorados por desenho
npm run build             PASS
npm run test:integration  PASS — 4 testes PostgreSQL

Total executado           31 testes aprovados
```

Os testes PostgreSQL criam identificadores exclusivos e removem os dados confirmados ao
final. O caso de rollback não deixa dados persistidos. A primeira tentativa dentro do
sandbox restrito recebeu `EPERM` ao abrir `127.0.0.1:5434`; a repetição autorizada com
acesso ao banco local passou integralmente, sem mudança de código.

## Comandos

```bash
npm test
npm run test:integration --workspace @fincontrol/api
npm run lint
npm run typecheck
npm run build
```
