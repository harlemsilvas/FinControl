# Importação XML — escopo inicial

Data: 19/07/2026
Status: base técnica preparada

## Objetivo

Preparar a importação de XML para Contas a Pagar sem tentar interpretar todos os itens fiscais neste momento.

A primeira etapa deve armazenar:

- XML bruto para auditoria e investigação futura;
- chave de acesso;
- dados principais do fornecedor;
- dados principais do documento;
- totais financeiros relevantes;
- frete;
- vencimento principal;
- destinatário da NFe, usado para classificar matriz ou filial;
- vencimentos/parcelas quando existirem no XML.

Itens/produtos do XML não serão persistidos nesta etapa, pois não são relevantes para a rotina inicial de Contas a Pagar.

## Modelo aplicado

A migration `database/migrations/202607191500_financeiro_expand_xml_imports_payload.sql` expande `financeiro.xml_imports` e cria `financeiro.xml_import_installments`.

### `financeiro.xml_imports`

Guarda o cabeçalho da importação:

- `raw_xml`;
- dados do arquivo de origem;
- dados do fornecedor;
- dados do documento;
- valores principais;
- frete, desconto, seguro e outros valores;
- total da nota/pagamento;
- `parsed_data` em JSONB para dados técnicos auxiliares;
- vínculo futuro com título gerado.

### `financeiro.xml_import_installments`

Guarda vencimentos extraídos do XML:

- número da parcela;
- data de vencimento;
- valor;
- forma de pagamento bruta quando identificada.

## Regra matriz/filial

A primeira versão não implementa ainda todo o cadastro multiempresa previsto na documentação funcional.

No fluxo de importação, o usuário informa o CNPJ matriz do sistema. O XML é classificado assim:

- MAIN: CNPJ do destinatário da NFe igual ao CNPJ matriz informado;
- BRANCH: CNPJ do destinatário diferente do CNPJ matriz informado;
- UNKNOWN: quando não houver CNPJ suficiente para classificar.

O XML de filial é armazenado para conferência, mas a geração automática de Conta a Pagar por empresa/filial fica para uma etapa posterior, após a modelagem multiempresa definitiva.

## Decisões preservadas

- Nenhum objeto foi criado no schema `public`.
- Migration antiga não foi alterada.
- Importação XML ainda não cria título automaticamente.
- Criação automática de Conta a Pagar a partir do XML deve ser etapa posterior e auditável.
- Produtos/itens do XML ficam fora do escopo inicial de persistência estruturada.
- A tela pode exibir uma prévia simples dos itens para conferência, armazenada em parsed_data, sem criar tabela de itens fiscais.

## Próximos passos sugeridos

1. Criar UI de upload/leitura do XML.
2. Parsear XML no frontend ou backend e enviar `rawXml` + campos extraídos para `/api/v1/xml-imports`.
3. Criar tela de conferência antes de gerar Conta a Pagar.
4. Reaproveitar fornecedor existente por CNPJ/CPF quando possível.
5. Criar título somente após confirmação explícita do usuário.