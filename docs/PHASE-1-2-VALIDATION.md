# FinControl — Validação das Fases 1 e 2

**Data:** 16/07/2026  
**Escopo:** ambiente local e banco de dados  
**Resultado:** banco e conexão Node.js pelo WSL aprovados; permanecem pendências operacionais antes do backend

## 1. Documentos e instruções lidos

- `PROJECT_STATUS.md`: lido integralmente.
- `README.md`: lido integralmente.
- `AGENTS.md`: não existe no workspace recebido.
- `AGENTS-APPEND.md`: lido integralmente como única instrução local disponível.
- READMEs e 25 migrations de banco: conferidos na ordem declarada.

Nenhuma arquitetura ou decisão funcional aprovada foi alterada.

## 2. Estado inicial encontrado

- Workspace localizado em `/home/harlem/projetos/FinControl`, fora de `/mnt/c`.
- A raiz não continha `compose.yaml`, `.env`, pasta oficial `database/migrations` ou scripts de validação.
- As migrations estavam em `docs/domains/DOM-002-Financeiro/database/migrations`.
- A raiz não é um repositório Git: não há metadados `.git` disponíveis.
- Docker Desktop estava instalado e ativo no Windows, mas a integração com a distribuição Ubuntu estava desativada.
- No estado inicial, Node.js, npm, cliente PostgreSQL e o comando `docker` não estavam instalados/disponíveis dentro do Ubuntu WSL.

## 3. Fase 1 — Ambiente local

Artefatos criados:

- `compose.yaml` com PostgreSQL 17 Alpine;
- `.env` para o ambiente local;
- `.env.example` sem senha operacional;
- volume persistente `fincontrol_fincontrol_postgres_data`;
- publicação restrita a `127.0.0.1:5434`.

Estado validado:

```text
Container: fincontrol-postgres
Imagem: postgres:17-alpine
Status: healthy
Porta: 127.0.0.1:5434 -> 5432/tcp
Banco: fincontrol
Usuário: fincontrol
PostgreSQL: 17.10
```

O Docker Desktop foi operado pelo Windows, conforme a arquitetura aprovada. A porta 5434 ficou acessível ao WSL.

Node.js `v22.23.1` e npm `10.9.8` foram instalados em `~/.local` a partir do binário oficial para Linux x64, após validação do SHA-256 publicado. Uma nova sessão de login encontra ambos pelo `PATH` configurado em `~/.profile`.

## 4. Fase 2 — Migrations e banco

As 25 migrations originais foram copiadas, sem alteração, para `database/migrations` e aplicadas individualmente em ordem lexical com `ON_ERROR_STOP=1`.

Resultado:

- 25 de 25 migrations aplicadas;
- nenhuma falha de sintaxe, dependência ou constraint durante a aplicação;
- nenhuma migration corretiva necessária;
- seis schemas de domínio presentes;
- nenhum objeto de aplicação criado em `public`;
- 33 tabelas no total: 8 em `administracao`, 7 em `cadastros`, 16 em `financeiro` e 2 em `tesouraria`;
- 2 views em `financeiro`;
- 8 funções entre `administracao` e `financeiro`;
- constraints validadas;
- seeds de estados, perfis e permissões validados.

Os schemas `inteligencia` e `integracoes` existem e permanecem sem tabelas, de acordo com o escopo atual.

## 5. Scripts criados e executados

### `database/scripts/verify_database.sql`

Valida:

- os seis schemas obrigatórios;
- ausência de objetos de aplicação em `public`;
- tabelas obrigatórias;
- constraints não validadas;
- funções e views financeiras;
- quantidades dos seeds essenciais.

Resultado executado: `PASS`.

### `database/scripts/test_financial_flow.sql`

Executa em transação e termina com `ROLLBACK`, sem deixar dados de teste. Cobre:

- usuário;
- fornecedor;
- categoria;
- banco e conta bancária;
- título e parcela `1/1`;
- validação do total das parcelas;
- detecção e confirmação não bloqueante de duplicidade;
- auditoria da confirmação de duplicidade;
- pagamento parcial;
- pagamento integral;
- estorno;
- exclusão lógica controlada;
- importação XML simulada.

Resultado executado: `PASS`.

### `database/scripts/verify_node_connection.js`

Teste TCP mínimo, sem dependências de backend, que comprova que o runtime Node.js no WSL alcança `DB_HOST:DB_PORT`.

Resultado executado: `PASS` em `127.0.0.1:5434`.

### `scripts/setup-wsl-dev.sh`

Instala de forma reproduzível o Node.js 22 no diretório do usuário, valida o checksum oficial e disponibiliza `node`, `npm`, `npx` e `corepack` em `~/.local/bin` sem exigir `sudo`.

## 6. Pendências obrigatórias antes do backend

1. Ativar a integração do Docker Desktop com a distribuição Ubuntu se for desejado executar `docker` diretamente no WSL. Isso não bloqueia o banco operado pelo Windows.
2. Criar ou restaurar o repositório Git antes de cumprir o critério de commit inicial.
3. Confirmar se `AGENTS-APPEND.md` deve ser renomeado/incorporado como `AGENTS.md`.
4. Abrir o workspace no VS Code em modo WSL; esta ação de interface não foi automatizada.

O cliente `psql` e `build-essential` não foram instalados no Ubuntu porque exigem `sudo` interativo e não são necessários para a etapa atual. O `psql` do próprio container executa migrations e testes; compiladores devem ser instalados apenas se uma dependência nativa do backend realmente os exigir.

O backend não foi iniciado.

## 7. Comandos de repetição

No PowerShell do Windows, a partir da raiz do projeto:

```powershell
docker compose up -d
docker cp database/migrations/. fincontrol-postgres:/migrations
docker exec fincontrol-postgres sh -c 'for f in /migrations/202*.sql; do psql -v ON_ERROR_STOP=1 -U fincontrol -d fincontrol -f "$f" || exit 1; done'
docker cp database/scripts/. fincontrol-postgres:/scripts
docker exec fincontrol-postgres psql -U fincontrol -d fincontrol -f /scripts/verify_database.sql
docker exec fincontrol-postgres psql -U fincontrol -d fincontrol -f /scripts/test_financial_flow.sql
```

O comando de migrations é destinado a banco vazio. Os scripts de verificação e fluxo podem ser repetidos no banco já migrado.
