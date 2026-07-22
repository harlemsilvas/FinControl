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

- [x] Criar documento funcional da página `XMLs Importados`
- [x] Confirmar filtros obrigatórios da listagem
- [x] Confirmar ações por linha
- [x] Confirmar estrutura de detalhamento por XML

Arquivos previstos:
- `docs/XML-IMPORTS-LIST-PAGE.md`

### A3. Banco para exclusão lógica

- [x] Confirmar ausência de `deleted_at` e `deleted_by` em `financeiro.xml_imports`
- [x] Criar migration nova de soft delete
- [x] Validar migration localmente no banco

Arquivos:
- [202607211800_financeiro_add_xml_import_soft_delete.sql](/mnt/c/Projetos/FinControl/database/migrations/202607211800_financeiro_add_xml_import_soft_delete.sql)

### A4. Evolução do endpoint `GET /api/v1/xml-imports`

- [x] Adicionar schema de query com paginação e filtros
- [x] Substituir SQL fixo por repository dedicado
- [x] Filtrar apenas registros não excluídos
- [x] Retornar payload paginado

Arquivos-alvo:
- [payables-routes.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-routes.ts)
- [payables-repository.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-repository.ts)

### A5. Novo endpoint `GET /api/v1/xml-imports/:id`

- [x] Criar rota de detalhe
- [x] Retornar parcelas associadas
- [x] Bloquear acesso a registro excluído

Arquivos-alvo:
- [payables-routes.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-routes.ts)
- [payables-repository.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-repository.ts)

### A6. Novo endpoint `POST /api/v1/xml-imports/:id/reprocess`

- [x] Definir regra de reprocessamento permitida
- [x] Implementar mutação com auditoria
- [x] Cobrir cenários bloqueados

Arquivos-alvo:
- [payables-routes.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-routes.ts)
- [payables-repository.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-repository.ts)

### A7. Novo endpoint `DELETE /api/v1/xml-imports/:id`

- [x] Implementar exclusão lógica
- [x] Bloquear exclusão quando já houver título gerado
- [x] Registrar auditoria

Arquivos-alvo:
- [payables-routes.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-routes.ts)
- [payables-repository.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-repository.ts)

### A8. Refatoração do repository

- [x] Criar `listXmlImports`
- [x] Criar `getXmlImport`
- [x] Criar `reprocessXmlImport`
- [x] Criar `deleteXmlImport`

Arquivo-alvo:
- [payables-repository.ts](/mnt/c/Projetos/FinControl/apps/api/src/domains/payables/payables-repository.ts)

### A9. Página `XMLs Importados`

- [x] Criar página de listagem
- [x] Criar filtros e paginação
- [x] Exibir `MAIN`, `BRANCH` e `UNKNOWN`
- [x] Integrar ações de reprocessar e excluir
- [x] Disponibilizar importação XML diretamente pela página
- [x] Preencher o modal `Gerar conta a pagar` com parâmetros da empresa resolvida pelo CNPJ do destinatário

Arquivos-alvo:
- `apps/web/src/payables/xml-imports-list-page.tsx`
- [router.tsx](/mnt/c/Projetos/FinControl/apps/web/src/app/router.tsx)
- [app-shell.tsx](/mnt/c/Projetos/FinControl/apps/web/src/layouts/app-shell.tsx)

### A10. Testes do Bloco A

- [x] Cobrir API de listagem detalhada
- [x] Cobrir reprocessamento
- [x] Cobrir exclusão lógica
- [x] Cobrir tela nova no frontend

Arquivos prováveis:
- `apps/api/test/http-contract.test.ts`
- `apps/api/test/payables-repository.test.ts`
- `apps/web/src/payables/xml-imports-list-page.test.tsx`

## Bloco B — Fundação oficial de multiempresa

### B1. Escopo funcional mínimo

- [x] Congelar escopo inicial do primeiro ciclo: cadastro de empresas próprias com tipos `MAIN`/`BRANCH`
- [x] Documentar limite: `UNKNOWN` permanece apenas como classificação de XML importado, não como tipo de empresa cadastrada

### B2. Modelo de dados

- [x] Modelar `cadastros.companies`
- [x] Modelar `cadastros.company_parameters`
- [x] Modelar `administracao.user_companies`

### B3. Migrations

- [x] Criar migration inicial do domínio de empresas
- [x] Validar constraints de matriz/filial na migration
- [x] Criar backfill para vincular XMLs antigos à empresa pelo CNPJ do destinatário

### B4. Segurança

- [x] Definir uso inicial das permissões genéricas `MASTER_DATA_VIEW` e `MASTER_DATA_MANAGE`
- [ ] Criar seed de permissões específicas, se o escopo evoluir para permissões por empresa

### B5 a B12. API, frontend e contexto

- [x] Implementar API de empresas via cadastro mestre `/api/v1/companies`
- [x] Implementar parâmetros por empresa via cadastro mestre `/api/v1/company-parameters`
- [x] Implementar fundação persistente do vínculo usuário-empresa
- [x] Implementar tela oficial inicial em `/companies`
- [x] Implementar tela inicial de parâmetros em `/company-parameters`
- [x] Preparar contexto inicial de sessão por empresa em login/refresh/me
- [x] Documentar que empresa ativa por sessão fica como feature futura, não como regra global atual
- [ ] Implementar filtros explícitos por empresa ou todas nas telas operacionais e relatórios
- [x] Documentar seleção de empresa/conta bancária no fluxo futuro de baixa e caixa
- [x] Fechar decisões do MVP de saldo oficial: bloqueio por saldo insuficiente, saldo inicial por movimento e repasses por centro de custo
- [x] Implementar movimentos de conta bancária e saldo oficial por conta
- [x] Implementar entrada de saldo por repasse de marketplace/manual
- [x] Implementar transferência entre contas bancárias com rastreabilidade
- [x] Implementar endpoint de parcelas elegíveis para baixa
- [x] Validar compatibilidade entre empresa do título e conta bancária no `POST /payments`
- [x] Deduzir saldo oficial da conta bancária no `POST /payments`
- [x] Restaurar saldo oficial por movimento compensatório no estorno de pagamento
- [x] Implementar tela `/payments` com baixa manual individual
- [x] Implementar lançamento de saldo inicial pela tela `/payments`
- [x] Implementar histórico/listagem de pagamentos realizados
- [x] Implementar estorno individual de pagamento pela tela `/payments`
- [x] Implementar detalhe de pagamento com composição, conta bancária, movimentos de tesouraria e comprovantes vinculados
- [x] Implementar anexação/download de comprovante no detalhe do pagamento com storage local privado
- [ ] Implementar sincronização futura de comprovantes com Google Drive sem bloquear o fluxo operacional

## Estado atual

Primeira execução iniciada em 21/07/2026 com foco em:

- diagnóstico técnico do Bloco A;
- checklist operacional;
- migration de soft delete para `xml_imports`.
