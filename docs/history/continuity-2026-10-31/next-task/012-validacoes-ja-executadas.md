## Validações já executadas

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm test`: aprovado, com API 79 testes aprovados e 5 testes de integração
  opt-in pulados; web 27 testes aprovados.
- `npm run build`: aprovado.
- `bash scripts/validate-migrations.sh`: aprovado, 53 migrations ordenadas,
  únicas e transacionais.
- Validação focada em 28/07/2026:
  - `node ../../node_modules/vitest/vitest.mjs run test/treasury-repository.test.ts`: aprovado, 6 testes;
  - `node ../../node_modules/vitest/vitest.mjs run src/payables/payments-page.test.tsx`: aprovado, 7 testes;
  - `npm run typecheck`: aprovado;
  - `npm run lint`: aprovado;
  - `npm run build`: aprovado.
- Validação focada da listagem em 28/07/2026:
  - `node ../../node_modules/vitest/vitest.mjs run src/payables/payables-list-page.test.tsx`: aprovado, 5 testes;
  - `node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` em `apps/web`: aprovado.
- Validação geral após ajuste da listagem em 28/07/2026:
  - `npm run typecheck`: aprovado;
  - `npm run lint`: aprovado;
  - `npm run build`: aprovado.
- Validação focada das correções operacionais em 28/07/2026:
  - `node ../../node_modules/vitest/vitest.mjs run test/payables-repository.test.ts`: aprovado, 36 testes;
  - `node ../../node_modules/vitest/vitest.mjs run src/payables/payments-page.test.tsx src/master-data/master-data-page.test.tsx src/payables/payable-form-page.test.tsx`: aprovado, 12 testes;
  - `node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` em `apps/web`: aprovado.
- Validação geral após correções operacionais em 28/07/2026:
  - `npm run typecheck`: aprovado;
  - `npm run lint`: aprovado;
  - `npm run build`: aprovado.
- Validação do refinamento Agenda → Pagamentos em 28/07/2026:
  - `node ../../node_modules/vitest/vitest.mjs run src/payables/payments-page.test.tsx`: aprovado, 8 testes;
  - `node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` em `apps/web`: aprovado;
  - `npm run typecheck`: aprovado;
  - `npm run lint`: aprovado;
  - `npm run build`: aprovado.
- Validação inicial do preflight automatizado em 28/07/2026:
  - `./Checar_alteracao.sh`: `STATUS: OK`, log gerado em
    `logs/alteracoes/checar_alteracao_20260728_151414.log`;
  - como o status retornou `OK`, o log não foi analisado.
- Validação focada do ajuste de fixture do teste de recorrências em 28/07/2026:
  - `node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` em
    `apps/api`: aprovado;
  - `node ../../node_modules/vitest/vitest.mjs run test/integration/recurrences.integration.test.ts`:
    aprovado como suite opt-in pulada sem `RUN_DATABASE_INTEGRATION=true`;
  - validação real com PostgreSQL limpo fica a cargo do CI após push.
- Validação focada do bloqueio de campos de cobrança na edição em 28/07/2026:
  - `node ../../node_modules/vitest/vitest.mjs run src/payables/payable-form-page.test.tsx`:
    aprovado, 3 testes;
  - `node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` em
    `apps/web`: aprovado.
- Validação focada dos filtros explícitos por empresa em 29/07/2026:
  - `node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` em
    `apps/web`: aprovado;
  - `node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` em
    `apps/api`: aprovado;
  - `node ../../node_modules/vitest/vitest.mjs run src/payables/payables-list-page.test.tsx src/intelligence/agenda-page.test.tsx`:
    aprovado, 7 testes.
  - `./Checar_alteracao.sh`: `STATUS: OK`, log gerado em
    `logs/alteracoes/checar_alteracao_20260729_081219.log`;
  - como o status retornou `OK`, o log não foi analisado.
- Validação CI após push em 29/07/2026:
  - commit `4808847 feat(finance): add explicit company filters` enviado para
    `origin/feature/matriz-filial-xml`;
  - GitHub Actions run `30454966828`: aprovado;
  - job `PostgreSQL migrations and integration`: aprovado, incluindo
    migrations, verificação de estrutura, fluxo financeiro e testes de
    integração API;
  - job `Quality and build`: aprovado, incluindo lint, typecheck, testes,
    build e validação de migrations;
  - job `Container images`: aprovado.
- Validação focada inicial do MVP de Usuários em 29/07/2026:
  - `bash scripts/validate-migrations.sh`: aprovado, 54 migrations;
  - `node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` em
    `apps/api`: aprovado;
  - `node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` em
    `apps/web`: aprovado;
  - `node ../../node_modules/vitest/vitest.mjs run test/users-repository.test.ts test/http-contract.test.ts`:
    aprovado, 17 testes;
  - `node ../../node_modules/vitest/vitest.mjs run src/administration/users-page.test.tsx src/app/app.test.tsx`:
    aprovado, 2 testes.
  - `./Checar_alteracao.sh`: `STATUS: OK`, log gerado em
    `logs/alteracoes/checar_alteracao_20260729_110537.log`;
  - como o status retornou `OK`, o log não foi analisado.
- Validação focada do favicon e filtro `Todos` em 29/07/2026:
  - `node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` em
    `apps/web`: aprovado;
  - `node ../../node_modules/vitest/vitest.mjs run src/payables/payables-list-page.test.tsx`:
    aprovado, 7 testes.
  - `./Checar_alteracao.sh`: `STATUS: OK`, log gerado em
    `logs/alteracoes/checar_alteracao_20260729_122159.log`;
  - como o status retornou `OK`, o log não foi analisado.
- Validação focada do refinamento de usuários em 29/07/2026:
  - `node ../../node_modules/vitest/vitest.mjs run test/auth-service.test.ts test/users-repository.test.ts test/http-contract.test.ts`:
    aprovado, 23 testes;
  - `node ../../node_modules/vitest/vitest.mjs run src/administration/users-page.test.tsx src/pages/login-page.test.tsx`:
    aprovado, 4 testes;
  - `bash scripts/validate-migrations.sh`: aprovado, 55 migrations ordenadas,
    únicas e transacionais;
  - `node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` em
    `apps/api`: aprovado;
  - `node ../../node_modules/typescript/bin/tsc -p tsconfig.json --noEmit` em
    `apps/web`: aprovado.
  - `npm run lint`: aprovado;
  - `npm test`: aprovado, com API 87 testes aprovados e 5 testes de integração
    opt-in pulados; web 39 testes aprovados;
  - `npm run build`: aprovado;
  - `./Checar_alteracao.sh`: `STATUS: OK`, log final gerado em
    `logs/alteracoes/checar_alteracao_20260729_161110.log`;
  - como o status retornou `OK`, o log não foi analisado.
- Validação focada do envio SMTP e logo do login em 29/07/2026:
  - `node ../../node_modules/vitest/vitest.mjs run test/auth-service.test.ts test/environment.test.ts test/http-contract.test.ts`:
    aprovado, 26 testes;
  - `node ../../node_modules/vitest/vitest.mjs run src/pages/login-page.test.tsx src/app/app.test.tsx`:
    aprovado, 2 testes;
  - `npm run lint`: aprovado;
  - `npm run typecheck`: aprovado;
  - `npm test`: aprovado, com API 90 testes aprovados e 5 testes de integração
    opt-in pulados; web 39 testes aprovados;
  - `npm run build`: aprovado.
  - `./Checar_alteracao.sh`: `STATUS: OK`, log gerado em
    `logs/alteracoes/checar_alteracao_20260729_175516.log`;
  - como o status retornou `OK`, o log não foi analisado.
- Validação da correção de CI em 01/08/2026:
  - `npm test --workspace @fincontrol/api -- payables-repository.test.ts`:
    aprovado, 38 testes;
  - `npm test --workspace @fincontrol/api`: aprovado, 95 testes e 5 testes de
    integração opt-in pulados.
- Validação focada do pacote de versionamento/cache em 01/08/2026:
  - `npm test --workspace @fincontrol/web -- app.test.tsx`: aprovado, 1 teste;
  - `npm run typecheck --workspace @fincontrol/web`: aprovado;
  - `npm run lint --workspace @fincontrol/web`: aprovado;
  - `VITE_APP_VERSION=0.1.0 VITE_GIT_SHA=1234567890abcdef VITE_BUILD_TIME=2026-08-01T15:30:00Z VITE_RELEASE_ID=1234567890ab npm run build --workspace @fincontrol/web`:
    aprovado.
- Validação focada do pacote de backup/restore em 01/08/2026:
  - `bash -n deploy/vps/bin/backup-db`: aprovado;
  - `bash -n deploy/vps/bin/restore-db`: aprovado;
  - `bash -n deploy/vps/bin/install-control-plane`: aprovado;
  - `bash -n deploy/vps/bin/deploy`: aprovado.
- Validação focada da gestão web de backups em 01/08/2026:
  - `bash scripts/validate-migrations.sh`: aprovado, 57 migrations;
  - `npm test --workspace @fincontrol/api -- http-contract.test.ts environment.test.ts health.test.ts`:
    aprovado, 26 testes;
  - `npm test --workspace @fincontrol/web -- backups-page.test.tsx app.test.tsx`:
    aprovado, 2 testes;
  - `npm run typecheck --workspace @fincontrol/api`: aprovado;
  - `npm run typecheck --workspace @fincontrol/web`: aprovado;
  - `npm run lint --workspace @fincontrol/api`: aprovado;
  - `npm run lint --workspace @fincontrol/web`: aprovado.
- melhoria local do script de validação em 15/08/2026:
  - `Checar_alteracao.sh` passou a exibir progresso no terminal por etapa com
    `RUN`, `OK`/`FAIL`, duração e caminho do log;
  - validações demoradas foram divididas em blocos menores por workspace e por
    domínio web, reduzindo períodos sem status visível;
  - etapas npm passaram a usar timeout configurável por
    `CHECK_STEP_TIMEOUT`, com padrão de `300s`;
  - `./Checar_alteracao.sh`: `STATUS: OK`, log gerado em
    `logs/alteracoes/checar_alteracao_20260815_161149.log`.
- Validação focada da correção de recorrências em 10/08/2026:
  - `npm test --workspace @fincontrol/api -- payables-repository.test.ts`:
    aprovado, 42 testes;
  - `npm test --workspace @fincontrol/web -- recurrences-page.test.tsx`:
    aprovado, 4 testes;
  - `npm run typecheck --workspace @fincontrol/api`: aprovado;
  - `npm run typecheck --workspace @fincontrol/web`: aprovado.
- Validação focada das listagens operacionais em 10/08/2026:
  - `npm test --workspace @fincontrol/api -- payables-repository.test.ts`:
    aprovado, 42 testes;
  - `npm test --workspace @fincontrol/web -- payables-list-page.test.tsx payments-page.test.tsx`:
    aprovado, 20 testes;
  - `npm run typecheck --workspace @fincontrol/api` e
    `npm run typecheck --workspace @fincontrol/web` foram iniciados, mas
    interrompidos por demora excessiva sem saída de erro no WSL; rodar
    `./Checar_alteracao.sh` antes de commit/deploy.
- Validação completa do pacote de correções operacionais em 11/08/2026:
  - `./Checar_alteracao.sh` foi iniciado, mas ficou silencioso por tempo
    excessivo e foi interrompido manualmente sem gerar diagnóstico útil;
  - validação equivalente executada por comandos separados:
  - `git diff --check`: aprovado;
  - `bash scripts/validate-migrations.sh`: aprovado, 57 migrations;
  - `npm run typecheck`: aprovado para API e web;
  - `npm run lint`: aprovado para API e web;
  - `npm test`: aprovado, com API 101 testes aprovados e 5 integrações opt-in
    puladas; web 50 testes aprovados;
  - `npm run build`: aprovado para API e web.
- Validação focada das correções operacionais em 15/08/2026:
  - datas de recorrência agora limitam ano a quatro dígitos e validam antes de
    salvar/previsualizar;
  - geração por quantidade em recorrências avisa quando o limite operacional da
    janela reduz a quantidade solicitada;
  - edição de título com pagamento efetivo passou a bloquear somente alterações
    financeiras reais, permitindo salvar dados não financeiros quando os valores
    protegidos forem reenviados sem mudança;
  - baixa de pagamento e transferência agora validam saldo bancário pela data do
    movimento, não pelo saldo atual da conta;
  - `GET /api/v1/bank-account-balances` aceita `asOfDate` para consulta
    temporal do saldo;
  - tela de pagamentos exibe e recarrega o saldo da conta na data informada na
    baixa;
  - `npm test --workspace @fincontrol/api -- treasury-repository.test.ts payables-repository.test.ts`:
    aprovado, 52 testes;
  - `npm test --workspace @fincontrol/web -- payments-page.test.tsx`:
    aprovado, 12 testes;
  - `npm test --workspace @fincontrol/api -- payables-repository.test.ts`:
    aprovado, 45 testes apos ajuste de lint;
  - `npm run typecheck --workspace @fincontrol/api`: aprovado;
  - `npm run typecheck --workspace @fincontrol/web`: aprovado;
  - `npm run lint --workspace @fincontrol/api`: aprovado;
  - `npm run lint --workspace @fincontrol/web`: aprovado.
- Correção local em 25/08/2026 para estorno de pagamentos:
  - estorno de pagamento passa a reforçar explicitamente o recálculo de saldo e
    status da parcela e do título após marcar o pagamento como `REVERSED`;
  - a parcela estornada deve voltar para a fila de `Baixa de Pagamentos` quando
    ainda houver saldo aberto;
  - o histórico `Pagamentos realizados` passa a consultar `Pagamentos efetivos`
    por padrão, mantendo `Estornados` e `Todos` como filtros explícitos para
    auditoria;
  - refinamento posterior: a API de `GET /api/v1/payments` também assume
    `EFFECTIVE` por padrão quando `status` não é informado, evitando que
    frontend/cache/chamadas antigas misturem estornados na visão operacional;
    a opção `Todos` passa a enviar `status=ALL` explicitamente;
  - testes focados foram atualizados para cobrir recálculo no estorno e filtro
    explícito de histórico;
  - `node_modules` local foi restaurado com `npm ci`, corrigindo links
    quebrados de `vitest` e `tsc`;
  - validação focada executada:
    `npm test --workspace @fincontrol/api -- payables-repository.test.ts`
    aprovado, 47 testes;
  - validação focada executada:
    `npm test --workspace @fincontrol/web -- payments-page.test.tsx`
    aprovado, 13 testes;
  - validação focada anterior:
    `npm test --workspace @fincontrol/web -- payments-page.test.tsx recurrences-page.test.tsx payable-form-page.test.tsx`
    aprovado, 25 testes;
  - `npm run typecheck --workspace @fincontrol/api` e
    `npm run typecheck --workspace @fincontrol/web` aprovados.
- Correções locais em 25/08/2026 para formulários financeiros:
  - campos `Data inicial` e `Data final` da criação de recorrência deixaram de
    usar `type="date"` controlado, que apagava a digitação em alguns
    navegadores, e passaram a usar máscara `dd/mm/aaaa` com conversão interna
    para ISO somente quando a data está completa e válida;
  - tela `Nova Conta a Pagar` recuperou o controle de parcelamento na aba
    `Dados da Conta`, com `Tipo de cobrança`, `Nº de parcelas` e
    `Dia de vencimento`;
  - geração automática de parcelas na criação manual volta a responder à
    alteração da quantidade mesmo quando já existe mais de uma parcela
    preparada.
- Refinamento local em 25/08/2026 para saldo histórico na baixa:
  - mantida a regra de saldo temporal: pagamento com data retroativa só pode
    usar saldo existente naquela data ou antes;
  - quando a baixa encontra saldo insuficiente na data informada, a tela passa
    a oferecer o atalho `Lançar entrada nessa data`, abrindo `Entrada de caixa`
    já com conta bancária, data do pagamento, referência e observação
    preenchidas;
  - selects de `Entrada de caixa` e `Saldo inicial` passam a exibir
    `saldo atual`, diferenciando esse saldo do saldo histórico usado na baixa;
  - validação focada executada:
    `npm test --workspace @fincontrol/web -- payments-page.test.tsx`
    aprovado, 14 testes.
- Correção local em 25/08/2026 para edição de quantidade de parcelas:
  - títulos já salvos, inclusive gerados de XML sem boletos detalhados, passam
    a permitir adicionar parcelas na aba `Parcelas`;
  - a persistência das parcelas em edição passou a usar sincronização atômica no
    backend, evitando erro intermediário de soma quando uma parcela original é
    dividida em duas ou mais;
  - parcelas com pagamento efetivo continuam protegidas contra alteração de
    valor, vencimento e forma de pagamento;
  - validação focada executada:
    `npm test --workspace @fincontrol/api -- payables-repository.test.ts`
    aprovado, 48 testes;
  - validação focada executada:
    `npm test --workspace @fincontrol/web -- payable-form-page.test.tsx`
    aprovado, 6 testes;
  - `npm run typecheck --workspace @fincontrol/api` e
    `npm run typecheck --workspace @fincontrol/web` aprovados.
