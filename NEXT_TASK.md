# FinControl — Next Task

**Última atualização:** 31/07/2026
**Status:** refinamento operacional da tela Visão Geral em validação local
**Contexto:** continuidade pós-Fase 16, já com multiempresa, XML operacional,
pagamentos/tesouraria e recorrências implementados localmente

## Objetivo

Validar e publicar o refinamento do MVP de `Configurações > Usuários`, agora
com recuperação/redefinição de senha, envio SMTP real a partir da outbox,
bloqueio de autoalterações perigosas e identidade visual alinhada na tela de
login, incluindo a correção operacional detectada em produção no cadastro de
fornecedores.

## Escopo desta tarefa

- manter como checkpoints:
  - `c1fec93 feat(payables): refine recurrence lifecycle actions`;
  - `3fb353e docs: update continuity checkpoint`;
  - `a7b0a06 test(web): align recurrence list fixture`;
  - `c3df287 test: satisfy deploy quality checks`;
  - `975ca71 docs: record deploy preflight checkpoint`;
- manter fora do pacote os arquivos locais/artefatos ainda não conferidos;
- branch `feature/matriz-filial-xml` enviada ao GitHub e com upstream
  configurado;
- correção local aplicada para saldo inicial:
  - campo `Valor inicial` usando máscara de moeda;
  - mensagem amigável quando a conta já possui saldo inicial ativo;
- ação local `Entrada de caixa` adicionada como ajuste manual provisório para
  alimentar o saldo oficial até a Conciliação Bancária;
- ajuste local da listagem de payables aplicado em 28/07/2026:
  - tela e menu renomeados para `Notas Fiscais e Contas`;
  - painel de totais/cards com opção de exibir e esconder;
  - botão `Calendário` direcionando para a tela `Agenda`;
  - filtro padrão de status em `Notas ativas` (`OPEN`);
  - coluna inicial de seleção removida enquanto não houver seleção em lote;
- correções locais aplicadas em 28/07/2026:
  - clique em item da Agenda abre `/payments` filtrado pela data de vencimento
    e status `OPEN`, sem abrir automaticamente o modal de baixa;
  - a baixa continua sendo iniciada manualmente pelo botão `Baixar` da linha;
  - em 31/07/2026, a Agenda teve controles redundantes removidos:
    - botão `Hoje`;
    - campo manual de data de referência;
    - rodapé `Total previsto no período`;
  - indicador `+N contas` do calendário passa a abrir painel lateral com todas
    as contas do dia, preservando os links para baixa filtrada;
  - tela `Baixa de Pagamentos` inicia sempre com status `OPEN`;
  - endpoint de parcelas elegíveis aceita `payableTitleId` e `installmentId`;
  - cadastro de contas bancárias busca detalhe antes de preencher edição,
    corrigindo `Empresa` e `Banco` vazios na primeira abertura;
  - campo `Fornecedor` da nova conta ocupa a linha inteira em telas grandes
    para evitar estouro/truncamento visual;
  - edição de conta a pagar bloqueia `Vencimento` e `Valor` na aba
    `Dados da Conta`, direcionando a alteração efetiva para a aba `Parcelas`;
- ajuste local aplicado em 28/07/2026 para vínculo multiempresa em contas
  manuais:
  - `Empresa` obrigatória no cadastro manual de conta;
  - API exige e valida empresa ativa para novos títulos manuais;
  - edição pode corrigir empresa enquanto não houver pagamento efetivo;
  - duplicidade manual passa a ser avaliada dentro da mesma empresa;
- ajuste local aplicado em 29/07/2026 para filtros explícitos por empresa:
  - Dashboard passa a ter seletor `Empresa` com padrão `Todas as empresas`;
  - `Notas Fiscais e Contas` passa a ter filtro `Empresa` e exibir a empresa
    abaixo do fornecedor/descrição;
  - Agenda Financeira passa a ter filtro `Empresa`, exibir empresa no item do
    calendário e preservar o filtro ao navegar para `Baixa de Pagamentos`;
  - APIs `/api/v1/dashboard`, `/api/v1/agenda` e `/api/v1/payables` passam a
    aceitar `companyId` opcional;
  - Swagger/OpenAPI passa a documentar `companyId` nesses endpoints;
- ajuste local em andamento em 29/07/2026 para usuários e acessos:
  - migration nova cria permissão `USER_MANAGE` e associa ao perfil `MASTER`;
  - API `/api/v1/users` permite listar, criar, editar, inativar e reativar
    usuários;
  - API `/api/v1/roles` lista perfis ativos para seleção;
  - usuários não-master exigem ao menos uma empresa vinculada;
  - tela `/users` permite informar dados básicos, senha inicial/troca de senha,
    perfis, empresas permitidas, empresa padrão e escopo de acesso;
  - edição granular de permissões por usuário permanece fora do MVP.
- refinamento local aplicado em 29/07/2026 para senha e autoproteção de
  usuários:
  - migration nova cria `administracao.password_reset_tokens`;
  - migration nova cria `administracao.email_outbox` para registrar e-mails
    pendentes de recuperação até configuração SMTP real;
  - API pública recebe `POST /auth/password/forgot` e
    `POST /auth/password/reset`;
  - API administrativa recebe `POST /api/v1/users/:id/password-reset`;
  - tokens de recuperação são opacos e persistidos somente como SHA-256;
  - troca por token revoga sessões ativas do usuário após redefinir a senha;
  - tela de login recebe `Esqueci minha senha`;
  - rota `/password-reset` conclui a troca com token;
  - tela `/users` bloqueia edição própria de situação, Master, perfis e
    empresas e omite esses campos do payload quando o usuário edita a si mesmo;
  - backend bloqueia autoalteração de perfil/empresa/Master mesmo se a UI for
    contornada.
- refinamento local aplicado em 29/07/2026 para envio real de e-mail:
  - adicionada dependência `nodemailer` na API;
  - environment passa a aceitar `SMTP_ENABLED`, `SMTP_HOST`, `SMTP_PORT`,
    `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL` e
    `SMTP_FROM_NAME`;
  - quando `SMTP_ENABLED=true`, a recuperação de senha envia o e-mail
    imediatamente e marca `administracao.email_outbox` como `SENT`;
  - se o SMTP falhar, a outbox é marcada como `FAILED` com motivo registrado;
  - quando `SMTP_ENABLED=false`, o registro permanece `PENDING`.
- refinamento local aplicado em 29/07/2026 para login:
  - o bloco textual `FC` foi substituído pelo marcador visual de três barras do
    FinControl, compartilhado com o menu lateral.
- ajuste local em 29/07/2026 para experiência visual/listagem:
  - criado `apps/web/public/favicon.svg` com o marcador visual do menu lateral;
  - `apps/web/index.html` passa a apontar para o favicon SVG;
  - filtro de status em `Notas Fiscais e Contas` passa a incluir `Todos`,
    enviando status indefinido para listar todas as situações;
- correção local em 30/07/2026 para fornecedores:
  - criação de fornecedor passa a preencher defaults `ACTIVE` e `SUPPLIER` na
    API quando `statusId` ou `supplierCategoryId` não vierem no payload;
  - erro PostgreSQL `23502` passa a ser convertido em 400 de validação, evitando
    retorno genérico 500;
  - tela de fornecedores passa a sugerir categoria padrão `Fornecedor` e exigir
    preenchimento de `Categoria`;
  - campo `Cidade` passa a aceitar texto digitável com sugestões, e a API cria
    automaticamente a cidade em `cadastros.cities` quando ela ainda não existir
    para o estado selecionado;
  - endereço do fornecedor passa a exibir `Estado` antes de `Cidade`, com estado
    pelo nome, cidade cadastrada filtrada pela UF e campo próprio para nova
    cidade;
  - consulta de cidades em fornecedores passa a usar `pageSize=100`, respeitando
    o contrato da API e evitando `citiesQuery` vazia por erro 400;
  - categoria `PARTICULAR` adicionada por migration nova, sem alterar a
    migration original já aplicada de categorias de fornecedor;
  - mensagem de credenciais inválidas do login passa a ser exibida em português;
- refinamento local em 31/07/2026 para `Baixa de Pagamentos`:
  - API de parcelas elegíveis calcula atraso dinamicamente por `due_date <
    CURRENT_DATE`, evitando que boleto manual ou recorrente vencido permaneça
    invisível no filtro `Atrasados` por ainda estar gravado como `OPEN`;
  - tela substitui o card `Pagamentos parciais` por `Pagamentos efetuados`;
  - card `Pagamentos efetuados` passa a exibir o valor monetário total dos
    pagamentos filtrados, e não a quantidade de pagamentos;
  - filtro operacional passa a oferecer `Abertos`, `Atrasados`, `Pagos` e
    `Todos`, sem expor `Parcialmente pago` como opção principal;
  - filtro de fornecedor passa a ser campo de busca com sugestões em vez de
    select fixo;
  - tag de status do histórico de pagamentos fica em coluna própria antes do
    valor, evitando sobreposição sobre o montante pago;
- refinamento local em 31/07/2026 para `Visão geral`:
  - card `Vence hoje` passa a consumir `summary.today` e
    `summary.todayCount` retornados pela API `/api/v1/dashboard`;
  - endpoint `/api/v1/dashboard` calcula total monetário e quantidade de
    títulos que vencem na data atual dentro dos filtros aplicados;
  - filtros `Vencimento inicial` e `Vencimento final` foram substituídos por
    `Mês inicial` e `Mês final`, mantendo conversão interna para datas ISO;
  - filtros receberam ajuste responsivo para reduzir estouro ou
    desaparecimento em telas redimensionadas;
  - `docs/002-correcoes-visao_geral.md` registra o pacote aplicado.
- rotina de checagem final criada em 28/07/2026:
  - `./Checar_alteracao.sh` executa validações completas e gera log em
    `logs/alteracoes/`;
  - o log só deve ser analisado quando o script retornar `STATUS: FAIL`;
  - alias disponível: `npm run check:alteracao`;
  - após `STATUS: OK`, criar commit local personalizado;
  - push para servidor/remoto passa a depender de validação/autorização do
    usuário;
- ajuste local aplicado em 28/07/2026 no deploy nativo da VPS:
  - `Deploy VPS Native` resolve branch, tag, SHA completo ou SHA curto antes do
    checkout efetivo;
  - workflows GitHub usam actions com runtime Node 24 e continuam executando o
    projeto com Node 22;
  - `/opt/fincontrol/bin/deploy` validará Node.js 22 e npm em
    `/opt/fincontrol/.local/bin`;
  - rollback usa o PATH isolado do usuário `fincontrol`;
- ajuste local aplicado em 28/07/2026 para o CI de banco:
  - `test_financial_flow.sql` passou a informar status e categoria obrigatórios
    ao criar fornecedor de teste;
  - teste opt-in de integração de recorrências passou a criar fixtures próprias
    em transação com rollback, sem depender de cadastros locais pré-existentes;
  - referências seedadas por migration são validadas explicitamente antes do
    fluxo de recorrência, evitando UUID `"undefined"` no PostgreSQL;
- preparar o pacote para deploy controlado ou para uso do workflow
  `Deploy Production`, conforme decisão operacional.

## Passos

1. Manter fora do pacote, salvo decisão explícita:
   - `.venv`;
   - `.vscode/settings.json`;
   - arquivos `.docx` removidos/conversões não conferidas;
   - planilhas ou imagens não essenciais ao deploy.
2. Validar Administração de Usuários no backend com typecheck e testes focados.
3. Validar tela `/users`, login e `/password-reset` com teste focado,
   typecheck, lint e build.
4. Validar criação de fornecedor sem categoria explícita/status explícito em
   testes focados e garantir retorno HTTP 400 para violações obrigatórias não
   previstas.
5. Validar criação/edição de fornecedor com cidade digitada fora da lista,
   garantindo criação/vínculo em `cadastros.cities`.
6. Atualizar documentação viva (`PROJECT_STATUS.md`, `NEXT_TASK.md`,
   checklist/backlog multiempresa e docs de autenticação/autorização).
7. Validar o pacote com `./Checar_alteracao.sh`.
8. Criar commit local personalizado após `STATUS: OK`.
9. Fazer push somente quando o usuário validar/autorizá-lo.
10. Se o script retornar `STATUS: FAIL`, analisar o log indicado e voltar aos
   testes/correções normais.
11. Na VPS, verificar se a release usada contém
   `database/migrations/202607231000_financeiro_create_payable_recurrences.sql`.
12. Na VPS, consultar `administracao.schema_versions` para as versões
   `202607231000` e `202607231010`.
13. Na VPS, consultar `to_regclass` das três tabelas de recorrência.
14. Se `schema_versions` não tiver as versões novas e as tabelas não existirem,
   aplicar as duas migrations de recorrência a partir da release publicada e
   registrar checksums.
15. Se `schema_versions` tiver a versão `202607231000`, mas as tabelas não
   existirem, remover apenas esse registro inconsistente depois de backup lógico
   ou aplicar reparo manual com registro correto.
16. Depois de corrigir o banco, repetir o deploy/verify.
17. Só então decidir entre:
   - deploy controlado manual da branch/commit;
   - ou publicação via workflow `Deploy Production`, se `main` estiver pronta.
18. Se usar workflow, abrir/mergear PR para `main` antes do acionamento manual,
   pois o workflow atual faz checkout fixo de `main`.
19. Se usar deploy manual, executar `/opt/fincontrol/bin/deploy` apontando para
    o SHA publicado escolhido.
20. Na VPS, configurar `PASSWORD_RESET_BASE_URL` e variáveis SMTP reais em
    `/opt/fincontrol/shared/.env`.
21. Após publicar esse pacote, decidir entre:
    - criar rotina administrativa de reprocessamento dos e-mails `FAILED` ou
      `PENDING`;
    - ou avançar para a próxima feature operacional do financeiro.

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

## Critério de conclusão

- pacote atual publicado no GitHub com SHA imutável;
- checks locais aprovados;
- documentação de continuidade atualizada;
- pronto para deploy controlado sem depender de alterações locais não
  publicadas.

## Depois disso

Após a publicação do pacote atual, reavaliar a próxima frente principal entre:

- envio SMTP/worker real para consumir `administracao.email_outbox`;
- deploy de produção do pacote pós-Fase 16;
- filtros explícitos por empresa nas telas operacionais pendentes;
- sincronização futura de comprovantes com Google Drive;
- evolução do MVP de recorrências.

Ultimo deploy executado foi Deploy completed: bb8af36ef015
