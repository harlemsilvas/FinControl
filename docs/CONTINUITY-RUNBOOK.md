# Runbook de Continuidade

**Status:** ativo  
**Última atualização:** 23/07/2026

## Objetivo

Padronizar como o FinControl deve registrar contexto entre sessões humanas e de
IA sem perder:

- estado atual;
- próxima tarefa;
- backlog vivo;
- escopo futuro deliberadamente adiado.

## Arquivos principais

### `AI_CONTEXT.md`

Atualizar somente quando houver mudança estrutural:

- arquitetura;
- stack;
- regras permanentes;
- decisões que passam a valer como política do projeto.

### `PROJECT_STATUS.md`

Atualizar quando houver avanço relevante de execução:

- novas fases concluídas;
- nova trilha entregue após as fases originais;
- mudança importante no estado de produção, deploy ou ambiente;
- novo marco técnico consolidado.

### `NEXT_TASK.md`

Atualizar sempre que a tarefa ativa mudar.

Esse arquivo deve apontar para uma única tarefa executável e não deve virar
backlog genérico.

## Documentos complementares

### Backlog e checklist vivos

Devem continuar existindo como apoio detalhado:

- `docs/MULTIEMPRESA-DEVELOPMENT-CHECKLIST.md`
- `docs/MULTIEMPRESA-EXECUTION-BACKLOG.md`
- `docs/MULTIEMPRESA-IMPLEMENTATION-PLAN.md`

### Escopo futuro

Os arquivos `docs/FUTURE-*.md` e equivalentes devem ser preservados como
roadmap documentado. Eles não substituem `NEXT_TASK.md` nem `PROJECT_STATUS.md`.

## Fluxo recomendado no fim de uma sessão importante

1. Atualizar `PROJECT_STATUS.md` se o estado consolidado do projeto mudou.
2. Atualizar `NEXT_TASK.md` com a próxima tarefa executável real.
3. Atualizar `AI_CONTEXT.md` apenas se alguma decisão permanente mudou.
4. Registrar documentos específicos de fase, trilha, validação ou feature
   futura quando fizer sentido.

## Checkpoint obrigatório

Ao fechar uma etapa com commit ou validação relevante, registrar pelo menos:

1. SHA ou identificador do checkpoint;
2. validações executadas e resultado observado;
3. próxima tarefa executável;
4. arquivos que ficaram intencionalmente fora do pacote.

Esse registro deve ficar em `PROJECT_STATUS.md` e/ou `NEXT_TASK.md`, para que a
retomada não dependa de memória da conversa.

## Fluxo recomendado no início de uma nova sessão

Ler nesta ordem:

1. `AI_CONTEXT.md`
2. `PROJECT_STATUS.md`
3. `NEXT_TASK.md`
4. `AGENTS.md`
5. `README.md`
6. documentos citados pelos arquivos acima
7. migrations relevantes ao escopo em `database/migrations/`
