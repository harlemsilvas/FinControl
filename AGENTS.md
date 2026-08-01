# Instrucoes para agentes de desenvolvimento

Este projeto usa IA como par de engenharia, nao como gerador automatico sem
revisao. Siga uma abordagem inspirada em Andrej Karpathy: especificar bem,
fazer mudancas cirurgicas, revisar diffs, rodar validacoes e preservar o
controle humano.

## Ordem obrigatoria de leitura

Antes de qualquer analise ou alteracao, leia integralmente, nesta ordem:

1. `AI_CONTEXT.md`
2. `PROJECT_STATUS.md`
3. `NEXT_TASK.md`
4. `AGENTS.md`
5. `README.md`
6. documentos relevantes em `docs/`
7. migrations relevantes em `database/migrations/`

## Regras obrigatorias do FinControl

- Preserve as decisoes funcionais e arquiteturais aprovadas em `PROJECT_STATUS.md`.
- Preserve a memoria estrutural registrada em `AI_CONTEXT.md`.
- Use `NEXT_TASK.md` como ponteiro principal da tarefa ativa.
- Nao reinicie o projeto do zero.
- Nao antecipe fases sem decisao explicita.
- Nao abandone arquivos `FUTURE-*`, backlog, checklist ou planos vivos.
- Migrations aplicadas sao imutaveis; correcoes devem ser novas migrations.
- Nao crie objetos de aplicacao no schema PostgreSQL `public`.
- Mantenha codigo e arquivos de desenvolvimento no WSL.
- Use Docker Desktop do Windows para o PostgreSQL local.
- Documente decisoes, validacoes e desvios relevantes.

## Modo de trabalho com IA

- Pense antes de codar.
- Declare premissas importantes.
- Se houver ambiguidade relevante, pergunte antes de alterar.
- Prefira a menor mudanca que resolve o problema.
- Nao faca refatoracoes oportunistas.
- Nao "melhore" codigo adjacente sem necessidade.
- Todo diff deve ter relacao direta com a solicitacao.
- Em sistema financeiro, nunca aceite mudanca sem validacao.
- Revise erros, logs e sintomas antes de propor solucao.
- Quando possivel, reproduza o problema antes de corrigir.
- Apos corrigir, rode validacoes focadas.
- Rode `./Checar_alteracao.sh` apenas quando o pacote estiver completo ou quando solicitado.

## Seguranca de alteracoes

- Nunca reverta mudancas do usuario sem autorizacao.
- Nunca use comandos destrutivos como `git reset --hard` ou `git checkout --` sem pedido explicito.
- Nao altere migrations antigas ja aplicadas.
- Nao faca commit de `.env`, credenciais, artefatos locais, `.venv`, `.vscode` ou arquivos nao relacionados.
- Antes de commit, confira `git status` e selecione apenas arquivos do pacote.

## Criterio de conclusao

Uma tarefa so esta concluida quando:

- o problema foi corrigido ou a limitacao foi explicada;
- validacoes relevantes foram executadas;
- documentacao viva foi atualizada quando houver mudanca de estado;
- proximos passos ficaram claros em `NEXT_TASK.md`;
- o usuario consegue retomar o projeto sem perda de contexto.
