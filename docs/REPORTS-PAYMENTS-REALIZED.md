# Relatório de pagamentos realizados

**Domínio:** DOM-005 — Inteligência e Relatórios
**Status:** implementado localmente; aguardando validação visual e conferência com pagamentos reais

## Objetivo e regra financeira

Exibir saídas já baixadas no período pela **data efetiva do pagamento**, não
pela data de vencimento do título. Entram apenas pagamentos com status
`EFFECTIVE` e sem estorno. O valor pago usa `movement_amount`, incluindo
juros, multa e acréscimos e subtraindo descontos. Pagamentos estornados
permanecem consultáveis no histórico operacional, mas não compõem este
relatório.

## Escopo da primeira entrega

- Filtros por período, empresa, fornecedor, categoria e busca textual por
  documento, descrição, fornecedor ou número da transação.
- Visão `Todas as empresas` limitada no backend às empresas permitidas ao
  usuário; Master pode consultar o consolidado completo.
- Resumo do total pago, principal, ajustes líquidos e quantidade de pagamentos.
- Agrupamento por empresa e data de pagamento; detalhamento paginado.
- Impressão da página e planilha XLSX com resumo, filtros, agrupamentos e
  pagamentos detalhados.
- Acesso direto pelo menu lateral `Relatórios > Pagamentos realizados`;
  `Compromissos a pagar` também possui entrada própria.

O relatório não é fluxo de caixa completo e não substitui a conciliação
bancária. A próxima etapa aprovada é o comparativo **previsto x pago**, após
validação deste relatório com dados reais.

## Validação operacional pendente

1. Conferir um período com pagamentos, juros/descontos e estorno contra
   `Pagamentos realizados` e movimentos bancários.
2. Conferir visão consolidada e usuário restrito a uma empresa.
3. Conferir filtros, paginação, impressão e planilha no navegador.
