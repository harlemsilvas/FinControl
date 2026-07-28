# FinControl — Next Task

**Última atualização:** 28/07/2026
**Status:** ajuste da listagem Notas Fiscais e Contas em validação local
**Contexto:** continuidade pós-Fase 16, já com multiempresa, XML operacional,
pagamentos/tesouraria e recorrências implementados localmente

## Objetivo

Validar e publicar o ajuste da antiga tela de Contas a Pagar para a experiência
`Notas Fiscais e Contas`, mantendo em aberto o diagnóstico do deploy/migrations
de recorrência na VPS.

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
4. Commitar e publicar o pacote atual.
5. Na VPS, verificar se a release usada contém
   `database/migrations/202607231000_financeiro_create_payable_recurrences.sql`.
6. Na VPS, consultar `administracao.schema_versions` para as versões
   `202607231000` e `202607231010`.
7. Na VPS, consultar `to_regclass` das três tabelas de recorrência.
8. Se `schema_versions` não tiver as versões novas e as tabelas não existirem,
   aplicar as duas migrations de recorrência a partir da release publicada e
   registrar checksums.
9. Se `schema_versions` tiver a versão `202607231000`, mas as tabelas não
   existirem, remover apenas esse registro inconsistente depois de backup lógico
   ou aplicar reparo manual com registro correto.
10. Depois de corrigir o banco, repetir o deploy/verify.
11. Só então decidir entre:
   - deploy controlado manual da branch/commit;
   - ou publicação via workflow `Deploy Production`, se `main` estiver pronta.
12. Se usar workflow, abrir/mergear PR para `main` antes do acionamento manual,
   pois o workflow atual faz checkout fixo de `main`.
13. Se usar deploy manual, executar `/opt/fincontrol/bin/deploy` apontando para
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
