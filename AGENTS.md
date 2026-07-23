# Instruções para agentes de desenvolvimento

Antes de qualquer análise ou alteração, leia integralmente, nesta ordem:

1. `AI_CONTEXT.md`;
2. `PROJECT_STATUS.md`;
3. `NEXT_TASK.md`;
4. este arquivo;
5. `README.md`;
6. os documentos relevantes em `docs/`;
7. as migrations em `database/migrations/`.

## Regras obrigatórias

- Preserve as decisões funcionais e arquiteturais aprovadas em `PROJECT_STATUS.md`.
- Preserve a memória estrutural registrada em `AI_CONTEXT.md`.
- Não reinicie o projeto do zero nem antecipe fases.
- Migrations aplicadas são imutáveis; correções devem ser migrations novas.
- Não crie objetos de aplicação no schema PostgreSQL `public`.
- Mantenha código e arquivos de desenvolvimento no WSL, fora de `/mnt/c`.
- Use o Docker Desktop do Windows para o PostgreSQL local.
- Não inicie frontend antes da validação do banco e da fundação da API.
- Documente validações, decisões e desvios relevantes.
- Use `NEXT_TASK.md` como ponteiro principal da tarefa ativa.
- Não abandonar documentos `FUTURE-*`, backlog, checklist ou planos vivos; eles
  continuam como referência complementar e não devem ser confundidos com o
  estado atual do projeto.

O estado executado das Fases 1 e 2 está documentado em
`docs/PHASE-1-2-VALIDATION.md`.
