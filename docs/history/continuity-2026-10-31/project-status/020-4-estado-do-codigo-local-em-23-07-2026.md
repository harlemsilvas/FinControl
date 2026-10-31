## 4. Estado do código local em 23/07/2026

- Branch ativa observada durante a retomada: `feature/matriz-filial-xml`.
- Commit funcional principal: `c1fec93 feat(payables): refine recurrence
  lifecycle actions`.
- Commit documental de continuidade: `3fb353e docs: update continuity
  checkpoint`.
- Commit de ajuste de teste pós-validação: `a7b0a06 test(web): align
  recurrence list fixture`.
- Commit de qualidade para preflight de deploy: `c3df287 test: satisfy deploy
  quality checks`.
- Commit documental de preflight: `975ca71 docs: record deploy preflight
  checkpoint`.
- Branch `feature/matriz-filial-xml` publicada em `origin` e configurada com
  upstream.
- Validações executadas antes do commit `c1fec93`:
  - `node ./node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`;
  - `node ./node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit`;
  - `node ./node_modules/vitest/vitest.mjs run apps/api/test/payables-repository.test.ts apps/api/test/http-contract.test.ts apps/web/src/payables/payables-list-page.test.tsx apps/web/src/payables/payable-form-page.test.tsx apps/web/src/payables/recurrences-page.test.tsx`.
- Resultado observado: 5 arquivos de teste e 59 testes aprovados.
- Validação completa executada após `c3df287`:
  - `bash scripts/validate-migrations.sh`: aprovado, 53 migrations ordenadas,
    únicas e transacionais;
  - `npm run lint`: aprovado;
  - `npm run typecheck`: aprovado;
  - `npm test`: aprovado, com API 79 testes aprovados e 5 testes de integração
    opt-in pulados; web 27 testes aprovados;
  - `npm run build`: aprovado, com build da API e build Vite do frontend.
- O worktree contém arquivos paralelos fora do escopo funcional principal
  como `.venv`, `.vscode`, conversões antigas de `.docx`, imagem movida e
  planilha em `docs/`; esses itens devem ser tratados com cuidado antes de
  publicação.
- Próximo checkpoint seguro: decidir se o deploy será manual por SHA da branch
  ou via merge para `main` e workflow `Deploy Production`.

### Incidente de deploy observado

- Durante tentativa de deploy do pacote publicado, a etapa `Verifying database`
  falhou porque o banco não continha:
  - `financeiro.payable_recurrence_statuses`;
  - `financeiro.payable_recurrences`;
  - `financeiro.payable_recurrence_titles`.
- A migration que cria essas tabelas existe no pacote:
  `database/migrations/202607231000_financeiro_create_payable_recurrences.sql`.
- Hipótese operacional principal: o banco/release marcou ou pulou migrations
  antes de aplicar a migration de recorrências, ou o deploy executado na VPS
  usou um estado de release/script diferente do pacote validado.
- Próximo passo seguro: diagnosticar na VPS `schema_versions`, presença física
  da migration na release e `to_regclass` das três tabelas antes de qualquer
  correção manual.

### Correção operacional em 28/07/2026 — saldo inicial

- Identificado erro ao tentar lançar saldo inicial em conta bancária que já
  possui movimento ativo de `Saldo de Caixa`.
- O backend retornava a mensagem técnica em inglês
  `Bank account already has an active cash balance movement`.
- A tela usava campo numérico com spinner para `Valor inicial`, fora do padrão
  monetário definido para o sistema.
- Correção local aplicada:
  - mensagem backend em português para `CASH_BALANCE_ALREADY_EXISTS`;
  - tradução amigável no frontend para o mesmo código;
  - `MoneyField` da tela de pagamentos passa a usar `CurrencyInput`;
  - testes de tesouraria e pagamentos ampliados para cobrir o comportamento.
- Decisão complementar: enquanto a Conciliação Bancária não estiver
  implementada, a tela de pagamentos terá a ação provisória `Entrada de caixa`,
  registrando movimento `MANUAL_ADJUSTMENT` de entrada para alimentar o saldo
  oficial e permitir pagamentos operacionais.
- Essa ação deve ser reavaliada/desabilitada quando a rotina de Conciliação
  Bancária entrar no sistema.
