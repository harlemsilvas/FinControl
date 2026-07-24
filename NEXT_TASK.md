# FinControl — Next Task

**Última atualização:** 23/07/2026  
**Status:** incidente de deploy em diagnóstico  
**Contexto:** continuidade pós-Fase 16, já com multiempresa, XML operacional,
pagamentos/tesouraria e recorrências implementados localmente

## Objetivo

Diagnosticar e corrigir a falha de deploy em que o verificador cobrou as tabelas
de recorrência antes de elas existirem no banco da VPS.

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
- preparar o pacote para deploy controlado ou para uso do workflow
  `Deploy Production`, conforme decisão operacional.

## Passos

1. Manter fora do pacote, salvo decisão explícita:
   - `.venv`;
   - `.vscode/settings.json`;
   - arquivos `.docx` removidos/conversões não conferidas;
   - planilhas ou imagens não essenciais ao deploy.
2. Na VPS, verificar se a release usada contém
   `database/migrations/202607231000_financeiro_create_payable_recurrences.sql`.
3. Na VPS, consultar `administracao.schema_versions` para as versões
   `202607231000` e `202607231010`.
4. Na VPS, consultar `to_regclass` das três tabelas de recorrência.
5. Se `schema_versions` não tiver as versões novas e as tabelas não existirem,
   aplicar as duas migrations de recorrência a partir da release publicada e
   registrar checksums.
6. Se `schema_versions` tiver a versão `202607231000`, mas as tabelas não
   existirem, remover apenas esse registro inconsistente depois de backup lógico
   ou aplicar reparo manual com registro correto.
7. Depois de corrigir o banco, repetir o deploy/verify.
8. Só então decidir entre:
   - deploy controlado manual da branch/commit;
   - ou publicação via workflow `Deploy Production`, se `main` estiver pronta.
9. Se usar workflow, abrir/mergear PR para `main` antes do acionamento manual,
   pois o workflow atual faz checkout fixo de `main`.
10. Se usar deploy manual, executar `/opt/fincontrol/bin/deploy` apontando para
   o SHA publicado escolhido.

## Validações já executadas

- `npm run typecheck`: aprovado.
- `npm run lint`: aprovado.
- `npm test`: aprovado, com API 79 testes aprovados e 5 testes de integração
  opt-in pulados; web 27 testes aprovados.
- `npm run build`: aprovado.
- `bash scripts/validate-migrations.sh`: aprovado, 53 migrations ordenadas,
  únicas e transacionais.

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
