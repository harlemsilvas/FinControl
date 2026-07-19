# Ambiente de desenvolvimento e GitHub

## Fluxo oficial de trabalho

O projeto deve permanecer em `/home/harlem/projetos/FinControl`.

Fluxo padrao para evitar conflito de caminho entre Windows e WSL:

1. abrir um terminal no Windows apenas para entrar no Ubuntu WSL;
2. no Ubuntu, acessar `/home/harlem/projetos/FinControl`;
3. executar comandos do projeto sempre dentro do WSL;
4. abrir `code .` somente quando precisar editar arquivos.

Exemplo:

```bash
cd /home/harlem/projetos/FinControl
code .
```

No canto inferior esquerdo do VS Code deve aparecer `WSL: Ubuntu`. Nao abra o projeto por `/mnt/c`, nao rode Node.js pelo Windows e nao use a pasta UNC `\\wsl.localhost\...` como ponto principal de trabalho.

## Arquivos locais de referencia

Arquivos auxiliares de analise operacional da VPS podem existir localmente sem entrar no versionamento. O arquivo `hrmmotos.com.br`, por exemplo, e apenas referencia de configuracao Nginx da VPS e nao faz parte do ambiente local de execucao.

## Distribuicao das ferramentas

- Node.js, npm, codigo, testes e Git: Ubuntu WSL;
- PostgreSQL: Docker Desktop no Windows;
- conexao local: `127.0.0.1:5434`;
- segredos locais: `.env`, nunca versionado.

## Docker local

Use a integracao WSL do Docker Desktop; nao instale outro daemon Docker dentro do Ubuntu.

Para o desenvolvimento diario, mantenha apenas o PostgreSQL em container:

```bash
docker compose up -d postgres
npm run dev:api
npm run dev:web
```

Para validar as imagens da aplicacao completa:

```bash
docker compose --profile app up -d --build
```

Nesse modo, acesse `http://127.0.0.1:8080`. A VPS usa Node.js e Nginx nativos; consulte `docs/PHASE-13-LOCAL-CONTAINERS.md`.

Para reinstalar ou validar o Node.js 22:

```bash
bash scripts/setup-wsl-dev.sh
node --version
npm --version
```

## Conectar ao GitHub pelo VS Code

Antes do primeiro commit, configure a identidade Git no terminal WSL:

```bash
git config --global user.name "SEU NOME"
git config --global user.email "EMAIL_USADO_NO_GITHUB"
```

1. Abra o projeto em `WSL: Ubuntu`.
2. Abra **Controle do Codigo-Fonte** (`Ctrl+Shift+G`).
3. Entre na conta GitHub quando solicitado.
4. Depois do primeiro commit, escolha **Publish Branch** ou **Publicar no GitHub**.
5. Escolha conscientemente se o repositorio sera privado ou publico.
6. Confirme no GitHub que `.env` nao foi enviado.

## Conectar por terminal

Crie no GitHub um repositorio vazio, sem README ou `.gitignore` adicionais.
Depois, no terminal WSL, escolha HTTPS ou SSH:

```bash
git remote add origin https://github.com/SEU_USUARIO/FinControl.git
git push -u origin main
```

```bash
git remote add origin git@github.com:SEU_USUARIO/FinControl.git
git push -u origin main
```

Antes de publicar:

```bash
git status
git remote -v
git ls-files .env
```

O ultimo comando nao deve retornar nenhum arquivo.

## Fluxo Git minimo

```bash
git switch -c feature/nome-da-alteracao
git add caminho/dos/arquivos
git commit -m "tipo: descricao objetiva"
git push -u origin feature/nome-da-alteracao
```

Nao versionar credenciais, dumps locais, `node_modules`, builds ou estado de ferramentas.
