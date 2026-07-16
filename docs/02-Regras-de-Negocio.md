# Documento 02 — Regras de Negócio

**Projeto:** FinControl  
**Módulo:** Contas a Pagar  
**Status:** Rascunho inicial  
**Versão:** 0.1  

## 1. Objetivo

Consolidar as regras que controlam o comportamento funcional do módulo Contas a Pagar.

## 2. Convenção de identificação

Cada regra terá um código único:

- `RN-CP-001`: regra de Contas a Pagar
- `RN-FOR-001`: regra de Fornecedores
- `RN-APR-001`: regra de Aprovações
- `RN-PAG-001`: regra de Pagamentos

## 3. Regras preliminares

### RN-CP-001 — Identificação do título

Todo título deverá possuir identificador único interno.

### RN-CP-002 — Empresa obrigatória

Todo título deverá estar vinculado a uma empresa ativa.

### RN-CP-003 — Fornecedor obrigatório

Todo título deverá possuir fornecedor válido e ativo, salvo tipos de lançamento autorizados por configuração.

### RN-CP-004 — Valor do título

O valor original deverá ser maior que zero.

### RN-CP-005 — Datas

A data de vencimento é obrigatória. A data de competência será obrigatória quando definida pela configuração da empresa.

### RN-CP-006 — Parcelamento

A soma das parcelas deverá ser igual ao valor total do título, respeitando arredondamentos definidos pelo sistema.

### RN-CP-007 — Situações

Estados iniciais previstos:

- Rascunho
- Pendente
- Em aprovação
- Aprovado
- Programado
- Parcialmente pago
- Pago
- Vencido
- Cancelado
- Estornado

### RN-CP-008 — Alteração após pagamento

Um título pago não poderá ter seus dados financeiros essenciais alterados. Correções deverão ocorrer por estorno e novo lançamento.

### RN-PAG-001 — Pagamento parcial

Pagamentos parciais serão permitidos somente quando habilitados na configuração da empresa.

### RN-PAG-002 — Juros, multa e desconto

Juros, multa e desconto deverão ser registrados separadamente do valor original.

### RN-APR-001 — Aprovação

Quando o fluxo de aprovação estiver habilitado, o título não poderá ser programado para pagamento antes da aprovação final.

### RN-APR-002 — Segregação de função

O sistema poderá impedir que o mesmo usuário lance e aprove o título, conforme configuração.

### RN-AUD-001 — Auditoria

Inclusões, alterações, aprovações, pagamentos, cancelamentos e estornos deverão gerar registro de auditoria.

## 4. Pendências de validação

- Definição final dos status.
- Regras de tolerância e arredondamento.
- Critérios de duplicidade.
- Política de exclusão.
- Política de anexos.
- Alçadas de aprovação.
- Regras de recorrência.
- Regras fiscais e retenções.
