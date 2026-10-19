# XMLs Importados — Especificação Funcional

**Data:** 19/10/2026
**Status:** implementado; correção de filtros em validação local
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
- período de emissão da nota, com apenas `Data inicial` e `Data final`
  visíveis e limites inclusivos; sem período selecionado, consultar todas;
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

## Correção de filtros em 19/10/2026

A tela anterior exibia quatro datas sem rótulos visíveis: importação e
vencimento. O usuário esperava emissão. A API também convertia `imported_at`
para date usando o fuso da sessão: `2026-09-30 21:24` em São Paulo já é
`2026-10-01` em UTC. O backup atual da VPS confirmou o mecanismo: a nota 26466 foi emitida em
29/09 e importada em 30/09 às 21:24 em São Paulo, já 01/10 em UTC.

A tela agora envia `issueFrom` e `issueTo`, comparados diretamente com
`issue_date` (date), inclusive na data final. Os filtros antigos de importação
e vencimento continuam aceitos pela API; importação usa explicitamente
`America/Sao_Paulo`. Nenhuma migration é necessária.

Validação manual: buscar nota 26466 emitida em 29/09 com intervalo de
01/09 a 30/09; conferir também emissão exatamente em 30/09, início/fim
isolados, limpar filtros e paginação. Dados sem emissão não entram quando
há limite de emissão; continuam visíveis na consulta sem período.

Validações em 19/10: API 120 testes aprovados e 5 integrações opt-in puladas;
web 62 testes aprovados; types, lint e builds aprovados. A primeira execução
`Checar_alteracao.sh` registrou FAIL por whitespace documental e lint do teste
novo; ambos corrigidos e revalidados por `git diff --check` e lint web isolado.
O teste da tela foi reexecutado após a correção (3 aprovados). Log inicial:
`logs/alteracoes/checar_alteracao_20261019_181628.log`. Não se declara STATUS OK
da execução inicial. Conferência da nota real pendente do backup atualizado.

### Verificação com backup atual e política de fuso

Backup de 19/10 restaurado em base separada e aprovado por `verify_database.sql`.
A nota 26466 entrou no filtro de emissão de setembro tanto em sessão UTC quanto
em São Paulo; o filtro antigo por importação em UTC retornava 01/10.
O servidor local agora informa `SHOW TimeZone = America/Sao_Paulo`. A exibição
na tela também fixa esse fuso; teste executado com processo/navegador em UTC.
Configuração da VPS preparada em Compose/PM2, ainda sem deploy remoto.

Validação final do pacote de fuso em 19/10: `Checar_alteracao.sh` com
`STATUS: OK` (migrations, tipos, lint, testes e builds), log local
`logs/alteracoes/checar_alteracao_20261019_184620.log`. Compose local e sintaxe
PM2 validados; teste da tela em UTC aprovado. `SHOW TimeZone` em conexão nova
confirmou `America/Sao_Paulo`; verificação oficial do banco restaurado PASS.
