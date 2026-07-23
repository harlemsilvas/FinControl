# Contas a Pagar Recorrentes — Validacao da Entrega MVP

Data: 23/07/2026
Ambiente: local WSL Ubuntu com PostgreSQL no Docker Desktop Windows
Branch observada: `feature/matriz-filial-xml`

## Objetivo

Validar a entrega MVP de contas a pagar recorrentes no estado atual do codigo
local, confirmando:

- estrutura de banco e permissoes da feature;
- regras operacionais principais da recorrencia;
- cobertura automatizada de backend, frontend e integracao com PostgreSQL real;
- pendencias reais que permanecem fora do escopo desta rodada.

## Escopo validado

Entrega coberta nesta rodada:

- migrations de recorrencias e vinculo com titulos;
- permissao de acesso ao modulo de recorrencias;
- endpoints de listagem, criacao, edicao, suspensao, reativacao, cancelamento,
  preview e geracao;
- tela `/recurrences` com cadastro, listagem e acao de geracao;
- regras de encerramento por data final e por quantidade maxima;
- bloqueios de combinacoes invalidas para recorrencias sem prazo final;
- validacao real contra PostgreSQL local com rollback transacional.

## Documentos e artefatos de referencia

- `docs/PAYABLES-RECURRENCES.md`
- `database/migrations/202607231000_financeiro_create_payable_recurrences.sql`
- `database/migrations/202607231010_administracao_seed_recurrence_permissions.sql`
- `apps/api/src/domains/payables/payables-routes.ts`
- `apps/api/src/domains/payables/payables-repository.ts`
- `apps/web/src/payables/recurrences-page.tsx`

## Decisoes preservadas

- A recorrencia gera titulos futuros, mas nao representa pagamento nem baixa.
- Titulos ja gerados permanecem independentes do cadastro da recorrencia.
- Recorrencia sem prazo final nao pode informar `endDate` nem
  `maxOccurrences`.
- Recorrencia sem prazo final continua limitada a uma janela maxima de 6 meses
  por operacao de geracao.
- Suspensao so pode ocorrer quando a recorrencia estiver ativa.
- Reativacao invalida continua bloqueada quando o status atual nao permite.
- Encerramento por quantidade maxima ou data final passa a finalizar a serie e
  limpar `next_occurrence_date`.

## Validacoes executadas

### Backend

Cobertura reforcada em testes automatizados:

- `apps/api/test/payables-repository.test.ts`
- `apps/api/test/http-contract.test.ts`

Casos confirmados:

- criacao de recorrencia valida;
- listagem e leitura do resumo operacional;
- rejeicao de payload invalido;
- rejeicao de combinacao `isOpenEnded=true` com prazo final ou quantidade
  maxima;
- preview de ocorrencias pendentes;
- geracao de titulos recorrentes;
- suspensao invalida;
- reativacao invalida;
- finalizacao automatica ao atingir `maxOccurrences`.

Resultado observado:

- `test/payables-repository.test.ts`: `30/30` aprovados;
- `test/http-contract.test.ts`: `11/11` aprovados.

### Integracao com PostgreSQL real

Foi criado teste opt-in:

- `apps/api/test/integration/recurrences.integration.test.ts`

Validacao executada contra o PostgreSQL local em `127.0.0.1:5434`, reutilizando
dados mestres reais ja existentes no banco local.

Fluxo confirmado:

- criacao da recorrencia com referencias reais;
- preview de geracao;
- geracao de titulo recorrente;
- criacao do vinculo em `payable_recurrence_titles`;
- atualizacao de `next_occurrence_date`;
- rollback ao final do teste para nao poluir a base.

Resultado observado:

- `recurrences.integration.test.ts`: `1/1` aprovado.

Observacao tecnica:

- durante a rodada apareceu um `DeprecationWarning` do `pg` sobre chamadas em
  cliente ainda executando query; a validacao passou, mas vale uma limpeza
  adicional futura nesse teste para eliminar o aviso.

### Frontend

Cobertura criada/ajustada em:

- `apps/web/src/payables/recurrences-page.test.tsx`

Casos confirmados:

- listagem com resumo e acoes;
- criacao de recorrencia via formulario;
- preview e confirmacao de geracao;
- mensagens operacionais mais claras para sucesso e erro;
- orientacoes visuais sobre limite de 6 meses e uso de prazo final.

Resultado observado:

- `recurrences-page.test.tsx`: `3/3` aprovados;
- `npm run typecheck --workspace apps/web`: aprovado.

## Sinal manual do usuario

Houve validacao manual de cadastro de uma conta recorrente durante a rodada, com
retorno positivo do usuario sobre o fluxo principal de criacao.

## Conclusao da rodada

O MVP de recorrencias ficou funcional no codigo local, com cobertura automatizada
nos pontos centrais de backend e frontend e com pelo menos uma validacao real no
PostgreSQL local usando rollback.

Nao foi identificada necessidade de migration adicional nesta rodada.

## Atualizacao posterior da mesma data

Apos os testes manuais de alteracao e cancelamento de series, a entrega foi
refinada no commit `c1fec93 feat(payables): refine recurrence lifecycle
actions`.

Refinamentos consolidados:

- acao de recorrencia disponivel na listagem de contas a pagar;
- acao de recorrencia disponivel no detalhe de contas a pagar;
- menu por icone com tooltip para revisar ou cancelar a recorrencia;
- preview dos titulos futuros elegiveis antes do cancelamento;
- revisao de recorrencia a partir de uma data de vigencia;
- normalizacao de campos opcionais vazios enviados pelo frontend;
- mensagem mais informativa para erros de validacao de recorrencia;
- correcao do fluxo que podia violar `ck_payable_recurrences_end_date` ao
  revisar uma serie a partir da propria data inicial;
- limpeza do aviso do `pg` por validacoes sequenciais no repositório.

Validacoes executadas antes do commit:

- `node ./node_modules/typescript/bin/tsc -p apps/api/tsconfig.json --noEmit`;
- `node ./node_modules/typescript/bin/tsc -p apps/web/tsconfig.json --noEmit`;
- `node ./node_modules/vitest/vitest.mjs run apps/api/test/payables-repository.test.ts apps/api/test/http-contract.test.ts apps/web/src/payables/payables-list-page.test.tsx apps/web/src/payables/payable-form-page.test.tsx apps/web/src/payables/recurrences-page.test.tsx`.

Resultado observado: 5 arquivos de teste e 59 testes aprovados.

## Pendencias conhecidas

- decidir se a geracao futura sera apenas manual no MVP ou se havera job
  agendado em etapa posterior;
- publicar o pacote atual no GitHub e executar o deploy controlado antes de
  abrir nova frente funcional grande.
