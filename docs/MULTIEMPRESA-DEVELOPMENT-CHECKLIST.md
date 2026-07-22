# Checklist Operacional — Multiempresa e XML Imports

**Data:** 21/07/2026  
**Status:** em andamento

## Objetivo

Traduzir o backlog em uma lista prática de execução com arquivos-alvo reais do repositório.

## Bloco A — XML Imports operacional

### A1. Auditoria técnica do estado atual

- [x] Revisar migrations de `financeiro.xml_imports`
  Arquivos:
  [202607162210_financeiro_create_xml_imports.sql](/mnt/c/Projetos/FinControl/database/migrations/202607162210_financeiro_create_xml_imports.sql)
  [202607191500_financeiro_expand_xml_imports_payload.sql](/mnt/c/Projetos/FinControl/database/migrations/202607191500_financeiro_expand_xml_imports_payload.sql)
  [202607191610_financeiro_add_xml_import_recipient_company.sql](/mnt/c/Projetos/FinControl/database/migrations/202607191610_financeiro_add_xml_import_recipient_company.sql)
  [202607192130_financeiro_link_xml_import_supplier.sql](/mnt/c/Projetos/FinControl/database/migrations/202607192130_financeiro_link_xml_import_supplier.sql)
- [x] Revisar rotas atuais do domínio
  Arquivo:
  [payables-routes.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-routes.ts)
- [x] Revisar repository atual do domínio
  Arquivo:
  [payables-repository.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-repository.ts)
- [x] Revisar fluxo atual do frontend
  Arquivos:
  [xml-import-dialog.tsx](/mnt/c/Projetos/FinControl/apps/web/src/payables/xml-import-dialog.tsx)
  [payables-list-page.tsx](/mnt/c/Projetos/FinControl/apps/web/src/payables/payables-list-page.tsx)
- [x] Registrar diagnóstico técnico em documento próprio

### A2. Especificação funcional da listagem

- [ ] Criar documento funcional da página `XMLs Importados`
- [ ] Confirmar filtros obrigatórios da listagem
- [ ] Confirmar ações por linha
- [ ] Confirmar estrutura de detalhamento por XML

Arquivos previstos:
- `docs/XML-IMPORTS-LIST-PAGE.md`

### A3. Banco para exclusão lógica

- [x] Confirmar ausência de `deleted_at` e `deleted_by` em `financeiro.xml_imports`
- [x] Criar migration nova de soft delete
- [ ] Validar migration localmente no banco

Arquivos:
- [202607211800_financeiro_add_xml_import_soft_delete.sql](/mnt/c/Projetos/FinControl/database/migrations/202607211800_financeiro_add_xml_import_soft_delete.sql)

### A4. Evolução do endpoint `GET /api/v1/xml-imports`

- [ ] Adicionar schema de query com paginação e filtros
- [ ] Substituir SQL fixo por repository dedicado
- [ ] Filtrar apenas registros não excluídos
- [ ] Retornar payload paginado

Arquivos-alvo:
- [payables-routes.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-routes.ts)
- [payables-repository.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-repository.ts)

### A5. Novo endpoint `GET /api/v1/xml-imports/:id`

- [ ] Criar rota de detalhe
- [ ] Retornar parcelas associadas
- [ ] Bloquear acesso a registro excluído

Arquivos-alvo:
- [payables-routes.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-routes.ts)
- [payables-repository.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-repository.ts)

### A6. Novo endpoint `POST /api/v1/xml-imports/:id/reprocess`

- [ ] Definir regra de reprocessamento permitida
- [ ] Implementar mutação com auditoria
- [ ] Cobrir cenários bloqueados

Arquivos-alvo:
- [payables-routes.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-routes.ts)
- [payables-repository.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-repository.ts)

### A7. Novo endpoint `DELETE /api/v1/xml-imports/:id`

- [ ] Implementar exclusão lógica
- [ ] Bloquear exclusão quando já houver título gerado
- [ ] Registrar auditoria

Arquivos-alvo:
- [payables-routes.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-routes.ts)
- [payables-repository.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-repository.ts)

### A8. Refatoração do repository

- [ ] Criar `listXmlImports`
- [ ] Criar `getXmlImport`
- [ ] Criar `reprocessXmlImport`
- [ ] Criar `deleteXmlImport`

Arquivo-alvo:
- [payables-repository.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-repository.ts)

### A9. Página `XMLs Importados`

- [ ] Criar página de listagem
- [ ] Criar filtros e paginação
- [ ] Exibir `MAIN`, `BRANCH` e `UNKNOWN`
- [ ] Integrar ações de reprocessar e excluir

Arquivos-alvo:
- `apps/web/src/payables/xml-imports-list-page.tsx`
- [router.tsx](/mnt/c/Projetos/FinControl/apps/web/src/app/router.tsx)
- [app-shell.tsx](/mnt/c/Projetos/FinControl/apps/web/src/layouts/app-shell.tsx)

### A10. Testes do Bloco A

- [ ] Cobrir API de listagem detalhada
- [ ] Cobrir reprocessamento
- [ ] Cobrir exclusão lógica
- [ ] Cobrir tela nova no frontend

Arquivos prováveis:
- `apps/api/test/http-contract.test.ts`
- `apps/api/test/payables-repository.test.ts`
- `apps/web/src/payables/xml-imports-list-page.test.tsx`

## Bloco B — Fundação oficial de multiempresa

### B1. Escopo funcional mínimo

- [ ] Congelar escopo inicial
- [ ] Documentar limites do primeiro ciclo

### B2. Modelo de dados

- [ ] Modelar `cadastros.companies`
- [ ] Modelar `cadastros.company_parameters`
- [ ] Modelar `administracao.user_companies`

### B3. Migrations

- [ ] Criar migrations do domínio de empresas
- [ ] Validar constraints de matriz/filial

### B4. Segurança

- [ ] Definir permissões do novo domínio
- [ ] Criar seed de permissões

### B5 a B12. API, frontend e contexto

- [ ] Implementar API de empresas
- [ ] Implementar parâmetros por empresa
- [ ] Implementar vínculo usuário-empresa
- [ ] Implementar telas oficiais
- [ ] Preparar contexto de sessão por empresa

## Estado atual

Primeira execução iniciada em 21/07/2026 com foco em:

- diagnóstico técnico do Bloco A;
- checklist operacional;
- migration de soft delete para `xml_imports`.
