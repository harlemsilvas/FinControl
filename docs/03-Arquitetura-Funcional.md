# Documento 03 — Arquitetura Funcional

**Projeto:** FinControl  
**Status:** Rascunho inicial  
**Versão:** 0.1  

## 1. Objetivo

Definir a organização funcional dos módulos, suas responsabilidades e os limites de comunicação.

## 2. Contextos funcionais

### Cadastros

Responsável por dados mestres:

- Empresas
- Fornecedores
- Bancos
- Contas bancárias
- Categorias
- Centros de custo
- Projetos
- Formas de pagamento

### Contas a Pagar

Responsável pelo ciclo de vida dos títulos:

- Inclusão
- Classificação
- Parcelamento
- Aprovação
- Programação
- Pagamento
- Estorno
- Cancelamento

### Agenda Financeira

Responsável por apresentar compromissos vencidos, do dia e futuros.

### Relatórios e Indicadores

Responsável por consolidar dados sem alterar o domínio operacional.

### Administração

Responsável por usuários, perfis, permissões, parâmetros e auditoria.

## 3. Princípios

- Módulos não acessam diretamente a lógica interna de outros módulos.
- A comunicação ocorrerá por serviços e contratos documentados.
- Regras de negócio pertencem ao domínio correspondente.
- Interfaces devem ser estáveis e versionadas.
- Eventos relevantes poderão ser publicados para integração entre módulos.

## 4. Dependências iniciais

O módulo Contas a Pagar poderá consultar:

- Empresa
- Fornecedor
- Categoria
- Centro de custo
- Projeto
- Conta bancária
- Forma de pagamento

O módulo não deverá alterar diretamente esses cadastros.
