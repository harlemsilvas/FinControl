# Ambiente de desenvolvimento e GitHub

**Atualizado em:** 29/09/2026
**Ambiente oficial:** Debian nativo, substituindo Windows/WSL e Docker Desktop.

## Fluxo oficial

- Projeto: `/home/harlem/projetos/FinControl`, no filesystem Linux.
- API/frontend: Node.js 22 e npm nativos; versão exigida em `package.json`.
- Banco: PostgreSQL 17 em Docker Engine/Compose no Debian.
- Endereço padrão do banco: `127.0.0.1:5434`, conforme `compose.yaml`.
- Segredos: `.env` e arquivos privados locais, nunca versionados.
- VPS preserva PostgreSQL em Docker, API com PM2 e frontend em Nginx.

Abra o terminal no Debian e, se usar VS Code, abra a pasta diretamente:

```bash
cd /home/harlem/projetos/FinControl
code .
```

Não é necessária conexão `WSL: Ubuntu` ou integração com Docker Desktop.
Documentos de validações antigas e `guia-otimizacao-wsl.md` são históricos.

## Diagnóstico da migração em 29/09/2026

- Sistema consultado: Debian GNU/Linux 13 (trixie).
- `git status` e `git log`: `not a git repository`. Fora do sandbox, `.git`
  não foi encontrado nesta pasta. Não foi possível confirmar HEAD, branch,
  remoto, arquivos modificados ou commits enviados ao GitHub.
- Node/npm indisponíveis no PATH e dependências locais ausentes.
- Docker CLI `29.8.1` e Compose `v5.5.1` presentes.
- `docker ps` fora do sandbox: nenhum container em execução. A consulta no
  sandbox falhou por permissão no socket; não confundir com daemon inativo.
- Não foram inspecionados dados/volumes nem restaurado banco. Existência de
  dumps locais não comprova integridade ou restauração da base migrada.

## Recuperação concluída em 29/09/2026

- Clone ativo recuperado em `/home/harlem/projetos/FinControl-recuperado`, na
  branch `feature/matriz-filial-xml`.
- Node.js 22.23.1 e npm 12.1.0 instalados em `~/.local`.
- Helper legado `docker-credential-desktop` removido da configuração ativa;
  backup privado preservado em `~/.docker/config.json.pre-debian-20260929`.
- PostgreSQL 17.11 disponível em `127.0.0.1:5434`; backup de 29/09 restaurado
  e validado pelo roteiro oficial do banco.
- Dependências instaladas, `npm audit` sem vulnerabilidades e checagem completa
  aprovada. API e frontend disponíveis em `127.0.0.1:3000` e
  `127.0.0.1:5173`.

Os itens do diagnóstico acima registram o estado inicial da migração. Este
checkpoint posterior é o estado operacional vigente.

## Histórico Git recuperado do GitHub — 29/09/2026

- Remoto confirmado: `https://github.com/harlemsilvas/FinControl.git`.
- Clone separado salvo em `/home/harlem/projetos/FinControl-recuperado`.
- Branch selecionada: `feature/matriz-filial-xml`, acompanhando `origin`.
- HEAD: `93ea2c3adf1f8df57be00dbd7ca565ca7d44c69e` (28/09/2026),
  `feat(reports): add payment and planned versus paid reports`.
- `main` permanece em `cc7c295`; não é a branch funcional mais recente.
- Comparação por conteúdo, desconsiderando diferenças de bit executável:
  arquivos versionados em `apps/` e `database/migrations/` coincidem com a
  cópia atual. Foram encontradas diferenças em 13 arquivos: nove documentos
  desta revisão, `.env.example`, duas configurações `.vscode` e
  `package-lock.json`. Arquivos não versionados e privados foram preservados.
- Portanto, os relatórios já estão publicados no GitHub; isso não comprova
  deploy ou aprovação visual/financeira. O último deploy documentado continua
  sendo `10b4219`.
- A pasta original continua sem Git recuperado. Próximo passo: revisar e
  transferir as diferenças locais necessárias para o clone separado, incluindo
  esta documentação, e preparar o ambiente nele antes de adotá-lo como workspace.
  Não substituir arquivos privados nem incluir artefatos automaticamente.
- A `.git` do Windows antigo ainda poderá recuperar commits/branches nunca
  enviados ao GitHub. Nenhum arquivo atual foi substituído pelo clone.

## Recuperar o Git antes de publicar

Esta pasta contém trabalho local e arquivos privados. Preserve uma cópia
integral antes de recuperar o repositório. Recupere o `.git` original de uma
cópia confiável ou clone o remoto confirmado em **outra pasta** e compare os
arquivos, preservando as alterações locais. Não use `git init`, reset ou
checkout destrutivo para tentar reconstruir o histórico.

Depois de recuperar o clone:

```bash
git status --short --branch
git log -8 --oneline
git remote -v
git fetch origin
git branch -vv
git diff --stat
git diff --check
```

A branch registrada anteriormente era `feature/matriz-filial-xml`; confirme
no repositório recuperado. Buscar referências não integra automaticamente
alterações. Compare o upstream antes de merge/pull e selecione explicitamente
os arquivos do pacote antes de commit. Push/deploy seguem a autorização do
usuário. Não recrie um remoto vazio nem publique esta cópia como projeto novo.

## Preparar e conferir Node.js

Disponibilize Node.js 22 e npm no PATH do terminal Debian. O script legado
`scripts/setup-wsl-dev.sh` instala um binário Linux x64 em `~/.local/opt` e
links em `~/.local/bin`; o nome ainda é histórico. Confira arquitetura e
script antes de usá-lo. Ele não configura Docker nem recupera banco/Git.
Se usar essa instalação, inclua `~/.local/bin` no PATH.

```bash
node --version
npm --version
npm ci
```

A versão de Node deve ser `v22.x`. `npm ci` usa o lockfile existente e deve ser
executado na raiz; não transportar `node_modules` do ambiente antigo.

## Conferir PostgreSQL e dados locais

Antes de criar containers, confira os existentes, inclusive parados, e volumes:

```bash
docker compose version
docker ps -a
docker volume ls
docker compose config --quiet
```

Confira privadamente `.env` com `.env.example`, preservando os segredos.
Para iniciar o serviço definido pelo projeto, após conferir o destino dos dados:

```bash
docker compose up -d postgres
docker compose ps
```

Um volume novo estará vazio: não significa que os dados do WSL foram migrados.
Restauração e aplicação de migrations exigem conferência prévia do backup e do
banco de destino; não são executadas por este roteiro. Não use `down -v`.
Consulte `LOCAL-VALIDATION-RUNBOOK.md` para validar a base recuperada.

## Iniciar API e frontend

Depois de preparar dependências, banco e configurações, em terminais separados:

```bash
npm run dev:api
```

```bash
VITE_API_URL=/ VITE_BASE_PATH=/ npm run dev:web -- --host 127.0.0.1 --port 5173 --strictPort
```

Acesse `http://127.0.0.1:5173`. API padrão: `http://127.0.0.1:3000`.
Confira também `/health/live` e `/health/ready` da API.

O script existente `scripts/start-local-dev.sh` ainda contém mensagens e
fallbacks de WSL. Ele remove containers antigos de API/Web e encerra processos
nas portas configuradas; sua adaptação operacional permanece pendente. Nesta
retomada, prefira os comandos explícitos acima.

Homologação opcional com aplicação completa em containers:

```bash
docker compose --profile app up -d --build
```

Nesse modo, o frontend usa `http://127.0.0.1:8080`. O Compose não aplica
migrations automaticamente.

## Validação da retomada

1. Confirmar Git, Node.js 22/npm e dependências.
2. Confirmar banco recuperado e readiness da API.
3. Conferir login e relatórios com dados reais no navegador, incluindo
   impressão sem menu lateral, planilha e usuário restrito.
4. Ao completar o pacote funcional, executar `./Checar_alteracao.sh`.
5. Registrar resultados e SHA confirmado em `PROJECT_STATUS.md` e
   `NEXT_TASK.md` antes da publicação autorizada.

A revisão documental de 29/09/2026 não reexecutou testes, typecheck, lint ou
build, pois Node/npm estavam indisponíveis. A checagem estática de migrations
não consulta PostgreSQL e não confirma que elas foram aplicadas.

## Arquivos privados e auxiliares

Não versionar `.env`, `monitor.env`, credenciais, dumps, dependências ou builds.
O arquivo local `hrmmotos.com.br` é referência auxiliar de Nginx da VPS.
Preserve artefatos de análise e documentos de futuro ao recuperar o clone;
eles devem ser revisados separadamente, sem inclusão automática no commit.
