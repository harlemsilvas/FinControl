# Ambiente de desenvolvimento e GitHub

## Abrir o projeto corretamente no VS Code

O projeto deve permanecer em `/home/harlem/projetos/FinControl`.

No terminal Ubuntu:

```bash
cd /home/harlem/projetos/FinControl
code .
```

No canto inferior esquerdo deve aparecer `WSL: Ubuntu`. Não abra o projeto por
`/mnt/c` nem execute o backend pelo Node.js do Windows.

## Distribuição das ferramentas

- Node.js, npm, código, testes e Git: Ubuntu WSL;
- PostgreSQL: Docker Desktop no Windows;
- conexão local: `127.0.0.1:5434`;
- segredos locais: `.env`, nunca versionado.

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
2. Abra **Controle do Código-Fonte** (`Ctrl+Shift+G`).
3. Entre na conta GitHub quando solicitado.
4. Depois do primeiro commit, escolha **Publish Branch** ou **Publicar no GitHub**.
5. Escolha conscientemente se o repositório será privado ou público.
6. Confirme no GitHub que `.env` não foi enviado.

## Conectar por terminal

Crie no GitHub um repositório vazio, sem README ou `.gitignore` adicionais.
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

O último comando não deve retornar nenhum arquivo.

## Fluxo Git mínimo

```bash
git switch -c feature/nome-da-alteracao
git add caminho/dos/arquivos
git commit -m "tipo: descrição objetiva"
git push -u origin feature/nome-da-alteracao
```

Não versionar credenciais, dumps locais, `node_modules`, builds ou estado de ferramentas.
