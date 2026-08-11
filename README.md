# FinControl

**ERP Financeiro Full Stack para organização, automação e controle da rotina financeira empresarial.**

O **FinControl** é um sistema financeiro modular desenvolvido para centralizar processos administrativos e financeiros, começando pelo módulo de **Contas a Pagar** e preparado arquiteturalmente para expansão para novos domínios.

O projeto foi desenvolvido com foco em arquitetura modular, segurança, rastreabilidade, qualidade de código, documentação e evolução contínua.

> Status atual: sistema em desenvolvimento ativo, já com deploy validado em VPS
> e evolução contínua do módulo financeiro. O FinControl não deve ser tratado
> como produto finalizado; o README separa funcionalidades existentes de roadmap.

---

## Visão Geral

O FinControl nasceu com o objetivo de criar uma plataforma financeira capaz de evoluir gradualmente para um ERP mais completo.

A aplicação atualmente contempla funcionalidades relacionadas a:

* Autenticação, autorização, perfis e permissões
* Administração de usuários com recuperação de senha por e-mail
* Controle multiempresa por filtros explícitos nas telas operacionais
* Cadastros financeiros e operacionais
* Fornecedores, categorias, centros de custo e marcadores
* Tipos de documento, formas e condições de pagamento
* Notas Fiscais e Contas, preservando o domínio técnico de Contas a Pagar
* Contas recorrentes com geração, pré-visualização, revisão futura e cancelamento de série
* Baixa de pagamentos com juros, multa, acréscimos, desconto e estorno auditado
* Saldo oficial, saldo inicial, entrada provisória de caixa e movimentos de conta bancária
* Dashboard financeiro e Agenda financeira
* Importação e acompanhamento operacional de XMLs de NFe
* Validação do destinatário do XML pelo CNPJ cadastrado em Empresas
* Backups PostgreSQL com geração, listagem e exportação por usuários autorizados
* API REST com documentação interativa Swagger / OpenAPI
* Testes automatizados, typecheck, lint e validações de integração
* Infraestrutura para desenvolvimento local e produção em VPS

A arquitetura foi preparada para permitir a evolução futura para outros módulos financeiros e administrativos.

---

## Tecnologias

### Frontend

* React 19
* TypeScript
* Vite
* React Router
* TanStack React Query
* React Hook Form
* Zod
* Axios
* Tailwind CSS
* Vitest
* Testing Library

### Backend

* Node.js 22
* TypeScript
* Fastify
* PostgreSQL
* Zod
* Swagger / OpenAPI
* Vitest
* ESLint

### Infraestrutura e DevOps

* Docker
* Docker Compose
* Ubuntu Linux
* Nginx
* PM2
* Git
* GitHub
* GitHub Actions
* VPS

---

## Arquitetura

O projeto utiliza uma arquitetura separada entre frontend, backend e banco de dados.

```text
FinControl
│
├── apps
│   ├── api        → Backend / API REST
│   └── web        → Frontend React
│
├── database       → Migrations e estrutura do PostgreSQL
│
├── deploy         → Recursos de implantação
│
├── docs           → Documentação técnica e funcional
│
├── compose.yaml   → Ambiente com Docker
│
└── README.md
```

A separação dos componentes facilita manutenção, testes, implantação e evolução independente das diferentes partes da aplicação.

---

## Funcionalidades Implementadas

### Administração e segurança

* Login com JWT, refresh token e proteção de rotas
* Perfis, permissões e autorização por ação
* Administração de usuários
* Vínculo de usuários a empresas permitidas
* Recuperação/redefinição de senha com token e envio SMTP
* Auditoria de operações sensíveis

### Cadastros

* Empresas matriz/filial
* Parâmetros por empresa
* Fornecedores
* Categorias financeiras
* Centros de custo
* Tipos de documento
* Formas e condições de pagamento
* Bancos e contas bancárias

### Financeiro

* Notas Fiscais e Contas
* Lançamento manual com empresa obrigatória
* Parcelas, vencimentos e descrição por parcela
* Alerta de possível duplicidade com confirmação consciente
* Recorrências com geração por janela, revisão futura e cancelamento de série
* Agenda financeira mensal, semanal e diária
* Baixa de pagamentos com cálculo do valor movimentado
* Histórico de pagamentos com filtros, paginação e estorno
* Movimentos de tesouraria vinculados aos pagamentos

### XML de NFe

* Leitura de XML no frontend
* Prévia de chave, emitente, destinatário, valores, vencimentos e itens
* Bloqueio de importação quando o CNPJ destinatário não existe em Empresas
* Vinculação automática à empresa destinatária cadastrada
* Geração de conta a pagar a partir do XML importado
* Listagem, detalhe, reprocessamento e exclusão lógica de XMLs importados

### Operação e infraestrutura

* Dashboard financeiro
* Backups PostgreSQL pela interface web para usuários autorizados
* Scripts versionados de backup e restore na VPS
* Versionamento visível no frontend com versão, release e SHA
* Deploy controlado por SHA imutável via GitHub Actions

---

## Backend

A API do FinControl foi desenvolvida utilizando **Node.js, TypeScript e Fastify**.

Entre os recursos implementados estão:

* Configuração estruturada da aplicação
* Conexão com PostgreSQL
* Health checks
* Tratamento centralizado de erros
* Logs
* Autenticação
* Autorização
* Controle de permissões
* APIs de cadastros
* APIs financeiras
* API de Contas a Pagar
* Validação de dados com Zod
* Testes automatizados
* Testes de integração
* Documentação Swagger / OpenAPI

---

## Frontend

O frontend utiliza **React + TypeScript + Vite**.

A aplicação possui estrutura para:

* Autenticação
* Navegação entre módulos
* Cadastros
* Gestão de Contas a Pagar
* Dashboard financeiro
* Agenda financeira
* Integração com a API
* Formulários com validação
* Gerenciamento de consultas e estado remoto
* Testes de componentes

---

## Banco de Dados

O sistema utiliza **PostgreSQL** como banco de dados relacional.

A evolução do banco é controlada através de migrations, seguindo princípios como:

* rastreabilidade;
* integridade dos dados;
* migrations imutáveis;
* auditoria;
* exclusão lógica;
* separação de domínios.

---

## Segurança

O projeto possui mecanismos de:

* autenticação;
* autorização;
* perfis de acesso;
* controle de permissões;
* recuperação de senha por token;
* auditoria de operações sensíveis;
* validação de dados;
* separação de configurações por ambiente;
* utilização de variáveis de ambiente.

Arquivos contendo credenciais, chaves privadas, backups ou segredos não devem ser armazenados no repositório.

Utilize o arquivo:

```text
.env.example
```

como referência para configurar o ambiente local.

---

## Testes e Qualidade

O projeto possui rotinas para:

```bash
npm run lint
npm run typecheck
npm run test
npm run test:integration
npm run build
```

As verificações incluem:

* análise estática;
* validação TypeScript;
* testes unitários;
* testes de integração;
* build da aplicação.

---

## Documentação da API

O backend disponibiliza documentação interativa utilizando:

**Swagger UI / OpenAPI**

A documentação permite consultar endpoints, contratos e estruturas utilizadas pela API.

---

## Deploy

O FinControl possui ambiente de implantação validado em **VPS Linux**.

Ambiente publicado:

```text
https://hrmmotos.com.br/fincontrol/
```

Swagger / OpenAPI:

```text
https://hrmmotos.com.br/fincontrol/docs/
```

A arquitetura atualmente utilizada contempla:

```text
Internet
   │
   ▼
Nginx
   │
   ├── Frontend React
   │
   └── API Node.js
          │
          ▼
      PostgreSQL
```

No ambiente de produção:

* PostgreSQL é executado em container Docker;
* API Node.js é gerenciada pelo PM2;
* frontend React é publicado como aplicação estática;
* Nginx atua como servidor web e proxy reverso.

O projeto também possui estrutura de CI/CD utilizando GitHub Actions.

O deploy recomendado é o workflow **Deploy VPS Native**, acionado manualmente com:

* `deploy_ref`: branch, tag ou SHA imutável;
* `run_checks`: validação antes do deploy;
* `confirmation`: valor `DEPLOY`.

O deploy nativo executa o script controlado da VPS e publica exatamente o commit resolvido.

Último deploy validado registrado na continuidade:

```text
commit d107d1d
workflow run 31543548787
```

O commit posterior `ebe63c1` registra apenas documentação de continuidade pós-deploy.

---

## Metodologia de Desenvolvimento

O FinControl segue uma abordagem **Documentation First**.

Antes da implementação de novas fases, requisitos, decisões arquiteturais e responsabilidades dos componentes são documentados.

Princípios adotados:

* Arquitetura modular
* Baixo acoplamento
* Alta coesão
* Código limpo
* Segurança
* Escalabilidade
* Rastreabilidade
* Versionamento contínuo
* Desenvolvimento incremental
* Documentação técnica

---

## Evolução do Projeto

A arquitetura está preparada para expansão futura para módulos como:

* Contas a Receber
* Fluxo de Caixa
* Conciliação Bancária
* Compras
* Fiscal
* Estoque
* Contabilidade
* Relatórios e indicadores
* Integrações bancárias
* Integrações externas
* Sistema próprio de notificações toast
* Sincronização futura de comprovantes com armazenamento externo

Esses módulos representam a evolução planejada da arquitetura e não necessariamente funcionalidades já disponíveis na versão atual.

Para evitar confusão entre estado atual e roadmap, a continuidade funcional e arquitetural fica registrada nos documentos vivos do projeto, especialmente em `AI_CONTEXT.md`, `PROJECT_STATUS.md`, `NEXT_TASK.md` e nos arquivos `docs/FUTURE-*.md`.

---

## Capturas de Tela

As capturas reais do sistema serão adicionadas ao README quando houver um conjunto estável para apresentação pública.

Sugestão de conjunto mínimo:

* Dashboard financeiro
* Agenda financeira
* Notas Fiscais e Contas
* Cadastro operacional ou Backups

---

## Estrutura da Documentação

A documentação técnica está disponível em:

```text
/docs
```

O arquivo:

```text
PROJECT_STATUS.md
```

mantém o histórico de evolução, decisões arquiteturais, fases concluídas e orientações para continuidade do desenvolvimento.

---

## Objetivo do Projeto

Além de atender uma necessidade real de controle financeiro empresarial, o FinControl também demonstra na prática conhecimentos em:

* Desenvolvimento Full Stack
* React
* TypeScript
* Node.js
* APIs REST
* PostgreSQL
* Modelagem de dados
* Arquitetura de software
* Autenticação e autorização
* Testes automatizados
* Docker
* Linux
* Nginx
* CI/CD
* Git e GitHub
* Deploy de aplicações
* Documentação técnica

---

## Status

**Em desenvolvimento ativo.**

Principais etapas já implementadas:

* Fundação do banco de dados
* Backend
* Autenticação e autorização
* Administração de usuários
* APIs de cadastros
* APIs financeiras
* Notas Fiscais e Contas / Contas a Pagar
* Recorrências
* Pagamentos e saldo oficial
* Backups operacionais
* Testes do backend
* Frontend
* Cadastros
* Interface de Notas Fiscais e Contas
* Dashboard
* Agenda
* Containers
* Estrutura de CI/CD
* Provisionamento de VPS
* Deploy manual controlado
* Deploy nativo controlado por SHA
* Swagger / OpenAPI

Validação completa mais recente executada localmente e repetida no CI:

```bash
git diff --check
bash scripts/validate-migrations.sh
npm run typecheck
npm run lint
npm test
npm run build
```

Resultado local do último pacote funcional:

* API: 101 testes aprovados e 5 integrações opt-in puladas
* Web: 50 testes aprovados
* Build de API e frontend aprovado
* CI do GitHub aprovado após push

O desenvolvimento continua de forma incremental e documentada.

---

## Autor

**Harlem Afonso Claumann Silva**

Analista de Sistemas | Desenvolvedor de Software | Integrações

GitHub:
https://github.com/harlemsilvas
