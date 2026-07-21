Perfeito! Criei a estrutura completa para a tela de XMLs importados. Aqui está o resumo do que foi implementado:
✅ Implementação Concluída
1. Frontend - Tela de Listagem (/apps/web/src/payables/xml-imports-list-page.tsx)
✅ Filtros avançados (busca, tipo empresa, status, período, CNPJ matriz)
✅ Grid completo com todas as informações relevantes
✅ Badges visuais para Matriz/Filial/Não classificada
✅ Ações por registro (Gerar Conta, Reprocessar, Excluir)
✅ Paginação funcional
✅ Formatação brasileira de valores e datas
2. Roteamento (/apps/web/src/app/router.tsx)
✅ Import do componente XmlImportsListPage
✅ Rota /xml-imports registrada
3. Menu Lateral (/apps/web/src/layouts/app-shell.tsx)
✅ Item "XMLs Importados" adicionado na seção Financeiro
4. Documentação (/docs/XML-IMPORTS-LIST-PAGE.md)
✅ Guia completo de implementação
✅ Especificação dos endpoints backend necessários
✅ Próximos passos sugeridos
📋 Próximos Passos - Backend
Para completar a funcionalidade, você precisa implementar no backend:
Endpoints em /apps/api/src/domains/payables/payables-routes.ts:
Atualizar GET /xml-imports para aceitar filtros
Criar POST /xml-imports/:id/reprocess
Criar DELETE /xml-imports/:id
Métodos no Repository /apps/api/src/domains/payables/payables-repository.ts:
listXmlImports() - Query com filtros dinâmicos
reprocessXmlImport() - Lógica de reprocessamento
deleteXmlImport() - Soft delete com auditoria
🎯 Como Usar
Acesse /xml-imports após login
Use os filtros para buscar XMLs específicos
Classificação automática por CNPJ (Matriz/Filial)
Gere contas a pagar diretamente da lista
Reprocesse ou exclua XMLs conforme necessário
A arquitetura está pronta e integrada ao projeto existente! O frontend já está funcionando e aguarda apenas os endpoints backend para operar completamente.