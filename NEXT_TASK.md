# FinControl — Next Task

**Última atualização:** 28/07/2026
**Status:** correções operacionais de Agenda, baixa e cadastros validadas localmente
**Contexto:** continuidade pós-Fase 16, já com multiempresa, XML operacional,
pagamentos/tesouraria e recorrências implementados localmente

## Objetivo

Validar e publicar o pacote atual com os ajustes da experiência
`Notas Fiscais e Contas` e as correções operacionais de Agenda, baixa de
pagamentos e cadastro de contas bancárias, mantendo em aberto o diagnóstico do
deploy/migrations de recorrência na VPS.

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
  - tela `Baixa de Pagamentos` inicia sempre com status `OPEN`;
  - endpoint de parcelas elegíveis aceita `payableTitleId` e `installmentId`;
  - cadastro de contas bancárias busca detalhe antes de preencher edição,
    corrigindo `Empresa` e `Banco` vazios na primeira abertura;
  - campo `Fornecedor` da nova conta ocupa a linha inteira em telas grandes
    para evitar estouro/truncamento visual;
- rotina de checagem final criada em 28/07/2026:
  - `./Checar_alteracao.sh` executa validações completas e gera log em
    `logs/alteracoes/`;
  - o log só deve ser analisado quando o script retornar `STATUS: FAIL`;
  - alias disponível: `npm run check:alteracao`;
  - após `STATUS: OK`, criar commit local personalizado;
  - push para servidor/remoto passa a depender de validação/autorização do
    usuário;
- preparar o pacote para deploy controlado ou para uso do workflow
  `Deploy Production`, conforme decisão operacional.

## Passos

1. Manter fora do pacote, salvo decisão explícita:
   - `.venv`;
   - `.vscode/settings.json`;
   - arquivos `.docx` removidos/conversões não conferidas;
   - planilhas ou imagens não essenciais ao deploy.
2. Validar a correção local de saldo inicial/entrada de caixa com typecheck,
   lint, testes focados e build.
3. Validar a alteração da listagem Notas Fiscais e Contas com teste focado,
   typecheck, lint e build.
4. Validar as correções de Agenda, baixa e cadastros com testes focados,
   typecheck, lint e build.
5. Ao finalizar qualquer alteração completa, executar `./Checar_alteracao.sh`.
6. Se o script retornar `STATUS: FAIL`, analisar o log indicado e voltar aos
   testes/correções normais.
7. Se o script retornar `STATUS: OK`, criar commit local personalizado.
8. Fazer push somente quando o usuário validar/autorizá-lo.
9. Na VPS, verificar se a release usada contém
   `database/migrations/202607231000_financeiro_create_payable_recurrences.sql`.
10. Na VPS, consultar `administracao.schema_versions` para as versões
   `202607231000` e `202607231010`.
11. Na VPS, consultar `to_regclass` das três tabelas de recorrência.
12. Se `schema_versions` não tiver as versões novas e as tabelas não existirem,
   aplicar as duas migrations de recorrência a partir da release publicada e
   registrar checksums.
13. Se `schema_versions` tiver a versão `202607231000`, mas as tabelas não
   existirem, remover apenas esse registro inconsistente depois de backup lógico
   ou aplicar reparo manual com registro correto.
14. Depois de corrigir o banco, repetir o deploy/verify.
15. Só então decidir entre:
   - deploy controlado manual da branch/commit;
   - ou publicação via workflow `Deploy Production`, se `main` estiver pronta.
16. Se usar workflow, abrir/mergear PR para `main` antes do acionamento manual,
   pois o workflow atual faz checkout fixo de `main`.
17. Se usar deploy manual, executar `/opt/fincontrol/bin/deploy` apontando para
    o SHA publicado escolhido.

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

## Critério de conclusão

- pacote atual publicado no GitHub com SHA imutável;
- checks locais aprovados;
- documentação de continuidade atualizada;
- pronto para deploy controlado sem depender de alterações locais não
  publicadas.

## Depois disso

Após a publicação do pacote atual, reavaliar a próxima frente principal entre:

- deploy de produção do pacote pós-Fase 16;
- filtros explícitos por empresa nas telas operacionais pendentes;
- sincronização futura de comprovantes com Google Drive;
- evolução do MVP de recorrências.

Ultimo deploy executado foi Deploy completed: bb8af36ef015
