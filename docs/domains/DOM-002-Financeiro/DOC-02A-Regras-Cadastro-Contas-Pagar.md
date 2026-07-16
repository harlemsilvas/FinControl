# DOC-02A — Regras de Negócio do Cadastro de Contas a Pagar

**Projeto:** FinControl  
**Domínio:** DOM-002 — Financeiro  
**Código:** DOC-02A  
**Versão:** 0.1  
**Status:** Em elaboração  
**Data:** 16/07/2026  

## 1. Objetivo

Definir as regras de negócio do cadastro de títulos a pagar, parcelas, valores, validações, estados iniciais e rastreabilidade.

## 2. Cadastro básico

### RN-CP-001 — Fornecedor obrigatório
Todo título deverá possuir fornecedor válido e ativo.

### RN-CP-002 — Categoria obrigatória
Todo título deverá possuir categoria financeira válida e ativa.

### RN-CP-003 — Descrição obrigatória
O campo Descrição / Histórico deverá ser preenchido.

### RN-CP-004 — Número do Documento obrigatório
O Número do Documento deverá ser informado em todo lançamento.

### RN-CP-005 — Série opcional
A Série será opcional, mas participará da validação de duplicidade quando preenchida.

### RN-CP-006 — Tipo de Documento obrigatório
Todo título deverá possuir um Tipo de Documento ativo.

### RN-CP-007 — Parcela obrigatória
Todo título deverá possuir parcela no padrão `n/N`.

### RN-CP-008 — Título sem parcelamento
Quando não houver parcelamento, o sistema deverá utilizar `1/1`.

### RN-CP-009 — Validação da parcela
A parcela atual e o total deverão ser inteiros maiores ou iguais a 1, e a parcela atual não poderá ser superior ao total.

### RN-CP-010 — Data de Emissão obrigatória
A Data de Emissão deverá ser informada.

### RN-CP-011 — Data de Vencimento obrigatória
A Data de Vencimento deverá ser informada.

### RN-CP-012 — Forma de Pagamento obrigatória
A Forma de Pagamento prevista deverá ser informada.

### RN-CP-013 — Condição de Pagamento opcional
A Condição de Pagamento poderá ser informada para referência comercial.

## 3. Valores

### RN-CP-014 — Valor Original
O Valor Original deverá ser maior que zero.

### RN-CP-015 — Desconto
O Desconto deverá ser maior ou igual a zero.

### RN-CP-016 — Acréscimo
O Acréscimo deverá ser maior ou igual a zero.

### RN-CP-017 — Valor Total
O Valor Total será calculado por:

```text
Valor Total = Valor Original - Desconto + Acréscimo
```

### RN-CP-018 — Valor Total somente leitura
O usuário não poderá alterar diretamente o Valor Total.

### RN-CP-019 — Total negativo ou nulo
O sistema não deverá permitir salvar título cujo Valor Total seja menor ou igual a zero.

## 4. Duplicidade

### RN-CP-020 — Chave mínima de duplicidade
O sistema deverá verificar possível duplicidade utilizando:

- fornecedor;
- número do documento;
- série, quando informada;
- parcela.

### RN-CP-021 — Alerta de duplicidade
Ao encontrar possível duplicidade, o sistema deverá alertar o usuário antes da gravação.

### RN-CP-022 — Auditoria de confirmação
Caso o sistema permita continuar após o alerta, a confirmação deverá gerar auditoria.

### RN-CP-023 — Documento sem natureza fiscal
Títulos sem documento fiscal continuarão obrigados a possuir Número do Documento, podendo utilizar referência interna configurada.

## 5. Campos removidos ou realocados

### RN-CP-024 — Projeto
Projeto não fará parte da primeira página do cadastro no MVP.

### RN-CP-025 — Conta Bancária
Conta Bancária não será solicitada no cadastro do título.

### RN-CP-026 — Momento da Conta Bancária
A Conta Bancária será informada na Programação de Pagamento ou na efetivação do pagamento.

### RN-CP-027 — Centro de Custo
Centro de Custo será informação complementar localizada na aba Observações.

### RN-CP-028 — Marcadores
O título poderá possuir um ou vários marcadores para pesquisa e classificação.

## 6. Ações do formulário

### RN-CP-029 — Salvar
A ação Salvar deverá validar o formulário, persistir o título e registrar auditoria.

### RN-CP-030 — Salvar e Nova
A ação Salvar e Nova deverá salvar o título atual e abrir formulário limpo.

### RN-CP-031 — Cancelar edição
A ação Cancelar não deverá cancelar o título financeiro; deverá apenas abandonar alterações não salvas.

### RN-CP-032 — Ativo
O campo Ativo controlará a disponibilidade lógica do registro, sem exclusão física.

## 7. Parcelas

### RN-PARC-001 — Identificação
Cada parcela deverá possuir identificação própria, mantendo vínculo com o documento original.

### RN-PARC-002 — Consulta
Número do documento e parcela deverão aparecer juntos em consultas e listagens.

### RN-PARC-003 — Independência de vencimento
Cada parcela poderá possuir Data de Vencimento própria.

### RN-PARC-004 — Independência de status
Cada parcela poderá possuir status próprio.

### RN-PARC-005 — Soma das parcelas
Quando o sistema gerar parcelas automaticamente, a soma dos valores deverá ser igual ao valor total do documento.

### RN-PARC-006 — Arredondamento
Diferenças de arredondamento deverão ser ajustadas na última parcela.

### RN-PARC-007 — Alteração individual
O usuário poderá alterar vencimento e valor individual, desde que a soma final permaneça consistente.

### RN-PARC-008 — Parcela paga
Parcela paga não poderá ter valor, fornecedor ou documento alterados sem estorno.

## 8. Status iniciais

### RN-EST-001 — Rascunho
Título salvo sem conclusão poderá permanecer como Rascunho.

### RN-EST-002 — Em Aberto
Título concluído e ainda não pago deverá possuir status Em Aberto.

### RN-EST-003 — Atrasado
Título Em Aberto cuja data de vencimento seja anterior à data atual deverá ser apresentado como Atrasado.

### RN-EST-004 — Parcialmente Pago
Título com saldo maior que zero e pelo menos um pagamento deverá possuir status Parcialmente Pago.

### RN-EST-005 — Pago
Título com saldo igual a zero deverá possuir status Pago.

### RN-EST-006 — Cancelado
Título encerrado antes da quitação deverá possuir status Cancelado.

### RN-EST-007 — Estornado
Pagamento revertido deverá gerar evento de estorno e recalcular o status do título.

### RN-EST-008 — Destaque visual
Títulos Em Aberto e Atrasados deverão possuir destaque visual consistente na agenda e listagem.

## 9. Auditoria

### RN-AUD-001
A criação do título deverá registrar usuário, data, hora e origem.

### RN-AUD-002
Alterações deverão registrar valores anteriores e novos.

### RN-AUD-003
Confirmação de possível duplicidade deverá ser auditada.

### RN-AUD-004
Mudança de status deverá ser registrada.

### RN-AUD-005
Exclusões físicas não serão permitidas para títulos com histórico financeiro.

## 10. Pendências para validação futura

- Se o alerta de duplicidade poderá ser ignorado por qualquer usuário ou apenas por perfil autorizado.
- Regra final para títulos sem documento fiscal.
- Definição do limite de caracteres do Número do Documento.
- Definição dos tipos de documento iniciais.
- Obrigatoriedade futura do Centro de Custo por configuração.
