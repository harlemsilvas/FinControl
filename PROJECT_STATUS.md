# FinControl — Documento de Continuidade do Desenvolvimento

**Código:** DOC-11  
**Título:** Status do Projeto, Ordem das Fases e Instruções para Continuidade no Codex  
**Versão:** 0.2
**Status:** Aprovado para início da implementação  
**Data:** 16/07/2026  

## Atualização de execução — 16/07/2026

- Fases 1 e 2 concluídas e documentadas em docs/PHASE-1-2-VALIDATION.md.
- Fase 3 concluída pelos scripts verify_database.sql e test_financial_flow.sql.
- Fase 4, fundação técnica do backend, concluída e documentada em docs/PHASE-4-BACKEND-FOUNDATION.md.
- API Node.js 22, TypeScript e Fastify criada em apps/api.
- Health checks, conexão PostgreSQL, configuração, logs, erros, testes e build aprovados.
- Fase 5, autenticação e autorização, implementada e documentada em docs/PHASE-5-AUTHENTICATION-AUTHORIZATION.md.
- Fase 6, APIs de Cadastros e Tesouraria, concluída e documentada em docs/PHASE-6-MASTER-DATA-API.md.
- Fase 7, API de Contas a Pagar, concluída para o modelo atual e documentada em docs/PHASE-7-PAYABLES-API.md.
- Fase 8, testes ampliados do backend, concluída e documentada em docs/PHASE-8-BACKEND-TESTING.md.
- Fase 9, bootstrap do frontend, concluída e documentada em docs/PHASE-9-FRONTEND-FOUNDATION.md.
- Fase 10, frontend dos cadastros, concluída e documentada em docs/PHASE-10-MASTER-DATA-FRONTEND.md.
- Fase 11, frontend de Contas a Pagar, concluída para o modelo atual e documentada em docs/PHASE-11-PAYABLES-FRONTEND.md.
- Próxima fase oficial: Fase 12 — Dashboard e Agenda.

---

## 1. Objetivo deste documento

Este documento informa exatamente:

- o que já foi definido;
- o que já foi documentado;
- o que já foi gerado;
- em qual fase o projeto está;
- qual deve ser a ordem de continuidade;
- quais decisões não podem ser ignoradas;
- como o ambiente local deve funcionar;
- como o Codex deve prosseguir sem reiniciar a análise do zero.

Este arquivo deve ser colocado na raiz do repositório com o nome:

```text
PROJECT_STATUS.md
```

O Codex deve ler, nesta ordem:

1. `PROJECT_STATUS.md`
2. `AGENTS.md`
3. `README.md`
4. documentos em `docs/`
5. migrations em `database/migrations/`

---

# 2. Visão do produto

O FinControl será um ERP Financeiro modular.

O primeiro módulo funcional será:

```text
DOM-002 — Financeiro
└── Contas a Pagar
```

A arquitetura foi preparada para crescer para:

- Contas a Receber;
- Fluxo de Caixa;
- Tesouraria;
- Conciliação Bancária;
- Compras;
- Fiscal;
- Estoque;
- Contabilidade;
- Relatórios e Indicadores;
- Integrações bancárias e externas.

Princípios obrigatórios:

- Documentation First;
- arquitetura modular;
- baixo acoplamento;
- alta coesão;
- rastreabilidade;
- auditoria;
- exclusão lógica;
- migrations imutáveis;
- segurança por perfil e permissão;
- domínio financeiro separado dos demais domínios.

---

# 3. Estrutura oficial de domínios

## DOM-001 — Cadastros

Responsável por:

- fornecedores;
- categorias financeiras;
- centros de custo;
- tipos de documento;
- formas de pagamento;
- condições de pagamento;
- marcadores;
- demais dados mestres.

## DOM-002 — Financeiro

Responsável por:

- títulos a pagar;
- parcelas;
- aprovações;
- programação;
- pagamentos;
- pagamentos parciais;
- lotes;
- estornos;
- cancelamentos;
- importações XML.

## DOM-003 — Tesouraria

Responsável por:

- bancos;
- contas bancárias;
- fluxo de caixa;
- conciliação;
- integrações bancárias.

## DOM-004 — Administração

Responsável por:

- usuários;
- perfis;
- permissões;
- parâmetros;
- auditoria;
- logs;
- manutenção administrativa.

## DOM-005 — Inteligência e Relatórios

Responsável por:

- dashboard;
- agenda financeira;
- relatórios;
- indicadores;
- exportações.

## DOM-006 — Integrações

Responsável por:

- e-mail;
- WhatsApp;
- armazenamento externo;
- APIs externas;
- serviços bancários;
- serviços fiscais.

---

# 4. Decisões funcionais já aprovadas

## 4.1 Cadastro de Contas a Pagar

Campos obrigatórios na primeira página:

- Fornecedor;
- Categoria;
- Descrição / Histórico;
- Número do Documento;
- Tipo de Documento;
- Parcela;
- Data de Emissão;
- Data de Vencimento;
- Forma de Pagamento;
- Valor Original.

Campos opcionais:

- Série;
- Condição de Pagamento;
- Desconto;
- Acréscimo;
- Observação.

Campo calculado:

```text
Valor Total = Valor Original - Desconto + Acréscimo
```

## 4.2 Campos removidos ou realocados

- Projeto não faz parte da primeira página.
- Conta Bancária não aparece no cadastro inicial.
- Conta Bancária será informada na programação ou pagamento.
- Centro de Custo fica na aba Observações/Complementos.

## 4.3 Parcela

Formato obrigatório:

```text
1/1
1/5
2/5
5/5
```

Regras:

- parcela atual não pode ser maior que o total;
- títulos sem parcelamento usam `1/1`;
- parcelas podem ter valores diferentes;
- parcelas podem ter vencimentos diferentes;
- parcelas podem ter formas de pagamento diferentes;
- importação XML pode gerar parcelas automaticamente;
- lançamento manual exige preenchimento das parcelas.

## 4.4 Número do Documento

O Número do Documento é obrigatório.

Exemplos:

- número da Nota Fiscal;
- número do boleto;
- número do contrato;
- referência operacional;
- nome do fornecedor para contas sem documento formal, como ENEL ou SABESP.

## 4.5 Duplicidade

Ao detectar possível duplicidade:

- exibir alerta;
- permitir edição/correção;
- não bloquear automaticamente;
- permitir continuidade;
- registrar confirmação em auditoria quando houver prosseguimento.

Chave mínima de comparação:

- fornecedor;
- número do documento;
- série;
- parcela.

## 4.6 Pagamentos

- pagamento parcial é permitido;
- pagamento em lote é permitido;
- juros, multa, desconto e adicionais são informados por item;
- pagamento acima do saldo poderá ser permitido com alerta e confirmação;
- essa última regra ainda deve ser confirmada antes da implementação final da baixa.

## 4.7 Cancelamento e estorno

- cancelamento exige permissão concedida pelo Operador Master;
- título parcialmente pago somente pode ser cancelado após estorno dos pagamentos;
- estorno exige permissão;
- exclusões financeiras físicas não são permitidas para usuários comuns.

## 4.8 Aprovação

Quando aprovação estiver desativada:

```text
Título → Em Aberto
```

Quando reprovado:

- marcar como Reprovado;
- permitir Corrigir;
- permitir Cancelar.

---

# 5. Estados já definidos

Estados iniciais do título:

- Rascunho;
- Em Aberto;
- Em Aprovação;
- Aprovado;
- Programado;
- Parcialmente Pago;
- Pago;
- Atrasado;
- Reprovado;
- Cancelado.

`Estornado` é tratado como evento sobre o pagamento, com recálculo do estado do título ou parcela.

Regras essenciais:

- título Pago não pode ser cancelado sem estorno;
- título Cancelado não recebe pagamentos;
- parcela com saldo zero fica Paga;
- parcela com pagamento e saldo positivo fica Parcialmente Paga;
- vencimento ultrapassado e saldo positivo gera Atrasado;
- toda transição gera auditoria.

---

# 6. Modelo de dados já definido

Schemas:

```text
cadastros
financeiro
tesouraria
administracao
inteligencia
integracoes
```

Tabelas principais previstas ou já presentes nas migrations:

```text
administracao.users
administracao.roles
administracao.permissions
administracao.user_roles
administracao.role_permissions
administracao.audit_events
administracao.maintenance_operations
administracao.schema_versions

cadastros.suppliers
cadastros.financial_categories
cadastros.cost_centers
cadastros.document_types
cadastros.payment_methods
cadastros.payment_terms
cadastros.attachment_types

tesouraria.banks
tesouraria.bank_accounts

financeiro.payable_title_statuses
financeiro.payable_installment_statuses
financeiro.payment_statuses
financeiro.payment_batch_statuses
financeiro.approval_statuses
financeiro.xml_import_statuses

financeiro.payable_titles
financeiro.payable_installments
financeiro.tags
financeiro.payable_title_tags
financeiro.attachments
financeiro.approvals
financeiro.payment_batches
financeiro.payments
financeiro.payment_reversals
financeiro.xml_imports
```

Padrões:

- UUID com `pgcrypto`;
- `snake_case`;
- nomes técnicos em inglês;
- PK chamada `id`;
- FK chamada `<entity>_id`;
- timestamps com `timestamptz`;
- exclusão lógica com `deleted_at` e `deleted_by`;
- sem objetos no schema `public`;
- tabelas de domínio em vez de enums PostgreSQL;
- `ON DELETE RESTRICT` para histórico financeiro;
- `ON DELETE SET NULL` para referências opcionais;
- cascata lógica feita pela camada de serviço.

---

# 7. Migrations já geradas

Foi gerado um conjunto completo de migrations para o núcleo atual.

Ordem geral:

1. extensões;
2. schemas;
3. função de `updated_at`;
4. tabelas de status;
5. auditoria;
6. seeds de status;
7. usuários, perfis e permissões;
8. cadastros mestres;
9. bancos e contas;
10. títulos;
11. parcelas;
12. anexos e marcadores;
13. aprovações;
14. lotes;
15. pagamentos;
16. estornos;
17. XML;
18. funções de saldo;
19. exclusão lógica;
20. views;
21. manutenção;
22. validações;
23. grants;
24. versionamento de schema.

Antes de começar a API, as migrations devem ser executadas em um PostgreSQL real e validadas.

---

# 8. Arquitetura de desenvolvimento local

## Windows 11

Responsável por:

- PowerShell;
- Docker Desktop;
- container PostgreSQL;
- execução das migrations;
- administração do banco;
- backups locais.

## WSL 2 / Ubuntu

Responsável por:

- código-fonte;
- Node.js;
- backend;
- frontend;
- testes;
- arquivos do projeto;
- armazenamento local de anexos;
- VS Code em modo WSL;
- Codex no workspace WSL.

Estrutura esperada:

```text
/home/<usuario>/projects/fincontrol
```

O projeto não deve ser mantido em `/mnt/c`.

## Banco local

```env
DB_HOST=127.0.0.1
DB_PORT=5434
DB_NAME=fincontrol
DB_USER=fincontrol
```

No WSL com modo NAT, usar o gateway do Windows quando `127.0.0.1` não funcionar.

---

# 9. Arquitetura da VPS

Na VPS:

```text
Ubuntu
└── Docker Engine
    ├── API
    ├── frontend
    ├── PostgreSQL
    ├── proxy reverso
    └── volumes persistentes
```

Regras:

- PostgreSQL não deve ficar exposto à internet;
- aplicação usa `DB_HOST=postgres`;
- anexos ficam em volume persistente;
- backups devem sair da VPS;
- ambiente de produção não utiliza WSL nem Docker Desktop.

---

# 10. Status atual do projeto

## Concluído

- Project Charter;
- levantamento de necessidades;
- regras iniciais de negócio;
- decisões funcionais;
- visão do domínio;
- fluxos operacionais;
- máquina de estados;
- wireframe inicial;
- matriz de rastreabilidade;
- modelo conceitual;
- dicionário conceitual;
- modelo lógico;
- DER preliminar;
- modelo físico PostgreSQL;
- convenções de migrations;
- migrations completas do núcleo atual;
- script de criação do ambiente WSL;
- Docker Compose do PostgreSQL local;
- script PowerShell para migrations;
- instruções para VS Code e Codex.

## Não iniciado

- execução real das migrations;
- testes reais do banco;
- backend Node.js;
- frontend React;
- autenticação;
- API REST;
- testes automatizados;
- Docker de produção;
- CI/CD;
- implantação VPS.

## Pendente de decisão futura

- impostos;
- retenções;
- compensações;
- adiantamentos detalhados;
- regra definitiva de pagamento acima do saldo;
- aprovação multinível avançada;
- política de retenção de anexos;
- limites de tamanho dos arquivos;
- integrações bancárias.

---

# 11. Ordem correta das próximas fases

## Fase 1 — Subir o ambiente local

Objetivo:

- criar estrutura no WSL;
- subir PostgreSQL no Docker Desktop;
- configurar `.env`;
- abrir projeto no VS Code WSL.

Critério de aceite:

- `docker ps` mostra PostgreSQL saudável;
- API no WSL consegue conectar ao banco;
- VS Code abre `/home/<usuario>/projects/fincontrol`.

## Fase 2 — Validar o banco

Objetivo:

- copiar migrations para a pasta oficial;
- executar todas em ordem;
- corrigir falhas;
- validar schemas, tabelas, constraints, funções e views.

Critério de aceite:

```sql
SELECT schema_name
FROM information_schema.schemata
WHERE schema_name IN (
  'cadastros',
  'financeiro',
  'tesouraria',
  'administracao',
  'inteligencia',
  'integracoes'
);
```

Todos os schemas devem existir.

## Fase 3 — Testes de integridade do banco

Criar scripts para validar:

- criação de usuário;
- criação de fornecedor;
- criação de categoria;
- criação de título;
- criação de parcelas;
- alerta de duplicidade;
- pagamento parcial;
- pagamento integral;
- estorno;
- exclusão lógica;
- auditoria;
- importação XML simulada.

Nenhuma API deve começar antes de o núcleo do banco passar nesses testes.

## Fase 4 — Bootstrap do backend

Stack recomendado:

- Node.js 22;
- TypeScript;
- Express ou Fastify;
- PostgreSQL;
- validação de dados;
- logs estruturados;
- migrations externas e imutáveis;
- arquitetura modular por domínio.

Estrutura:

```text
apps/api/src/
├── common/
├── config/
├── domains/
├── infrastructure/
└── presentation/
```

Primeiros módulos:

1. health check;
2. configuração;
3. conexão com banco;
4. tratamento de erros;
5. logs;
6. autenticação;
7. usuários e permissões;
8. fornecedores;
9. categorias;
10. contas a pagar.

## Fase 5 — Autenticação e autorização

Implementar:

- login;
- hash seguro;
- access token;
- refresh token;
- perfis;
- permissões;
- Operador Master;
- autorização por ação;
- auditoria de login e operações críticas.

## Fase 6 — API de Cadastros

Ordem:

1. fornecedores;
2. categorias;
3. centro de custo;
4. tipo de documento;
5. forma de pagamento;
6. condição de pagamento;
7. bancos;
8. contas bancárias.

## Fase 7 — API de Contas a Pagar

Implementar:

1. criar título;
2. editar título;
3. consultar;
4. listar;
5. duplicidade;
6. parcelas;
7. anexos;
8. marcadores;
9. cancelamento;
10. aprovação;
11. pagamento;
12. estorno;
13. lote;
14. importação XML.

## Fase 8 — Testes do backend

Criar:

- unitários;
- integração;
- contrato;
- autorização;
- banco;
- transações;
- concorrência;
- auditoria.

## Fase 9 — Bootstrap do frontend

Stack:

- React;
- Vite;
- TypeScript;
- Tailwind;
- roteamento;
- gerenciamento de estado;
- cliente HTTP;
- formulários;
- validação;
- design system.

## Fase 10 — Frontend dos cadastros

Ordem:

1. login;
2. layout;
3. menu;
4. fornecedores;
5. categorias;
6. auxiliares.

## Fase 11 — Frontend de Contas a Pagar

Implementar o wireframe oficial:

- Dados da Conta;
- Parcelas;
- Impostos;
- Aprovações;
- Anexos;
- Observações.

A primeira página não deve conter:

- Projeto;
- Conta Bancária;
- Centro de Custo.

## Fase 12 — Dashboard e Agenda

Implementar:

- total a pagar;
- vencidos;
- a vencer;
- pagos;
- agenda diária;
- agenda semanal;
- agenda mensal;
- destaques visuais;
- gráficos;
- filtros.

## Fase 13 — Docker da aplicação

Criar:

- Dockerfile API;
- Dockerfile frontend;
- compose de desenvolvimento;
- compose de produção;
- volumes;
- health checks;
- rede privada.

## Fase 14 — CI/CD

Criar pipeline para:

- lint;
- testes;
- build;
- validação de migrations;
- geração de imagem;
- deploy controlado.

## Fase 15 — VPS

Executar:

- provisionamento Ubuntu;
- instalação Docker;
- configuração de volumes;
- configuração de proxy;
- SSL;
- banco;
- API;
- frontend;
- backups;
- monitoramento;
- rollback.

---

# 12. Primeira tarefa que o Codex deve executar

A primeira tarefa do Codex não é criar telas.

A primeira tarefa é:

```text
Validar o ambiente local e executar todas as migrations em uma instância real do PostgreSQL.
```

Passos:

1. conferir os arquivos de bootstrap;
2. conferir a ordem das migrations;
3. subir o container;
4. executar migrations;
5. corrigir erros por novas migrations;
6. criar `database/scripts/verify_database.sql`;
7. criar `database/scripts/test_financial_flow.sql`;
8. documentar o resultado;
9. somente então iniciar o backend.

---

# 13. Restrições para o Codex

O Codex não deve:

- reiniciar o projeto do zero;
- mudar os nomes dos domínios;
- criar tabelas no schema `public`;
- mover PostgreSQL para dentro do WSL;
- colocar código em `/mnt/c`;
- editar migrations já aplicadas;
- usar exclusão física como padrão;
- colocar Conta Bancária no cadastro inicial;
- recolocar Projeto na primeira página;
- recolocar Centro de Custo na primeira página;
- bloquear automaticamente a duplicidade;
- ignorar auditoria;
- iniciar frontend antes de validar banco e API.

---

# 14. Definição de pronto para a etapa atual

A etapa de infraestrutura e banco será considerada pronta quando:

- estrutura WSL criada;
- PostgreSQL saudável;
- migrations aplicadas sem erro;
- scripts de verificação aprovados;
- dados mínimos inseridos;
- conexão Node.js testada;
- documentação atualizada;
- commit inicial criado;
- projeto aberto no VS Code WSL;
- Codex consegue executar testes e comandos no workspace.

---

# 15. Próximo marco

Após a validação do banco, o próximo marco será:

```text
MVP Backend — Fundação Técnica
```

Entregáveis:

- workspace Node.js;
- API TypeScript;
- health check;
- conexão PostgreSQL;
- configuração por ambiente;
- logs;
- erros padronizados;
- autenticação;
- autorização;
- auditoria;
- primeiro endpoint de fornecedores.
