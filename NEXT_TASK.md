# FinControl — Next Task

**Última atualização:** 11/08/2026
**Status:** pacote operacional validado, publicado, deployado na VPS e branches
remotas principais sincronizadas
**Contexto:** continuidade pós-Fase 16, já com multiempresa, XML operacional,
pagamentos/tesouraria e recorrências implementados localmente

## Objetivo

Retomar o desenvolvimento a partir do deploy funcional `d107d1d`, validando
primeiro qualquer ajuste residual observado em produção e, em seguida, montar o
próximo pacote de correções operacionais sem rodar validação completa a cada
mudança pequena.

## Ponto de retomada imediato

- Branch de trabalho: `feature/matriz-filial-xml`.
- Último commit da branch: `85a131a docs: update project readme`.
- Último deploy funcional na VPS: `d107d1d fix(payables): refine operational
  payment and xml flows`.
- Workflow de deploy: `Deploy VPS Native`, run `31543548787`, concluído com
  sucesso.
- Branches remotas sincronizadas em 11/08/2026:
  - `main`: `cc7c295`;
  - `agent/phases-5-11`: `005808c`;
  - `feature/matriz-filial-xml`: `85a131a`.
- CI das branches sincronizadas concluído com sucesso:
  - `31544491973 main`: sucesso;
  - `31544627105 agent/phases-5-11`: sucesso;
  - `31544100605 feature/matriz-filial-xml`: sucesso.
- Arquivos locais não versionados permanecem fora do pacote e devem ser
  avaliados separadamente antes de qualquer commit:
  - `diagrams/`;
  - `docs/Erros_Correcoes/`;
  - `docs/architecture-decisions/00.1-Decisoes-de-Arquitetura.md`;
  - `docs/history/PROJECT_HISTORY.md`;
  - `docs/tabelas_fin_control.xlsx`;
  - `docs/wireframes/Tela-Agenda.jpg`.

## Próxima tarefa executável

1. Abrir o sistema local ou VPS e confirmar se existe algum erro residual do
   pacote `d107d1d`.
2. Se houver erro funcional, tratar primeiro o menor ajuste reproduzível.
3. Se não houver erro bloqueante, escolher o próximo pacote pequeno de melhoria
   entre:
   - padronização de mensagens/toasts próprios do FinControl;
   - revisão de cache/versionamento visível pós-deploy em uso real;
   - refinamentos restantes em Baixa de Pagamentos e Agenda;
   - próxima frente funcional planejada após o pacote operacional.
4. Rodar `./Checar_alteracao.sh` apenas quando o pacote estiver completo ou
   quando explicitamente solicitado.

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
- último pacote enviado em 31/07/2026:
  - `ad968a4 feat(payables): simplify manual payable entry`;
  - `Checar_alteracao.sh` executado antes do commit com `STATUS: OK`;
  - push realizado para `feature/matriz-filial-xml`;
- correção local em 01/08/2026 após deploy controlado por `ad968a4`:
  - teste unitário de recorrência deixou de depender da data real do runner;
  - caso `keeps predecessor end date valid when revision starts on the original recurrence start date`
    congela o relógio em `2026-07-20`, mantendo `2026-08-01` como data futura
    válida;
  - código de produção não foi alterado nessa correção.
- pauta prioritária para 01/08/2026:
  - revisar versionamento exibido no menu lateral/rodapé da aplicação;
  - definir fonte única de versão do sistema;
  - incluir SHA/build/release no frontend para diagnóstico;
  - revisar cache headers do Nginx para `index.html` e assets;
  - garantir que deploy novo não entregue página antiga após atualização;
  - documentar rotina de verificação pós-deploy na VPS.
- pacote local de versionamento/cache em 01/08/2026:
  - menu lateral passa a exibir `FinControl v{version}`, `release {shortSha}` e
    `sha {shortSha}`;
  - frontend aceita `VITE_APP_VERSION`, `VITE_GIT_SHA`, `VITE_BUILD_TIME` e
    `VITE_RELEASE_ID`;
  - deploy nativo da VPS injeta versão do `package.json`, SHA completo, release
    curta e timestamp UTC no build da web;
  - deploy gera `version.json` no diretório publicado do frontend;
  - Nginx mantém `/fincontrol/assets/` com cache imutável e passa a servir
    `/fincontrol/` e `/fincontrol/version.json` sem cache;
  - imagens Docker web também aceitam os mesmos build args.
- pacote local de backup/restore em 01/08/2026:
  - criado `deploy/vps/bin/backup-db` para backup lógico PostgreSQL em formato
    custom com checksum SHA-256 e metadados JSON;
  - criado `deploy/vps/bin/restore-db` com confirmação explícita `RESTORE`,
    validação de checksum, backup automático `pre-restore`, parada/restart da
    API e restauração via `pg_restore`;
  - `install-control-plane` passa a instalar `backup-db` e `restore-db` em
    `/opt/fincontrol/bin`;
  - `deploy` passa a executar backup `pre-deploy-{shortSha}` antes de aplicar
    migrations;
  - criado `docs/VPS-BACKUP-RESTORE-RUNBOOK.md` com comandos operacionais.
- pacote local de gestão web de backups em 01/08/2026:
  - migration nova cria permissão `BACKUP_MANAGE` e associa ao perfil `MASTER`;
  - API recebe `GET /api/v1/backups`, `POST /api/v1/backups` e
    `GET /api/v1/backups/:name/download`;
  - backend executa somente o script fixo `backup-db` e pode usar
    `sudo -n` controlado por `BACKUP_SCRIPT_USE_SUDO`;
  - solicitações de criação e exportação são auditadas em
    `administracao.audit_events`;
  - frontend recebe tela `Configurações > Backups` em `/backups`;
  - menu lateral exibe `Backups` apenas para Master ou usuário com
    `BACKUP_MANAGE`;
  - tela permite consultar, gerar backup e exportar o arquivo para cópia local.
- correção local em 10/08/2026 para recorrências:
  - cadastro de série recorrente com `Data final` além de 6 meses foi
    confirmado como permitido e coberto por teste;
  - a regra de 6 meses permanece restrita à geração de títulos por operação;
  - a janela de geração passou a ser calculada a partir da primeira ocorrência
    pendente da série, não da data atual, com teto `+6 meses - 1 dia`, corrigindo
    séries futuras que começavam meses depois do cadastro;
  - preview/geração com `Gerar até` maior que a janela permitida deixa de
    retornar erro bloqueante e passa a limitar a operação automaticamente à data
    máxima gerável, com aviso ao usuário;
  - modal de geração passou a exibir a vigência da série e a tratar `Gerar até`
    e `Quantidade de ocorrências` como alternativas, evitando payload ambíguo;
  - teste instável de revisão de recorrência teve relógio congelado para não
    quebrar conforme a data real avança.
- correção local em 10/08/2026 para listagens operacionais:
  - `/api/v1/payables` passa a ocultar por padrão títulos vinculados a séries
    recorrentes `CANCELLED` ou `FINISHED`;
  - `Notas Fiscais e Contas` ganhou filtro `Recorrências operacionais`,
    `Recorrências desativadas` e `Todas as recorrências`;
  - `Pagamentos realizados` na tela de baixa ganhou paginação independente,
    seletor de quantidade por página e filtros por data de pagamento;
  - filtros compartilhados de busca, empresa e fornecedor continuam afetando
    fila de parcelas e histórico, mas cada lista mantém sua própria paginação.
- ajuste local em 11/08/2026 para higiene de repositório e README:
  - README reforçado para apresentar o FinControl como ERP financeiro full
    stack em desenvolvimento ativo, separando funcionalidades existentes de
    roadmap futuro;
  - `.venv` e `id_fincontrol` removidos do controle de versão local sem apagar
    os arquivos da máquina;
  - `.gitignore` reforçado para impedir novo rastreamento da `.venv` e da chave
    local `id_fincontrol`;
  - pendência crítica: revogar/rotacionar a chave SSH exposta e, em etapa
    controlada separada, limpar o histórico Git antes de considerar o segredo
    totalmente removido do repositório remoto.
- correções locais iniciadas em 11/08/2026 para Agenda/Baixa de Pagamentos:
  - card `Pago` da Agenda deixa de exibir `0 documentos` fixo e passa a usar
    contagem real de pagamentos efetivos retornada pelo dashboard;
  - endpoint `/api/v1/dashboard` passa a retornar `summary.paidCount` junto com
    `summary.paid`;
  - modal `Baixar parcela` ganha mensagem explícita do motivo que impede a
    confirmação, diferenciando falta de conta bancária, forma de pagamento,
    saldo insuficiente e confirmação de pagamento acima do saldo aberto;
  - campos monetários da baixa ficam responsivos e não devem mais se sobrepor
    quando informar juros, multa, acréscimos ou desconto;
  - edição de conta a pagar pela aba `Parcelas` passa a sincronizar o total do
    título com a soma das parcelas ao salvar, permitindo corrigir valor de uma
    cobrança ainda em aberto sem cair em `INSTALLMENT_TOTAL_MISMATCH`;
  - aba `Parcelas` ganha campo `Descrição da parcela`, persistido em
    `financeiro.payable_installments.notes`, para registrar numeração antiga,
    referência do boleto ou observação individual da parcela;
  - importação de XML de NFe passa a exigir destinatário cadastrado e ativo em
    `Cadastros > Empresas`; se o CNPJ do destinatário não for localizado, o XML
    não é gravado nem classificado como desconhecido;
  - modal de XML permite abrir o seletor do sistema tanto pelo campo de arquivo
    quanto pelo botão `Buscar XML`; a ação `Importar XML` permanece no rodapé
    ao lado de `Cancelar`;
  - campo de conferência do XML passa a ser somente leitura e preenchido
    automaticamente com o CNPJ destinatário lido do arquivo;
  - modal de importação de XML limpa arquivo, prévia, erros e resultados sempre
    que é aberto novamente, evitando reaproveitar dados da nota anterior;
  - backlog de Features recebeu item `Notificações Toast` para criar um padrão
    próprio, mais visível e personalizável, pois no uso diário as mensagens de
    erro atuais ficaram discretas demais;
  - tag de status de pagamento `EFFECTIVE` passa a ser exibida como `Pago` no
    histórico de pagamentos, preservando o código interno da API;
  - botão `Calendário` na listagem de Notas Fiscais e Contas passa a se chamar
    `Agenda`, mantendo o link para `/agenda`;
  - validação completa do pacote ficou combinada para depois da sequência de
    correções pontuais.
- correção local em 15/08/2026 para datas de recorrência:
  - campos de data da criação de recorrência passam a rejeitar valores ISO com
    ano acima de 4 dígitos, preservando o valor anterior quando o navegador
    emitir algo como `666666-08-17`;
  - a mesma proteção foi aplicada à data final da recorrência, à data `Gerar
    até` e ao modal de revisão futura (`Vigência a partir de` e `Data final`);
  - campos receberam limites `1900-01-01` a `9999-12-31`;
  - validação focada executada:
    `npm test --workspace @fincontrol/web -- date-input-utils.test.ts recurrences-page.test.tsx payables-list-page.test.tsx`
    e `npm run typecheck --workspace @fincontrol/web`, ambos aprovados.
- correção local em 15/08/2026 para geração por quantidade em recorrências:
  - quando o usuário informa quantidade maior que a janela operacional permite
    gerar, a API passa a retornar `limitedByGenerationWindow=true` também para
    solicitações por quantidade, não apenas por data;
  - a tela passa a avisar explicitamente que a quantidade solicitada foi
    reduzida pela janela atual de geração, orientando nova geração mais adiante
    para continuar a série;
  - validação focada executada:
    `npm test --workspace @fincontrol/api -- payables-repository.test.ts`,
    `npm test --workspace @fincontrol/web -- recurrences-page.test.tsx date-input-utils.test.ts`,
    `npm run typecheck --workspace @fincontrol/api` e
    `npm run typecheck --workspace @fincontrol/web`, todos aprovados.
- correção local em 15/08/2026 para edição de títulos com pagamentos:
  - títulos com pagamentos efetivos continuam bloqueando alteração real de
    valor original, fornecedor, documento, série ou empresa; para mudar esses
    campos é necessário estornar o pagamento antes, preservando rastreabilidade
    financeira;
  - o backend deixou de bloquear quando o frontend reenvia campos financeiros
    com o mesmo valor já gravado, permitindo salvar ajustes não financeiros e
    alterações em parcelas sem pagamento efetivo;
  - mensagens `PAID_TITLE_IMMUTABLE` e `PAID_INSTALLMENT_IMMUTABLE` passam a
    orientar em português o caminho seguro de estorno antes da alteração;
  - validação focada executada:
    `npm test --workspace @fincontrol/api -- payables-repository.test.ts`,
    `npm test --workspace @fincontrol/web -- payable-form-page.test.tsx`,
    `npm run typecheck --workspace @fincontrol/api` e
    `npm run typecheck --workspace @fincontrol/web`, todos aprovados.
- correção local em 15/08/2026 para saldo bancário por data:
  - baixa de pagamento deixou de validar contra saldo oficial acumulado atual e
    passou a validar contra o saldo da conta até `paymentDate`;
  - uma entrada lançada em data posterior não financia mais pagamento
    retroativo;
  - rota `/api/v1/bank-account-balances` aceita `asOfDate` opcional para
    retornar o saldo da conta em uma data específica;
  - tela `Baixa de Pagamentos` recarrega o saldo ao alterar `Data do pagamento`
    e exibe `Saldo da conta selecionada em DD/MM/AAAA`;
  - transferências bancárias também passam a validar saldo disponível até a
    data do movimento;
  - validação focada executada:
    `npm test --workspace @fincontrol/api -- treasury-repository.test.ts payables-repository.test.ts`,
    `npm test --workspace @fincontrol/web -- payments-page.test.tsx`,
    `npm run typecheck --workspace @fincontrol/api` e
    `npm run typecheck --workspace @fincontrol/web`, todos aprovados.
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
- refinamento local em 31/07/2026 para `Nova Conta a Pagar`:
  - criação manual passa a exibir somente as abas `Dados da Conta`, `Parcelas`,
    `Anexos` e `Observações`;
  - `Forma de Pagamento` deixa de aparecer na aba principal e em `Parcelas`;
  - forma técnica da parcela continua sendo preenchida internamente como
    `Boleto`, porque o banco ainda exige `payment_method_id`;
  - bloco `Ocorrência` foi removido da criação manual;
  - `Impostos` e `Aprovações` foram ocultadas até haver fluxo funcional;
  - `Histórico / Descrição` não bloqueia salvamento vazio e é gerado pelo
    contexto `Empresa - Fornecedor - Documento - Vencimento`;
  - `Tipo de Documento` usa `Boleto` como fallback quando não selecionado;
  - conta parcelada manual continua pela aba `Parcelas`, com botão
    `Adicionar parcela`;
  - regra de possível duplicidade passa a exigir coincidência de parcela e
    vencimento, além de empresa, fornecedor, documento e série;
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

## Critério de conclusão

- pacote atual publicado no GitHub com SHA imutável;
- checks locais aprovados;
- documentação de continuidade atualizada;
- pronto para deploy controlado sem depender de alterações locais não
  publicadas.

Em 11/08/2026, esse critério foi atendido para o pacote operacional publicado
em `d107d1d` e para a documentação publicada em `85a131a`.

## Depois disso

Após a publicação do pacote atual, reavaliar a próxima frente principal entre:

- envio SMTP/worker real para consumir `administracao.email_outbox`;
- deploy de produção do pacote pós-Fase 16;
- filtros explícitos por empresa nas telas operacionais pendentes;
- sincronização futura de comprovantes com Google Drive;
- evolução do MVP de recorrências.

Último deploy executado foi `Deploy VPS Native` do commit `d107d1d` em
11/08/2026, run GitHub Actions `31543548787`, concluído com sucesso.
