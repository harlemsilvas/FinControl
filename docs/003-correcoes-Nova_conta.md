## Nova Conta a Pagar

A criação da conta esta solicitando muitos dados, que não são necessários nesta etapa. Coloquei [], para inserir o [*] no que realmente é necessário e alguma observação colocarei na frente entre { informacao }

# Nova Conta a Pagar [*] { Página em si}

Campos necessários:

## Dados da Conta [] {Primeira aba}

- Empresa [*]
- Fornecedor [*]
- Forma de Pagamento [] { Não necessário, pois só sera gravada quando fizer o pagamento }
- Data Emissão [*]
- Data Vencimento [*]
- Valor [*]
- Nº Documento [*]
- Histórico / Descrição [] { Esta descrição pode ser gerada a partir do conexto, Empresa + Nome Fantasia/empresa + Numero do documento + Data de Vencimento }
- Categoria [*]
- Tipo de Documento [] { Definir padrão Boleto, se precisar alterar o usuario seleciona na Lista }

- Ocorrência [] {Não deve mais aparecer}
  - Tipo de Ocorrência []
  - Dia de Vencimento []
  - Número de Parcelas []
  - Alterar conta recorrente []

- Detalhes adicionais preservados [] { Só deve aparecer se for importação do xml }
  - Série [*]
  - Condição de Pagamento [*]
  - Desconto []
  - Acréscimo []

## Parcelas [*] { Segunda Aba - exibir somente leitura, se precisar ser editado, teremos um icon React Edit e Cancel. Os botões devem liberar a edição de todas as parcelas}

- Parcela [*] {Se for uma conta gerada a partir da xml }
- Total [*]
- Valor [*]
- Vencimento [*]
- Forma de Pagamento [] {Não exibir, pois só é um informação que vai aparecer quando ela for paga }

## Impostos [] { Terceir Aba - Não aparecer por enquanto }

## Aprovações [] { Quarta Aba - Não aparecer enquanto não tivermos o modulo de aprovação }

## Anexos [*] { Quinta Aba}

## Observações [*] { Sexta Aba - Podem aparecer, mas não será necessário}

- Centro de Custo [*] { Já salva o centro de custo padrão da Empresa Selecionada, senão tiver a informação deixe em branco }
- Observação []
- Salvar com Rascunho []

## Análise técnica em 31/07/2026

### O que podemos fazer já

- Simplificar a aba `Dados da Conta` para criação manual:
  - manter visíveis `Empresa`, `Fornecedor`, `Data de Emissão`,
    `Data de Vencimento`, `Valor`, `Nº Documento`, `Categoria`,
    `Histórico / Descrição` e `Tipo de Documento`;
  - remover da visualização principal `Forma de Pagamento`, porque o meio de
    pagamento efetivo pertence à baixa/pagamento;
  - remover o bloco `Ocorrência` da tela de nova conta manual; recorrência deve
    continuar pelo fluxo específico de recorrências;
  - manter `Tipo de Documento` com valor padrão quando possível, evitando exigir
    escolha manual em todo lançamento.
- Simplificar as abas:
  - ocultar `Impostos` enquanto não houver regra fiscal aprovada;
  - ocultar `Aprovações` enquanto o módulo/fluxo de aprovação não estiver
    operacional;
  - manter `Anexos` e `Observações`;
  - manter `Parcelas`, mas sem `Forma de Pagamento`.
- Em `Parcelas`, deixar o pagamento fora do formulário:
  - a parcela deve registrar número, total, valor e vencimento;
  - forma de pagamento deve ser definida no momento da baixa.
- Em `Detalhes adicionais preservados`:
  - manter somente para edição ou títulos importados por XML;
  - não expor como passo obrigatório para uma conta manual simples.

### Pontos que exigem cuidado antes de implementar

- O backend hoje exige `documentTypeId` e as parcelas aceitam
  `paymentMethodId`; precisamos confirmar se a API já aceita parcela sem forma
  de pagamento ou se devemos ajustar backend/contrato junto.
- A geração automática de `Histórico / Descrição` pode ser feita depois; no
  primeiro pacote é mais seguro manter o campo visível e opcional/assistido,
  sem inventar regra que o usuário não pediu para validar.
- Centro de custo padrão por empresa depende de existir esse parâmetro
  persistido/consultável; se ainda não existir, manter o campo manual na aba
  `Observações` e tratar o autopreenchimento em pacote próprio.

### Dúvidas funcionais para decisão

- Quando houver conta parcelada manual, a criação deve continuar acontecendo
  pela aba `Parcelas`, ou vamos ter um botão/ação específica `Criar conta
parcelada` fora da primeira aba? { Sim, deixar o botão para adicionar parcela }
- `Tipo de Documento` deve assumir sempre `Boleto` para conta manual, ou deve
  usar um parâmetro padrão por empresa quando existir? {SE tiver o padrão da empresa pode deixar, senão inserir como Boleto}
- `Histórico / Descrição` deve ser obrigatório no backend ou pode ser gerado
  automaticamente quando vier vazio? {Não deve bloquear o salvamento, se deixar vazio, salva com o modeo que inseri, {Esta descrição pode ser gerada a partir do conexto, Empresa + Nome Fantasia/empresa + Numero do documento + Data de Vencimento}}

## Verificação pós-preenchimento em 31/07/2026

### Decisões fechadas

- Conta parcelada manual continua sendo criada pela aba `Parcelas`, com botão
  para adicionar parcela.
- `Tipo de Documento` deve ser preenchido automaticamente:
  - primeiro tenta usar o padrão da empresa;
  - se não houver padrão da empresa, usa `Boleto`.
- `Histórico / Descrição` não deve bloquear o salvamento:
  - se o usuário informar, preserva o texto digitado;
  - se ficar vazio, o sistema gera descrição pelo contexto:
    `Empresa + Fornecedor + Número do documento + Data de vencimento`.

### Restrição técnica encontrada

- Hoje `financeiro.payable_installments.payment_method_id` é `NOT NULL`.
- Portanto, a tela pode esconder `Forma de Pagamento`, mas a criação ainda
  precisa gravar um valor técnico de forma de pagamento na parcela.
- Caminho recomendado para este pacote:
  - usar o padrão da empresa quando existir;
  - se não existir, usar `Boleto` como fallback;
  - manter a definição real da forma usada no pagamento dentro da rotina de
    `Baixa de Pagamentos`.
- Uma mudança futura pode tornar `payment_method_id` da parcela opcional, mas
  isso exige migration, revisão de joins/listagens e não deve ser misturado a
  este pacote de simplificação visual.

### Primeiro pacote executável recomendado

- Ajustar frontend de `Nova Conta`:
  - remover `Forma de Pagamento` da aba `Dados da Conta`;
  - remover bloco `Ocorrência`;
  - ocultar abas `Impostos` e `Aprovações`;
  - remover `Forma de Pagamento` da aba `Parcelas`;
  - manter botão `Adicionar parcela`;
  - gerar descrição automática quando o campo ficar vazio;
  - aplicar padrão/fallback de `Tipo de Documento`;
  - aplicar padrão/fallback técnico de `Forma de Pagamento` sem exibir o campo.
- Ajustar testes do formulário para garantir que os campos removidos não
  aparecem na criação manual e que o payload continua válido para a API atual.

## Pacote aplicado em 31/07/2026

- A estrutura de abas da conta manual foi simplificada para:
  - `Dados da Conta`;
  - `Parcelas`;
  - `Anexos`;
  - `Observações`.
- As abas `Impostos` e `Aprovações` foram ocultadas enquanto não houver fluxo
  funcional aprovado.
- Na aba `Dados da Conta`:
  - `Forma de Pagamento` foi removida da tela;
  - o bloco `Ocorrência` foi removido;
  - `Histórico / Descrição` deixou de bloquear salvamento quando vazio;
  - `Tipo de Documento` continua disponível, mas sem obrigar seleção manual.
- Na criação manual:
  - se `Tipo de Documento` ficar vazio, o sistema usa `Boleto`;
  - se a forma técnica de pagamento da parcela ficar vazia, o sistema usa
    `Boleto`;
  - se `Histórico / Descrição` ficar vazio, o sistema gera:
    `Empresa - Fornecedor - Número do documento - Data de vencimento`.
- Na aba `Parcelas`:
  - `Forma de Pagamento` foi removida da visualização;
  - `Adicionar parcela` permanece disponível para conta parcelada manual;
  - ao adicionar ou remover parcelas, os campos `Parcela` e `Total` são
    renumerados para manter a sequência coerente;
  - a forma técnica `Boleto` continua sendo enviada internamente para preservar
    compatibilidade com o banco atual, que ainda exige
    `payment_method_id NOT NULL`.
- `Detalhes adicionais preservados` passam a aparecer somente em edição de
  título com origem XML.
- Validações focadas executadas:
  - `npm test --workspace @fincontrol/web -- payable-form-page.test.tsx payable-form-contract.test.ts`;
  - `npm run typecheck --workspace @fincontrol/web`.

## Correção complementar em 31/07/2026

- A regra de possível duplicidade da criação manual foi refinada:
  - antes o alerta considerava empresa, fornecedor, documento e série;
  - agora o alerta também exige coincidência de parcela e vencimento.
- Com isso, uma conta com mesmo fornecedor/documento/série, mas vencimento
  diferente, não deve mais abrir o modal `Possível duplicidade`.
- Validações focadas executadas:
  - `npm test --workspace @fincontrol/api -- payables-repository.test.ts`;
  - `npm run typecheck --workspace @fincontrol/api`.
