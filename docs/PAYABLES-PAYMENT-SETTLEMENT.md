# Baixa de Pagamentos — Contas a Pagar

**Data:** 22/07/2026  
**Status:** especificação funcional para próxima implementação  
**Domínio:** DOM-002 — Financeiro / Contas a Pagar

## 1. Objetivo

Definir como o FinControl deve registrar a baixa de pagamentos de contas a pagar,
preservando o modelo já aprovado de parcelas, pagamentos, estornos, auditoria e
multiempresa por operação.

Este documento orienta a próxima etapa de implementação da tela de pagamentos e evita
confundir baixa operacional com contexto global de empresa por sessão.

## 2. Estado atual do sistema

Já existe fundação técnica para baixa:

- tabela `financeiro.payments`;
- tabela `financeiro.payment_reversals`;
- tabela `financeiro.payment_batches`;
- cadastro de contas bancárias em `tesouraria.bank_accounts`;
- endpoint `POST /api/v1/payments`;
- endpoint `POST /api/v1/payments/:id/reverse`;
- endpoint `POST /api/v1/payment-batches`;
- recálculo automático de saldo da parcela;
- recálculo automático de status do título;
- permissões `PAYMENT_CREATE`, `PAYMENT_REVERSE` e `PAYMENT_BATCH_MANAGE`.

Ainda falta a experiência funcional completa:

- tela operacional de baixa;
- listagem de parcelas/títulos elegíveis para pagamento;
- seleção de empresa/conta bancária no momento da baixa;
- controle de saldo oficial por conta bancária;
- registro de entradas de saldo, como repasses de marketplace;
- transferência entre contas bancárias;
- filtros por empresa ou todas;
- confirmação amigável para pagamento acima do saldo;
- tela de estorno;
- anexação de comprovante no fluxo de pagamento;
- integração futura com caixa/tesouraria.

## 3. Decisão funcional de multiempresa

Nesta fase, a empresa não deve ser escolhida por um seletor global no topo do sistema.

A empresa deve ser definida conforme a origem da operação:

- XML: pelo CNPJ do destinatário no documento fiscal;
- título manual: pela empresa informada no cadastro do título quando esse campo estiver exposto;
- baixa: pela empresa do título/parcela e pela conta bancária escolhida;
- relatórios: por filtro explícito `Empresa` ou `Todas`.

Para a baixa, a conta bancária deve pertencer à mesma empresa do título/parcela, salvo regra
futura explicitamente aprovada para pagamentos centralizados.

## 4. Decisão sobre saldo oficial

Cada baixa deve deduzir valor de uma conta bancária oficial. Portanto, a baixa não pode
ser tratada apenas como marcação de título pago; ela também deve gerar movimento de saída
na tesouraria.

O saldo oficial da conta deve ser alimentado por movimentos de entrada, por exemplo:

- repasses de marketplace, lançados manualmente e categorizados por centro de custo;
- transferências recebidas de outra conta bancária;
- depósitos ou ajustes operacionais aprovados;
- saldo inicial lançado como movimento de entrada do tipo `Saldo de Caixa`.

O pagamento deve sair preferencialmente da conta bancária vinculada ao mesmo CNPJ/empresa
do título. Essa é a regra contábil e operacional padrão.

Exceções, como uma empresa pagar obrigação de outra, não devem ser tratadas como baixa
normal simples. Elas exigem fluxo de transferência/acerto entre contas ou controle extra
contábil, com rastreabilidade e estorno possível.

## 5. Escopo MVP da baixa

O primeiro ciclo deve implementar baixa manual individual de parcela. Pagamento em lote
fica fora do início.

Funcionalidades do MVP:

- listar parcelas em aberto, atrasadas ou parcialmente pagas;
- filtrar por vencimento, fornecedor, status, empresa e busca textual;
- permitir filtro de empresa específica ou todas;
- abrir modal/tela de baixa para uma parcela;
- exibir dados do título, fornecedor, empresa, vencimento, valor e saldo aberto;
- escolher conta bancária da empresa do título;
- escolher forma de pagamento;
- informar data do pagamento;
- informar valor principal pago;
- informar juros, multa, desconto e outros acréscimos;
- informar número da transação;
- confirmar baixa;
- deduzir o valor movimentado do saldo oficial da conta bancária;
- atualizar saldo e status automaticamente;
- registrar auditoria.

Fora do MVP:

- pagamento em lote;
- baixa automática por arquivo bancário;
- conciliação bancária;
- anexação obrigatória de comprovante;
- pagamento centralizado por outra empresa;
- regras avançadas de aprovação antes da baixa.

## 6. Fluxo operacional MVP

```text
Abrir tela de Pagamentos
  ↓
Filtrar parcelas elegíveis
  ↓
Selecionar parcela
  ↓
Sistema exibe empresa, fornecedor, documento, vencimento e saldo
  ↓
Usuário escolhe conta bancária da empresa
  ↓
Usuário informa forma, data, valor e encargos/descontos
  ↓
Valor principal excede saldo aberto?
  ├─ Sim → Exibir alerta e exigir confirmação explícita
  └─ Não → Continuar
  ↓
Conta bancária possui saldo suficiente?
  ├─ Não → Bloquear baixa
  └─ Sim → Continuar
  ↓
Registrar pagamento efetivo
  ↓
Registrar movimento de saída na conta bancária
  ↓
Banco recalcula saldo da parcela
  ↓
Banco recalcula status do título
  ↓
Registrar auditoria
```

## 7. Campos da baixa

Campos obrigatórios:

- parcela;
- conta bancária;
- forma de pagamento;
- data do pagamento;
- valor principal;

Campos opcionais:

- lote;
- juros;
- multa;
- desconto;
- outros acréscimos;
- número da transação;
- observações futuras;
- comprovante futuro.

Campos calculados:

- valor movimentado = principal + juros + multa + acréscimos - desconto;
- saldo remanescente da parcela;
- saldo remanescente da conta bancária;
- status da parcela;
- status do título.

## 8. Regras de negócio

- Título cancelado não pode receber pagamento.
- Parcela inexistente ou excluída não pode receber pagamento.
- Valor principal deve ser maior que zero.
- Juros, multa, desconto e acréscimos não podem ser negativos.
- Valor movimentado deve ser maior que zero.
- Pagamento parcial é permitido.
- Mais de um pagamento para a mesma parcela é permitido enquanto houver saldo.
- Pagamento acima do saldo exige confirmação explícita.
- Baixa deve ser individual por título/parcela no início.
- Conta bancária da baixa deve pertencer à empresa/CNPJ do título.
- Baixa deve deduzir o valor movimentado do saldo oficial da conta bancária.
- Saldo insuficiente da conta bancária bloqueia a baixa.
- Estorno deve restaurar o saldo da conta bancária além de restaurar saldo/status da parcela.
- Estorno não apaga pagamento; cria registro em `financeiro.payment_reversals`.
- Pagamento estornado deixa de compor o saldo pago.
- Título pago só pode ser cancelado após estorno dos pagamentos efetivos.
- Baixa deve registrar auditoria.
- Qualquer movimento financeiro deve poder ser revertido ou compensado por movimento contrário auditado.

## 9. Regra de empresa, CNPJ e conta bancária

Regra inicial recomendada:

- se a parcela/título tiver empresa vinculada, listar apenas contas bancárias ativas dessa empresa;
- se a parcela/título ainda não tiver empresa, exigir seleção ou correção do vínculo antes da baixa;
- não permitir baixa usando conta bancária de outra empresa no MVP.
- transferência entre CNPJs fica bloqueada no MVP.
- no futuro, exceção operacional entre CNPJs deve ser auditada e tratada como transferência/acerto de fundos antes da baixa.

Essa regra preserva o controle financeiro por CNPJ sem depender de empresa ativa por sessão.

## 10. Entradas de saldo e transferências

Para que a baixa deduza de saldo oficial, o sistema precisa de um controle de movimentos
de conta bancária.

Tipos mínimos futuros:

- entrada manual de saldo inicial, categorizada como `Saldo de Caixa`;
- entrada manual por repasse de marketplace, categorizada por centro de custo;
- entrada manual aprovada, categorizada por centro de custo;
- saída por pagamento de conta a pagar;
- transferência entre contas;
- estorno de pagamento;
- estorno de transferência;
- ajuste operacional auditado.

Transferência entre contas do mesmo CNPJ deve gerar dois movimentos vinculados:

- saída na conta de origem;
- entrada na conta de destino.

Transferência entre CNPJs fica bloqueada no MVP. Futuramente, se permitida, o sistema
deve registrar isso como exceção operacional/contábil auditada, não como baixa normal sem
explicação.

Marketplaces não precisam nascer como cadastro próprio neste ciclo. A origem operacional
do repasse será representada por centros de custo específicos, permitindo várias contas
de centro de custo para separar marketplaces, canais ou grupos de repasse.

## 11. API atual versus lacunas

Já existe:

- `POST /api/v1/payments`;
- `POST /api/v1/payments/:id/reverse`;
- `POST /api/v1/payment-batches`;
- `GET /api/v1/payment-batches`;
- `GET /api/v1/payments`;
- `GET /api/v1/payments/:id`;
- `POST /api/v1/payments/:id/attachments`;
- `GET /api/v1/attachments/:id/download`;
- `GET /api/v1/payable-installments/eligible-for-payment`;
- `GET /api/v1/bank-account-balances`;
- `GET /api/v1/bank-account-movements`;
- `POST /api/v1/bank-account-movements/manual-entry`;
- `POST /api/v1/bank-account-transfers`;
- `POST /api/v1/bank-account-movements/:id/reverse`;
- `POST /api/v1/payments` com validação de empresa/conta bancária, bloqueio por saldo insuficiente e geração de movimento `PAYABLE_PAYMENT`;
- `POST /api/v1/payments/:id/reverse` com movimento compensatório de tesouraria para restaurar saldo oficial;
- tela `/payments` para baixa manual individual, com filtros, seleção da conta bancária da empresa, cálculo do valor movimentado e confirmação de pagamento acima do saldo aberto;
- tela `/payments` com lançamento de saldo inicial `Saldo de Caixa`, histórico recente de pagamentos e estorno individual.
- tela `/payments` com detalhe do pagamento, exibindo composição da baixa, conta bancária, movimentos de tesouraria, estorno e comprovantes já vinculados.
- anexação de comprovante diretamente no detalhe do pagamento, com armazenamento local privado em `ATTACHMENT_STORAGE_ROOT`.

Lacunas para uma tela operacional completa:

- endpoint de detalhe da parcela com empresa, título e fornecedor;
- sincronização futura dos comprovantes com Google Drive ou outro repositório externo.

## 12. Armazenamento local de comprovantes

A decisão atual é salvar comprovantes primeiro em storage local privado da API,
sem tornar Google Drive uma dependência operacional da baixa.

Configuração padrão:

```text
ATTACHMENT_STORAGE_ROOT=/opt/fincontrol/storage
ATTACHMENT_MAX_FILE_SIZE_BYTES=10485760
```

Caminho relativo gravado em `financeiro.attachments.relative_path`:

```text
attachments/payments/YYYY/MM/{paymentId}/{uuid-nome-original}
```

O download deve passar pela API autenticada, para validar permissão antes de entregar
o arquivo. A sincronização com Google Drive fica como evolução futura em segundo plano,
com status próprio de sincronização, sem bloquear o registro financeiro local.

## 12. Tela recomendada

Criar tela `/payments` como central de baixa.

Seções sugeridas:

- filtros;
- tabela de parcelas elegíveis;
- ação `Baixar`;
- ação futura `Baixa em lote`;
- histórico de pagamentos recentes;
- modal de baixa individual;
- modal de estorno.

Colunas iniciais:

- empresa;
- fornecedor;
- documento/série/parcela;
- vencimento;
- saldo aberto;
- status;
- forma prevista;
- ações.

## 13. Critérios de aceite do MVP

- Usuário com `PAYMENT_CREATE` acessa a baixa individual.
- Usuário sem `PAYMENT_CREATE` não consegue registrar pagamento.
- A tela lista apenas parcelas com saldo aberto.
- A baixa exige conta bancária da empresa correta.
- A baixa deduz saldo oficial da conta bancária.
- O sistema bloqueia baixa com saldo insuficiente na conta bancária.
- Saldo inicial é lançado como primeiro movimento de entrada `Saldo de Caixa`.
- Repasse de marketplace é lançado como entrada manual categorizada por centro de custo.
- Ajuste manual de saldo é permitido apenas para admin no MVP e deve ser auditado.
- Transferência entre CNPJs é bloqueada no MVP.
- Pagamento parcial atualiza parcela para `PARTIALLY_PAID`.
- Pagamento integral atualiza parcela para `PAID`.
- Quando todas as parcelas forem pagas, título fica `PAID`.
- Pagamento acima do saldo pede confirmação.
- Estorno restaura saldo da parcela, status e saldo da conta bancária.
- Auditoria é registrada nas mutações.

## 14. Próxima implementação sugerida

1. Criar modelo de movimentos de conta bancária e saldo oficial por conta.
2. Criar endpoint de entrada manual de saldo, incluindo `Saldo de Caixa`, repasse de marketplace e ajuste admin.
3. Criar endpoint de parcelas elegíveis para baixa.
4. Criar validação de empresa entre título e conta bancária no `POST /payments`.
5. Deduzir saldo oficial da conta no registro de pagamento.
6. Restaurar/compensar saldo oficial no estorno.
7. Criar tela `/payments` com filtros e modal de baixa individual.
8. Criar testes de API para baixa com empresa/conta incompatível e saldo insuficiente.
9. Criar testes frontend para modal de baixa.

Pagamento em lote, comprovantes, caixa bancário e conciliação devem ficar para ciclos
posteriores, porque exigem decisões adicionais de tesouraria.

## 15. Decisões fechadas para o MVP

- Saldo insuficiente bloqueia a baixa.
- Repasse de marketplace entra por lançamento manual categorizado por centro de custo.
- Marketplaces/canais serão separados por contas de centro de custo, não por cadastro próprio no MVP.
- Transferência entre CNPJs fica bloqueada no MVP.
- Exceção auditada entre CNPJs fica para ciclo futuro.
- Ajuste manual de saldo pode existir no MVP, somente para admin e sempre auditado.
- Saldo inicial da conta será lançado como primeiro movimento de entrada do tipo `Saldo de Caixa`.
