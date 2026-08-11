# DOC-12 --- Estratégia de Continuidade para IA (Codex/VS Code)

## Objetivo

Garantir que o desenvolvimento do FinControl continue sem perda de
contexto entre sessões do Codex.

## Estrutura recomendada

``` text
fincontrol/
├── AI_CONTEXT.md
├── PROJECT_STATUS.md
├── NEXT_TASK.md
├── AGENTS.md
├── README.md
├── docs/
├── database/
├── apps/
└── infra/
```

## Função de cada arquivo

### AI_CONTEXT.md

Memória permanente: - arquitetura - stack - convenções - decisões
arquiteturais - padrões de banco - regras de negócio permanentes

Atualizar apenas quando houver mudanças estruturais.

### PROJECT_STATUS.md

Registro do andamento: - fase atual - entregas concluídas - pendências -
decisões recentes - próximos marcos

Atualizar ao final de cada sessão importante.

### NEXT_TASK.md

Contém somente a próxima tarefa executável.

Exemplo:

``` text
Fase: 2
Objetivo: Validar todas as migrations.
Passos:
1. Subir Docker.
2. Executar migrations.
3. Corrigir erros.
4. Criar verify_database.sql.
5. Documentar resultado.
```

### AGENTS.md

Regras obrigatórias para o Codex: - ler AI_CONTEXT.md; - ler
PROJECT_STATUS.md; - ler NEXT_TASK.md; - respeitar a arquitetura; - não
alterar migrations aplicadas; - não reiniciar o projeto.

### README.md

Guia de instalação e execução.

## Fluxo recomendado

Sempre iniciar uma nova conversa com:

``` text
Leia nesta ordem:

1. AI_CONTEXT.md
2. PROJECT_STATUS.md
3. NEXT_TASK.md
4. AGENTS.md
5. README.md
```

Depois informe a fase atual e execute apenas a tarefa descrita em NEXT_TASK.md.

## Ajuste operacional importante

No estado atual do FinControl, `PROJECT_STATUS.md` nao deve mais parar na Fase
16. Ele precisa continuar registrando tambem as trilhas posteriores, como:

- multiempresa;
- XML imports operacional;
- pagamentos/tesouraria;
- recorrencias;
- novas pendencias de deploy e publicacao.

Os arquivos `FUTURE-*`, backlog, checklist e planos detalhados devem continuar
existindo como apoio documental e nao devem ser descartados durante a
reorganizacao da continuidade.

## Benefícios

-   Continuidade entre sessões.
-   Menor perda de contexto.
-   Desenvolvimento previsível.
-   Documentação viva.
-   Facilidade para novos colaboradores.

## Decisão

Esta organização passa a integrar oficialmente a documentação do
FinControl.
