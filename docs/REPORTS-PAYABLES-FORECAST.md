# Relatório de compromissos a pagar

**Domínio:** DOM-005 — Inteligência e Relatórios
**Status:** MVP implementado localmente; aguardando validação visual
**Data:** 17/09/2026

## 1. Objetivo

Responder rapidamente perguntas operacionais como:

- quanto precisa ser pago hoje;
- quanto precisa ser pago nos próximos 7 dias;
- quanto vence na próxima semana;
- quanto vence neste mês ou no próximo mês;
- quais compromissos pertencem a cada empresa;
- qual é a posição consolidada de todas as empresas acessíveis ao usuário.

Esta primeira entrega é uma previsão de saídas baseada em contas a pagar. Ela
não é ainda um fluxo de caixa completo, pois o sistema não possui contas a
receber nem projeção consolidada de entradas futuras.

## 2. Períodos inteligentes

Os atalhos devem ter significado explícito e previsível:

- `Hoje`: data local atual;
- `Próximos 7 dias`: hoje mais os seis dias seguintes;
- `Próxima semana`: segunda-feira a domingo da semana seguinte;
- `Este mês`: primeiro ao último dia do mês atual;
- `Próximo mês`: primeiro ao último dia do mês seguinte;
- `Personalizado`: datas inicial e final informadas pelo usuário.

O período selecionado deve permanecer visível na tela. Atalhos não podem
alterar filtros silenciosamente.

## 3. Filtros do MVP

- período inteligente ou personalizado;
- empresa específica ou `Todas as empresas`;
- fornecedor;
- categoria financeira;
- situação: abertas, vencidas ou todas as pendentes;
- busca textual por documento, descrição ou fornecedor.

`Todas as empresas` significa somente as empresas permitidas ao usuário
autenticado. A API deve aplicar esse limite; não basta filtrar apenas no
frontend. Usuário Master pode consultar o consolidado completo.

## 4. Informações apresentadas

Resumo do período:

- total pendente;
- total vencido incluído na consulta;
- total a vencer;
- quantidade de parcelas;
- quantidade de empresas com compromissos.

Agrupamentos iniciais:

- total por dia de vencimento;
- total por empresa;
- opcionalmente, total por categoria quando não aumentar o custo do primeiro
  pacote.

Detalhamento paginado:

- vencimento;
- empresa;
- fornecedor;
- documento e parcela;
- categoria;
- valor em aberto;
- situação;
- ação para consultar o título ou seguir para a baixa.

## 5. Regras financeiras

- considerar parcelas ativas com saldo em aberto maior que zero;
- excluir títulos cancelados e registros excluídos logicamente;
- usar o saldo aberto da parcela, e não apenas o valor original;
- pagamentos efetivos devem reduzir o saldo conforme as regras já existentes;
- pagamentos estornados não podem reduzir o compromisso;
- títulos de recorrências encerradas continuam aparecendo quando a parcela já
  foi gerada, está ativa e possui saldo em aberto;
- datas devem usar o fuso operacional definido pelo sistema e ser exibidas em
  `dd/mm/aaaa`.

## 6. Experiência da tela

A rota inicial será `/reports`, substituindo o placeholder atual por uma
central simples com o relatório `Compromissos a pagar` como primeira opção.

A tela deve abrir com um período útil, preferencialmente `Próximos 7 dias`, e
com `Todas as empresas` quando o usuário tiver acesso a mais de uma. O filtro
ativo deve ser claro, e estados vazio, carregando e erro devem usar os padrões
visuais existentes, incluindo Toast para erros operacionais.

## 7. Contrato técnico inicial

Preferir endpoint próprio em DOM-005, por exemplo:

```text
GET /api/v1/reports/payables-forecast
```

Parâmetros iniciais:

```text
from, to, companyId, supplierId, categoryId, status, search, page, pageSize
```

O endpoint pode reutilizar critérios da Agenda, mas deve oferecer totalizações,
agrupamentos e paginação próprios. A autorização deve usar a permissão de
consulta financeira existente no MVP e aplicar o escopo de empresas do usuário
no backend. Uma permissão exclusiva de relatórios poderá ser criada quando a
central ganhar dados mais sensíveis ou relatórios gerenciais.

## 8. Etapas de implementação

1. Auditar como o escopo de empresas autorizadas chega hoje aos repositórios de
   Dashboard, Agenda e Contas a Pagar.
2. Definir contrato de resposta e testes do endpoint.
3. Implementar totalizações, agrupamentos e lista paginada no backend.
4. Substituir o placeholder `/reports` pela tela do primeiro relatório.
5. Implementar filtros inteligentes e navegação para título/baixa.
6. Validar cenários de empresa única, múltiplas empresas, Master, vencidos,
   pagamentos parciais e estornos.
7. Rodar validações focadas durante o desenvolvimento e a checagem completa no
   fechamento do pacote.

## 9. Fora do MVP

- contas a receber;
- projeção de entradas;
- saldo bancário futuro;
- fluxo de caixa completo;
- comparação orçamento versus realizado;
- gráficos gerenciais avançados;
- filtros salvos;
- envio agendado;
- exportação PDF, Excel ou CSV;
- relatórios executados em segundo plano.

Esses itens permanecem no roadmap de DOM-005 e devem evoluir depois que o
relatório operacional inicial estiver validado no uso diário.
