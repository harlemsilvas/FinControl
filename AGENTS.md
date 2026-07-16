# Instruções para agentes de desenvolvimento

Antes de qualquer análise ou alteração, leia integralmente, nesta ordem:

1. `PROJECT_STATUS.md`;
2. este arquivo;
3. `README.md`;
4. os documentos relevantes em `docs/`;
5. as migrations em `database/migrations/`.

## Regras obrigatórias

- Preserve as decisões funcionais e arquiteturais aprovadas em `PROJECT_STATUS.md`.
- Não reinicie o projeto do zero nem antecipe fases.
- Migrations aplicadas são imutáveis; correções devem ser migrations novas.
- Não crie objetos de aplicação no schema PostgreSQL `public`.
- Mantenha código e arquivos de desenvolvimento no WSL, fora de `/mnt/c`.
- Use o Docker Desktop do Windows para o PostgreSQL local.
- Não inicie frontend antes da validação do banco e da fundação da API.
- Documente validações, decisões e desvios relevantes.

O estado executado das Fases 1 e 2 está documentado em
`docs/PHASE-1-2-VALIDATION.md`.

