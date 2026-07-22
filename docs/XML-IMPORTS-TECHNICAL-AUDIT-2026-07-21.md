# Auditoria Técnica — XML Imports

**Data:** 21/07/2026  
**Status:** concluída  
**Escopo:** levantamento técnico do estado atual da importação XML para orientar a Trilha A do plano de evolução operacional.

## 1. Resumo executivo

O FinControl já possui uma base funcional consistente para importação XML de NFe em `DOM-002`, cobrindo:

- recepção do XML bruto;
- extração de metadados relevantes;
- classificação do destinatário como `MAIN`, `BRANCH` ou `UNKNOWN`;
- criação automática e controlada de fornecedor por documento;
- geração manual de título a pagar a partir do XML;
- listagem bruta dos XMLs importados.

As principais lacunas identificadas para a próxima entrega são:

- a listagem atual de XMLs não possui paginação nem filtros estruturados;
- não existe endpoint de detalhe por XML;
- não existe reprocessamento explícito;
- não existe exclusão lógica;
- `financeiro.xml_imports` ainda não possui `deleted_at` nem `deleted_by`;
- o frontend oficial ainda não possui página dedicada para consulta operacional dos XMLs já importados.

## 2. Banco de dados atual

### Migrations revisadas

- [202607162210_financeiro_create_xml_imports.sql](/mnt/c/Projetos/FinControl/database/migrations/202607162210_financeiro_create_xml_imports.sql)
- [202607191500_financeiro_expand_xml_imports_payload.sql](/mnt/c/Projetos/FinControl/database/migrations/202607191500_financeiro_expand_xml_imports_payload.sql)
- [202607191610_financeiro_add_xml_import_recipient_company.sql](/mnt/c/Projetos/FinControl/database/migrations/202607191610_financeiro_add_xml_import_recipient_company.sql)
- [202607192130_financeiro_link_xml_import_supplier.sql](/mnt/c/Projetos/FinControl/database/migrations/202607192130_financeiro_link_xml_import_supplier.sql)

### Estrutura existente em `financeiro.xml_imports`

Campos já cobertos:

- identidade da importação;
- chave de acesso;
- vínculo opcional com anexo;
- XML bruto;
- metadados do arquivo;
- dados principais do fornecedor;
- vínculo opcional com fornecedor resolvido;
- dados do destinatário;
- classificação `recipient_kind`;
- documento da matriz informado pelo usuário;
- dados básicos do documento fiscal;
- valores financeiros principais;
- `parsed_data` em `jsonb`;
- `processed_at`;
- vínculo opcional com título gerado;
- status da importação;
- usuário importador.

### Estrutura existente em `financeiro.xml_import_installments`

Já há tabela própria para:

- número da parcela;
- vencimento;
- valor;
- forma de pagamento bruta;
- observações.

### Lacunas no banco

Lacunas objetivas encontradas:

- ausência de `deleted_at` em `financeiro.xml_imports`;
- ausência de `deleted_by` em `financeiro.xml_imports`;
- ausência de índice parcial específico para consultas ativas após soft delete;
- ausência de convenção explícita para ignorar registros excluídos na listagem atual.

## 3. Backend atual

### Rotas revisadas

Arquivo:
- [payables-routes.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-routes.ts)

### Rotas já existentes

- `POST /api/v1/xml-imports`
- `POST /api/v1/xml-imports/:id/generate-payable`
- `GET /api/v1/xml-imports`

### Comportamento atual de `GET /api/v1/xml-imports`

A listagem atual:

- não recebe filtros;
- não pagina;
- retorna SQL direto sem repository dedicado;
- retorna todos os XMLs ordenados por `imported_at DESC`;
- não considera exclusão lógica porque ela ainda não existe.

### Repository revisado

Arquivo:
- [payables-repository.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-repository.ts)

### Capacidades já existentes no repository

- criação de importação XML;
- criação automática de fornecedor quando aplicável;
- geração de título a pagar a partir do XML;
- auditoria das operações principais.

### Lacunas no backend

- ausência de `listXmlImports` com paginação e filtros;
- ausência de `getXmlImport`;
- ausência de `reprocessXmlImport`;
- ausência de `deleteXmlImport`;
- ausência de validações Zod para filtros da listagem avançada;
- ausência de contrato HTTP de detalhe e mutações operacionais.

## 4. Frontend atual

### Arquivos revisados

- [xml-import-dialog.tsx](/mnt/c/Projetos/FinControl/apps/web/src/payables/xml-import-dialog.tsx)
- [payables-list-page.tsx](/mnt/c/Projetos/FinControl/apps/web/src/payables/payables-list-page.tsx)

### Capacidades já existentes

- leitura de arquivo XML no frontend;
- parsing inicial da NFe;
- importação do XML via `POST /api/v1/xml-imports`;
- geração de conta a pagar a partir da importação;
- invalidação básica de queries após importação;
- uso correto da stack oficial (`httpClient`, React Query, shell do projeto).

### Lacunas no frontend

- inexistência de página oficial de listagem de XMLs importados;
- inexistência de rota dedicada;
- inexistência de navegação específica no shell;
- inexistência de UI para filtros operacionais dos XMLs;
- inexistência de UI para reprocessamento e exclusão lógica.

## 5. Conclusões

### O que já está pronto para reaproveitamento

- base de persistência da importação XML;
- classificação matriz/filial por destinatário;
- geração manual de título a pagar;
- criação automática de fornecedor;
- fluxo de upload e conferência inicial no frontend.

### O que precisa ser implementado agora

- migration de soft delete para `xml_imports`;
- endpoints de listagem avançada, detalhe, reprocessamento e exclusão lógica;
- refatoração do repository para suportar esses fluxos;
- tela oficial de `XMLs Importados`.

### Decisão técnica recomendada

Executar a Trilha A em ordem:

1. migration de soft delete;
2. backend de listagem/detalhe/mutações;
3. frontend da página oficial;
4. testes e documentação final.

## 6. Ação aberta após esta auditoria

Foi identificada necessidade imediata de nova migration para suportar exclusão lógica de `financeiro.xml_imports`.
