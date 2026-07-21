# Fase 14 — CI/CD

**Data:** 16/07/2026
**Status:** concluída
**Próxima fase:** Fase 15 — VPS

## Pipelines

### CI

O workflow `.github/workflows/ci.yml` é executado em pull requests e pushes para `main`, `agent/**` e `feature/**`.

Ele valida:

- instalação reproduzível com `npm ci` e Node.js 22;
- lint, TypeScript, testes rápidos e build de API e frontend;
- convenções de nome, ordem, unicidade e transação das migrations;
- aplicação integral das migrations em PostgreSQL 17 vazio;
- estrutura do banco e isolamento do schema `public`;
- fluxo financeiro transacional;
- testes de integração da API no PostgreSQL real;
- build das imagens de API e frontend sem publicação.

### Publicação de imagens

O workflow `.github/workflows/publish-images.yml` publica no GitHub Container Registry:

- `ghcr.io/<owner>/fincontrol-api`;
- `ghcr.io/<owner>/fincontrol-web`.

A publicação ocorre por tag `v*` ou acionamento manual. O token automático do GitHub recebe somente `contents: read` e `packages: write`.

### Deploy híbrido controlado

O workflow `.github/workflows/deploy-vps.yml` somente pode ser iniciado manualmente. Ele exige:

- referência Git explícita;
- confirmação textual `DEPLOY`;
- aprovação do environment GitHub `production`;
- exclusão mútua de deploys;
- host conhecido e chave SSH fornecidos por secrets;
- script remoto `/opt/fincontrol/bin/deploy`, que será criado e validado na Fase 15.

O script remoto atualizará a API nativa sob PM2 e o frontend estático sob Nginx. O PostgreSQL será mantido por um Compose dedicado e não será recriado a cada deploy da aplicação.

O workflow não está operacional antes da Fase 15 e não executa deploy automático em push.

## Configuração necessária no GitHub

Antes do primeiro deploy, criar o environment `production`, configurar revisores obrigatórios e cadastrar:

- `VPS_HOST`;
- `VPS_USER`;
- `VPS_SSH_KEY`;
- `VPS_KNOWN_HOSTS`.

Nenhum segredo de produção deve ser salvo no repositório ou em variável comum de workflow.

## Proteção recomendada da branch

Após o workflow existir na branch principal, exigir os checks:

- `Quality and build`;
- `PostgreSQL migrations and integration`;
- `Container images`.

Também exigir pull request e impedir merge enquanto os checks estiverem pendentes ou falhando.

## Validação local

- script de migrations aprovado para os 28 arquivos existentes;
- arquivos YAML revisados e `git diff --check` aprovado;
- suíte local, integração PostgreSQL e builds já aprovados nas Fases 12 e 13;
- execução efetiva no GitHub Actions depende de commit e push destes workflows.
