# DOC-00.2 — Domínios de Negócio do FinControl

**Projeto:** FinControl  
**Código:** DOC-00.2  
**Versão:** 0.1  
**Status:** Aprovado  
**Data:** 16/07/2026  

## 1. Objetivo

Organizar o FinControl por domínios de negócio, garantindo separação clara de responsabilidades, baixo acoplamento, evolução modular e melhor rastreabilidade entre requisitos, regras, banco de dados, APIs e testes.

## 2. Estrutura Oficial de Domínios

### DOM-001 — Cadastros

Responsável pelos dados mestres utilizados pelos demais domínios.

#### Módulos previstos

- Empresas
- Filiais
- Fornecedores
- Categorias Financeiras
- Centros de Custo
- Formas de Pagamento
- Tipos de Documento
- Condições de Pagamento
- Marcadores

#### Responsabilidades

- Criar e manter dados cadastrais.
- Controlar situação ativa ou inativa.
- Expor dados por contratos padronizados.
- Não executar regras financeiras de pagamento.

---

### DOM-002 — Financeiro

Responsável pelas obrigações financeiras e seu ciclo de vida.

#### Módulos previstos

- Contas a Pagar
- Parcelas
- Aprovações
- Programação de Pagamentos
- Pagamentos
- Adiantamentos
- Cancelamentos
- Estornos
- Recorrências

#### Responsabilidades

- Registrar títulos.
- Controlar vencimentos.
- Controlar saldos.
- Processar pagamentos integrais e parciais.
- Controlar aprovação, cancelamento e estorno.
- Publicar eventos financeiros para os demais domínios.

---

### DOM-003 — Tesouraria

Responsável pela movimentação efetiva de recursos financeiros.

#### Módulos previstos

- Bancos
- Contas Bancárias
- Fluxo de Caixa
- Conciliação Bancária
- Lotes de Pagamento
- Integrações Bancárias
- CNAB
- OFX
- PIX

#### Responsabilidades

- Controlar contas bancárias.
- Registrar origem e destino dos recursos.
- Apoiar programação e execução dos pagamentos.
- Realizar conciliações.
- Não alterar diretamente o cadastro de títulos.

---

### DOM-004 — Administração

Responsável pela governança e configuração do sistema.

#### Módulos previstos

- Usuários
- Perfis
- Permissões
- Configurações
- Parâmetros
- Auditoria
- Logs
- Configurações Regionais

#### Responsabilidades

- Controlar autenticação e autorização.
- Definir permissões por ação.
- Manter parâmetros globais e por empresa.
- Registrar eventos de auditoria.
- Administrar configurações que ativam ou desativam funcionalidades.

---

### DOM-005 — Inteligência e Relatórios

Responsável por consultas, indicadores e análise gerencial.

#### Módulos previstos

- Dashboard
- Agenda Financeira
- Relatórios
- Indicadores
- Exportações
- Notificações

#### Responsabilidades

- Consolidar informações.
- Exibir KPIs.
- Gerar relatórios e exportações.
- Não alterar dados operacionais.
- Respeitar permissões e segregação de dados.

---

### DOM-006 — Integrações

Responsável por comunicação com serviços externos.

#### Módulos previstos

- E-mail
- WhatsApp
- Armazenamento de arquivos
- APIs externas
- ERPs externos
- Serviços bancários
- Serviços fiscais

#### Responsabilidades

- Isolar dependências externas.
- Padronizar contratos de integração.
- Controlar falhas, retentativas e logs.
- Evitar dependência direta dos domínios com fornecedores externos.

## 3. Regras de Comunicação entre Domínios

1. Um domínio não poderá acessar diretamente a lógica interna de outro.
2. A comunicação ocorrerá por serviços, contratos ou eventos documentados.
3. Dados mestres serão consultados pelo domínio consumidor, mas alterados apenas pelo domínio responsável.
4. Relatórios e indicadores não poderão modificar dados operacionais.
5. Integrações externas deverão ser isoladas no DOM-006.
6. Auditoria será transversal, mas administrada pelo DOM-004.
7. Conta Bancária pertence ao DOM-003 e não ao cadastro inicial de títulos no DOM-002.

## 4. Mapeamento Inicial

| Funcionalidade | Domínio |
|---|---|
| Cadastro de fornecedor | DOM-001 |
| Cadastro de categoria | DOM-001 |
| Cadastro de conta a pagar | DOM-002 |
| Parcela | DOM-002 |
| Pagamento parcial | DOM-002 |
| Programação de pagamento | DOM-002 / DOM-003 |
| Conta bancária | DOM-003 |
| Conciliação bancária | DOM-003 |
| Usuários e permissões | DOM-004 |
| Auditoria | DOM-004 |
| Dashboard | DOM-005 |
| Agenda Financeira | DOM-005 |
| Exportações | DOM-005 |
| Envio por e-mail e WhatsApp | DOM-006 |

## 5. Impacto na Organização da Documentação

Cada domínio possuirá sua própria pasta:

```text
docs/domains/
├── DOM-001-Cadastros/
├── DOM-002-Financeiro/
├── DOM-003-Tesouraria/
├── DOM-004-Administracao/
├── DOM-005-Inteligencia-Relatorios/
└── DOM-006-Integracoes/
```

Cada pasta poderá conter:

- requisitos;
- regras de negócio;
- casos de uso;
- fluxos;
- wireframes;
- dicionário de dados;
- eventos;
- APIs;
- testes.

## 6. Status de Implementação

| Domínio | Status |
|---|---|
| DOM-001 — Cadastros | Em documentação |
| DOM-002 — Financeiro | Em documentação ativa |
| DOM-003 — Tesouraria | Planejado |
| DOM-004 — Administração | Em documentação inicial |
| DOM-005 — Inteligência e Relatórios | Em documentação inicial |
| DOM-006 — Integrações | Backlog |
