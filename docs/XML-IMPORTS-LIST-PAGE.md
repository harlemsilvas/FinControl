# XMLs Importados — Especificação Funcional

**Data:** 21/07/2026  
**Status:** proposto para implementação  
**Contexto:** página operacional da Trilha A para consulta e tratamento das importações XML já registradas no sistema.

## 1. Objetivo da página

Permitir que o usuário consulte as importações XML já realizadas, filtre o volume operacional e execute ações seguras sobre cada registro sem sair do fluxo oficial do FinControl.

## 2. Localização na aplicação

- Seção: `Financeiro`
- Nome do item de menu: `XMLs Importados`
- Rota sugerida: `/xml-imports`

## 3. Perfil de uso

A página é voltada para usuários autenticados com permissão de consulta financeira. Ações de reprocessamento e exclusão lógica exigem permissão de gestão da importação XML.

## 4. Filtros obrigatórios

A listagem deve suportar:

- busca textual por número do documento, chave de acesso, fornecedor ou destinatário;
- status da importação;
- período de importação;
- período de vencimento;
- fornecedor;
- classificação do destinatário:
  - `MAIN`
  - `BRANCH`
  - `UNKNOWN`
- documento do destinatário.

## 5. Colunas mínimas da listagem

- data/hora da importação;
- status;
- chave de acesso ou documento;
- fornecedor;
- destinatário;
- classificação matriz/filial;
- vencimento principal;
- valor total;
- indicador de título gerado;
- ações.

## 6. Ações por registro

### Ação: Ver detalhes

Disponível para todos os usuários autorizados a consultar a listagem.

Deve exibir:

- cabeçalho da importação;
- dados do fornecedor;
- dados do destinatário;
- classificação `MAIN/BRANCH/UNKNOWN`;
- valores principais;
- parcelas extraídas;
- vínculo com fornecedor cadastrado;
- vínculo com título gerado, se existir;
- mensagem de erro operacional, se existir.

### Ação: Gerar conta a pagar

Disponível quando:

- o XML ainda não tiver gerado título;
- o usuário tiver permissão para criar conta a pagar.

Pode reaproveitar o fluxo já existente no frontend atual.

### Ação: Reprocessar

Disponível apenas para usuários com permissão `XML_IMPORT_MANAGE`.

Comportamento esperado:

- limpar erro operacional;
- devolver o XML ao estado inicial permitido;
- registrar auditoria.

### Ação: Excluir

Disponível apenas para usuários com permissão `XML_IMPORT_MANAGE`.

Comportamento esperado:

- realizar exclusão lógica;
- exigir confirmação explícita;
- bloquear quando o XML já tiver gerado título;
- registrar auditoria.

## 7. Paginação

A página deve usar paginação compatível com o padrão atual do sistema:

- `page`
- `pageSize`
- total de registros

Tamanho inicial sugerido:

- `20` registros por página.

## 8. Estados visuais obrigatórios

- carregando;
- sem resultados;
- erro de consulta;
- resultado com filtros aplicados;
- ação concluída com sucesso;
- ação bloqueada por regra de negócio.

## 9. Regras de negócio refletidas na UI

- XML com título gerado não pode mostrar ação de exclusão como disponível sem regra futura explícita;
- XML classificado como `BRANCH` deve destacar visualmente que pertence a filial para conferência;
- XML sem classificação suficiente permanece como `UNKNOWN`;
- XML excluído logicamente não deve aparecer na listagem padrão;
- filtros devem preservar o contexto operacional do usuário durante paginação.

## 10. Contratos backend necessários

- `GET /api/v1/xml-imports`
- `GET /api/v1/xml-imports/:id`
- `POST /api/v1/xml-imports/:id/reprocess`
- `DELETE /api/v1/xml-imports/:id`

## 11. Limites desta entrega

Esta página não implementa:

- processamento fiscal profundo;
- edição do conteúdo importado;
- consolidação multiempresa completa;
- rateio entre matriz e filial;
- upload binário com armazenamento externo;
- retentativas automáticas assíncronas.

## 12. Recomendação de implementação

Implementar esta página somente sobre a stack oficial:

- `apps/web`
- `httpClient`
- `TanStack Query`
- router atual
- shell atual
- componentes do design system já existente

Não reutilizar diretamente protótipos externos à base oficial como código de produção.
