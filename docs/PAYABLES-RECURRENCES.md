# Contas Recorrentes — Contas a Pagar

**Data:** 23/07/2026  
**Status:** especificacao funcional com decisoes MVP aprovadas  
**Dominio:** DOM-002 — Financeiro / Contas a Pagar

## 1. Objetivo

Definir como o FinControl deve cadastrar, gerar, suspender e cancelar contas a
pagar recorrentes, preservando a fundacao atual de titulos, parcelas, agenda,
pagamentos, auditoria e multiempresa por operacao.

Este documento nao cria migration nem altera o sistema. Ele orienta a proxima
etapa para evitar que recorrencia seja implementada apenas como copia simples de
titulos, sem rastreabilidade.

## 2. Contexto atual

O sistema ja possui:

- titulos em `financeiro.payable_titles`;
- parcelas em `financeiro.payable_installments`;
- fornecedores, categorias, centros de custo e formas de pagamento;
- agenda financeira baseada em vencimentos de parcelas abertas;
- baixa individual de pagamentos;
- multiempresa operacional por CNPJ/origem do documento;
- tela placeholder em `/recurrences`;
- formulario de Contas a Pagar indicando `Recorrente — em modelagem`.

Ainda nao existe:

- tabela propria de recorrencias;
- vinculo formal entre recorrencia e titulos gerados;
- regra de geracao automatica de titulos futuros;
- tela de cadastro/listagem de recorrencias;
- suspensao/cancelamento de series recorrentes;
- controle de duplicidade de geracao.

## 3. Conceito funcional

Uma conta recorrente e um modelo operacional que gera titulos a pagar futuros a
partir de uma configuracao fixa ou semi-fixa.

Exemplos:

- aluguel;
- internet;
- sistemas e assinaturas;
- contador;
- folha/pro-labore;
- seguros;
- servicos mensais;
- taxas recorrentes de marketplace, se fizer sentido operacional.

A recorrencia nao deve ser considerada pagamento, baixa ou compromisso quitado.
Ela e apenas a origem controlada para criar titulos/parcelas futuras.

## 4. Escopo MVP

O MVP deve permitir:

- cadastrar recorrencia ativa;
- informar empresa proprietaria da recorrencia;
- informar fornecedor;
- informar categoria financeira;
- informar centro de custo opcional;
- informar tipo de documento;
- informar forma de pagamento padrao;
- informar valor base;
- informar descricao/historico;
- informar numero de documento base opcional;
- definir periodicidade;
- definir data inicial;
- definir data final ou quantidade de ocorrencias;
- limitar recorrencias sem prazo final a uma janela maxima de 6 meses geraveis;
- definir dia de vencimento;
- gerar titulos futuros manualmente por acao do usuario;
- evitar duplicidade de titulos gerados para a mesma competencia;
- suspender recorrencia;
- cancelar recorrencia;
- consultar titulos gerados a partir da recorrencia.

Fora do MVP:

- geracao automatica por scheduler/cron, reservada para evolucao futura;
- reajuste automatico por indice;
- aprovacao automatica de titulos recorrentes;
- recorrencia com valores variaveis por competencia;
- recorrencia em lote;
- anexos por recorrencia;
- regras complexas de dia util;
- recorrencia de contas a receber.

## 5. Periodicidades iniciais

Aceitar no MVP:

- mensal;
- semanal;
- quinzenal;
- anual.

Periodicidades futuras:

- bimestral;
- trimestral;
- semestral;
- personalizada por intervalo de dias.

## 6. Regras de datas

### Data inicial

Define a primeira competencia/vencimento possivel da recorrencia.

### Data final

Opcional. Quando informada, nenhuma ocorrencia deve ser gerada com vencimento
posterior a ela.

Quando a recorrencia nao tiver data final, o sistema deve limitar a geracao a no
maximo 6 meses futuros por operacao. Esse limite evita que uma recorrencia sem
fim crie titulos demais por erro operacional.

### Quantidade de ocorrencias

Opcional. Quando informada, limita o total de titulos que podem ser gerados pela
recorrencia.

### Data final e quantidade juntas

Podem existir juntas, mas a geracao deve parar no primeiro limite atingido.

### Limite de geracao

O usuario pode gerar no maximo 6 meses futuros por acao de geracao.

Mesmo quando a recorrencia tiver prazo maior, a acao de gerar titulos deve
respeitar essa janela maxima. Para gerar mais, o usuario executa nova geracao no
futuro.

### Dia de vencimento

Para recorrencia mensal/anual, o dia de vencimento define o dia do mes.

Se o mes nao tiver o dia informado, usar o ultimo dia do mes. Exemplo: dia 31 em
fevereiro gera vencimento em 28/29 de fevereiro.

### Semana/quinzena

Para semanal e quinzenal, a data inicial define o dia da semana base. O campo
dia de vencimento pode ser derivado e exibido apenas como informacao.

### Dia nao util

No MVP, dia nao util deve manter a data original calculada. Nao ajustar
automaticamente para proximo dia util ou dia util anterior.

## 7. Geracao de titulos

No MVP, a geracao deve ser manual:

```text
Abrir recorrencia
  ↓
Clicar em Gerar titulos
  ↓
Informar ate qual data gerar ou quantas proximas ocorrencias
  ↓
Sistema calcula competencias pendentes
  ↓
Sistema exibe pre-visualizacao
  ↓
Usuario confirma
  ↓
Sistema cria titulos e parcelas
  ↓
Sistema vincula titulos a recorrencia
```

Motivo: gerar automaticamente sem tela de revisao pode criar titulos indevidos
em producao, especialmente enquanto ainda estamos consolidando regras por
empresa, centro de custo e pagamentos.

Geracao automatica por rotina/scheduler fica aprovada apenas como evolucao
futura, quando houver rotina operacional e controles suficientes para revisar
falhas, duplicidades e auditoria.

## 8. Competencia

Cada titulo gerado deve ter uma competencia unica dentro da recorrencia.

Exemplo:

```text
Recorrencia: Aluguel Loja SBC
Competencias geradas:
- 2026-07
- 2026-08
- 2026-09
```

Para recorrencia semanal/quinzenal, a competencia pode ser a propria data base
da ocorrencia (`YYYY-MM-DD`), ou uma chave derivada como `2026-W30`. A primeira
implementacao pode usar `occurrence_date` como chave de unicidade.

## 9. Evitar duplicidade

O sistema deve impedir que a mesma recorrencia gere dois titulos para a mesma
ocorrencia.

Regra sugerida:

```text
Uma recorrencia + uma occurrence_date = no maximo um titulo ativo gerado.
```

Se um titulo gerado for cancelado, a decisao de permitir regeracao deve ser
explicitamente confirmada pelo usuario e registrada em auditoria.

## 10. Status da recorrencia

Status recomendados:

- `ACTIVE`: ativa e apta para gerar titulos;
- `SUSPENDED`: pausada temporariamente, nao gera novos titulos;
- `CANCELLED`: encerrada definitivamente;
- `FINISHED`: encerrada por atingir data final ou quantidade total.

Estados de titulos gerados continuam usando os status existentes de Contas a
Pagar. Cancelar uma recorrencia nao deve cancelar automaticamente titulos ja
gerados, salvo decisao explicita futura.

## 11. Suspensao e cancelamento

### Suspender

Suspensao pausa novas geracoes. Titulos ja gerados permanecem intactos.

Uso esperado:

- contrato temporariamente pausado;
- fornecedor suspenso;
- duvida operacional antes de continuar a geracao.

### Cancelar

Cancelamento encerra a recorrencia. Titulos ja gerados permanecem no fluxo
normal de contas a pagar.

Ao cancelar uma recorrencia, o sistema deve oferecer opcao para cancelar titulos
futuros ainda em aberto.

Regra aprovada:

- bloquear alteracao/cancelamento automatico de titulos com vencimento anterior
  a data atual;
- permitir selecionar apenas titulos posteriores a data atual;
- manter titulos ja pagos, parcialmente pagos ou vencidos no fluxo normal;
- registrar auditoria da recorrencia e dos titulos cancelados.

## 12. Alteracao de recorrencia

Alterar uma recorrencia deve afetar apenas geracoes futuras.

Titulos ja gerados nao devem ser alterados em massa automaticamente no MVP.

Campos que podem ser alterados:

- descricao;
- valor base;
- categoria;
- centro de custo;
- forma de pagamento;
- dia de vencimento;
- data final;
- quantidade total;
- observacoes.

Campos sensiveis:

- fornecedor;
- empresa;
- periodicidade.

Regra aprovada: fornecedor e empresa devem ser bloqueados quando a recorrencia
ja tiver titulos gerados. Se precisar alterar fornecedor ou empresa, o usuario
deve cancelar/suspender a recorrencia atual e criar um novo registro recorrente.

Periodicidade tambem deve ser tratada como campo sensivel. No MVP, preferir
bloqueio apos haver titulos gerados, para evitar sequencias incoerentes.

## 13. Multiempresa

A recorrencia deve pertencer a uma empresa.

Regras:

- o titulo gerado deve herdar `company_id` da recorrencia;
- conta bancaria nao deve ser obrigatoria na recorrencia;
- a conta bancaria continua sendo definida no pagamento/baixa;
- parametros por empresa podem preencher defaults no cadastro da recorrencia;
- relatatorios e agenda devem filtrar por empresa ou todas.

Se uma recorrencia for importada/originada de XML no futuro, a empresa deve ser
derivada do CNPJ do destinatario, seguindo o fluxo ja aprovado.

## 14. Modelo de dados sugerido

### `financeiro.payable_recurrences`

Campos sugeridos:

- `id uuid`;
- `company_id uuid not null`;
- `supplier_id uuid not null`;
- `category_id uuid not null`;
- `cost_center_id uuid null`;
- `document_type_id uuid not null`;
- `payment_method_id uuid null`;
- `payment_term_id uuid null`;
- `description text not null`;
- `base_document_number varchar`;
- `base_amount numeric(14,2) not null`;
- `frequency_code varchar not null`;
- `start_date date not null`;
- `end_date date null`;
- `max_occurrences integer null`;
- `due_day integer null`;
- `next_occurrence_date date null`;
- `status_code varchar not null`;
- `notes text`;
- auditoria padrao (`created_at`, `created_by`, `updated_at`, `updated_by`,
  `deleted_at`, `deleted_by`).

### `financeiro.payable_recurrence_titles`

Tabela de vinculo entre recorrencia e titulo gerado.

Campos sugeridos:

- `recurrence_id uuid not null`;
- `payable_title_id uuid not null`;
- `occurrence_date date not null`;
- `sequence_number integer not null`;
- `generated_at timestamptz not null`;
- `generated_by uuid`;
- `regenerated_from_title_id uuid null`;
- `notes text`;

Restricoes sugeridas:

- chave unica por `recurrence_id + occurrence_date`;
- chave unica por `payable_title_id`;
- foreign key para recorrencia;
- foreign key para titulo;
- foreign key opcional para titulo substituido/regerado.

## 15. Criacao do titulo gerado

Cada ocorrencia deve gerar um titulo padrao de contas a pagar com uma parcela
inicial.

Campos herdados da recorrencia:

- empresa;
- fornecedor;
- categoria;
- centro de custo;
- tipo de documento;
- forma de pagamento;
- condicao de pagamento;
- descricao;
- valor;
- observacoes.

Campos calculados:

- numero do documento;
- data de emissao;
- data de vencimento;
- competencia/occurrence date;
- parcela `1/1` no MVP.

Regra para numero do documento:

- se houver `base_document_number`, usar sufixo por competencia;
- se nao houver, gerar identificador amigavel como `REC-YYYYMM-DD`.

Exemplo:

```text
Base: ALUGUEL-SBC
Competencia: 2026-08-10
Documento gerado: ALUGUEL-SBC-20260810
```

## 16. Endpoints sugeridos

### Recorrencias

- `GET /api/v1/recurrences`;
- `GET /api/v1/recurrences/:id`;
- `POST /api/v1/recurrences`;
- `PATCH /api/v1/recurrences/:id`;
- `POST /api/v1/recurrences/:id/suspend`;
- `POST /api/v1/recurrences/:id/reactivate`;
- `POST /api/v1/recurrences/:id/cancel`;

### Geracao

- `POST /api/v1/recurrences/:id/preview-generation`;
- `POST /api/v1/recurrences/:id/generate`;

### Titulos gerados

- `GET /api/v1/recurrences/:id/titles`;

## 17. Permissoes sugeridas

- `RECURRENCE_VIEW`;
- `RECURRENCE_CREATE`;
- `RECURRENCE_UPDATE`;
- `RECURRENCE_CANCEL`;
- `RECURRENCE_GENERATE`.

O Operador Master continua autorizado por regra atual de administracao.

## 18. Tela sugerida

### Listagem `/recurrences`

Colunas:

- descricao;
- empresa;
- fornecedor;
- periodicidade;
- valor base;
- proxima ocorrencia;
- status;
- titulos gerados;
- acoes.

Filtros:

- busca textual;
- empresa;
- fornecedor;
- status;
- periodicidade;
- proximas geracoes.

### Formulario

Blocos:

- Dados principais;
- Classificacao financeira;
- Periodicidade;
- Regras de geracao;
- Observacoes;
- Titulos gerados.

Acoes:

- salvar;
- gerar titulos;
- suspender;
- reativar;
- cancelar;
- ver titulos gerados.

## 19. Agenda Financeira

Titulos gerados por recorrencia devem aparecer na agenda como qualquer outro
titulo.

Evolucao futura:

- exibir indicador discreto `Recorrente`;
- filtrar agenda por origem recorrente;
- abrir detalhe da recorrencia a partir do titulo.
- herdar tags/marcadores da recorrencia quando o modulo de Tags estiver pronto.

No MVP, a agenda nao precisa conhecer recorrencias diretamente se o titulo
gerado ja estiver corretamente vinculado e com vencimento.

## 20. Pagamentos

Baixa de pagamento nao altera a recorrencia.

O pagamento afeta apenas:

- parcela;
- titulo;
- movimento de conta bancaria;
- historico/auditoria.

A recorrencia segue gerando futuras ocorrencias ate ser suspensa, cancelada,
finalizada por data ou finalizada por quantidade.

## 21. Auditoria

Registrar auditoria para:

- criacao;
- edicao;
- suspensao;
- reativacao;
- cancelamento;
- preview executado, se for relevante;
- geracao de titulos;
- tentativa bloqueada por duplicidade;
- regeracao de titulo cancelado, se permitida.

## 22. Validacoes obrigatorias

- `base_amount > 0`;
- `start_date` obrigatoria;
- `end_date >= start_date`, quando informada;
- `max_occurrences >= 1`, quando informada;
- pelo menos `end_date` ou `max_occurrences` deve ser informado, ou o usuario
  deve confirmar que a recorrencia e sem prazo final, respeitando limite de 6
  meses por geracao;
- geracao limitada a no maximo 6 meses futuros por acao;
- `due_day` entre 1 e 31 para recorrencias mensais/anuais;
- empresa ativa;
- fornecedor ativo e nao bloqueado;
- categoria ativa;
- centro de custo ativo, quando informado;
- tipo de documento ativo;
- forma de pagamento ativa, quando informada.

## 23. Decisoes aprovadas para o MVP

- Recorrencia sem prazo final e permitida, mas a geracao fica limitada a no
  maximo 6 meses futuros por acao.
- Titulos serao gerados manualmente no MVP.
- Rotina automatica de geracao fica aprovada apenas para implementacao futura.
- O usuario pode gerar no maximo 6 meses futuros de uma vez.
- Fornecedor e empresa ficam bloqueados quando a recorrencia ja tiver titulos
  gerados.
- Se precisar alterar fornecedor ou empresa, criar um novo registro recorrente.
- Cancelar recorrencia deve oferecer opcao para cancelar apenas titulos futuros
  ainda em aberto.
- Titulos com datas anteriores a data atual nao devem ser cancelados
  automaticamente pela acao de cancelamento da recorrencia.
- Dia nao util mantem a data original calculada.
- Tags/marcadores devem ser herdados pela recorrencia quando o modulo de Tags
  estiver pronto.

## 24. Decisoes ainda pendentes

- Qual sera a regra visual para selecionar titulos futuros no cancelamento?
- Cancelamento de titulos futuros deve ser obrigatorio, opcional ou sugerido por
  padrao?
- Periodicidade deve ficar sempre bloqueada apos primeira geracao ou pode haver
  excecao auditada?
- Geracao automatica futura sera diaria, mensal ou acionada por janela de
  proximas ocorrencias?

## 25. Ordem recomendada de implementacao

1. Criar migrations de recorrencias e vinculo com titulos.
2. Criar seeds de status/permissoes.
3. Criar repository/service de recorrencias.
4. Criar endpoint de CRUD.
5. Criar preview de geracao.
6. Criar geracao confirmada de titulos.
7. Criar listagem e formulario `/recurrences`.
8. Integrar link de titulo gerado para recorrencia.
9. Adicionar filtros/indicadores na Agenda, se necessario.
