# DOC-03 — Fluxos Operacionais

**Projeto:** FinControl  
**Código:** DOC-03  
**Versão:** 0.1  
**Status:** Em elaboração  
**Data:** 16/07/2026  

## 1. Objetivo

Mapear os fluxos operacionais do módulo Contas a Pagar.

## 2. Fluxo FO-CP-001 — Cadastrar Conta a Pagar

```text
Início
  ↓
Selecionar fornecedor
  ↓
Selecionar categoria
  ↓
Informar descrição
  ↓
Informar número do documento
  ↓
Informar parcela
  ↓
Informar datas
  ↓
Informar forma de pagamento
  ↓
Informar valores
  ↓
Validar campos obrigatórios
  ↓
Verificar duplicidade
  ↓
Duplicidade encontrada?
  ├─ Sim → Exibir alerta e solicitar confirmação/correção
  └─ Não → Continuar
  ↓
Calcular valor total
  ↓
Salvar título
  ↓
Registrar auditoria
  ↓
Necessita aprovação?
  ├─ Sim → Enviar para aprovação
  └─ Não → Manter disponível para programação
  ↓
Fim
```

## 3. Fluxo FO-CP-002 — Salvar e Nova

```text
Validar formulário
  ↓
Salvar título
  ↓
Registrar auditoria
  ↓
Limpar formulário
  ↓
Abrir novo lançamento
```

## 4. Fluxo FO-CP-003 — Pagamento Parcial

```text
Selecionar título
  ↓
Informar valor pago
  ↓
Valor maior que saldo?
  ├─ Sim → Exibir alerta e exigir confirmação
  └─ Não → Continuar
  ↓
Informar juros, multa, adicionais e desconto
  ↓
Registrar pagamento
  ↓
Atualizar saldo
  ↓
Saldo zerado?
  ├─ Sim → Status Pago
  └─ Não → Status Parcialmente Pago
  ↓
Registrar auditoria
```

## 5. Fluxo FO-CP-004 — Pagamento em Lote

```text
Filtrar títulos elegíveis
  ↓
Selecionar títulos
  ↓
Exibir lista com vencimentos
  ↓
Informar por item:
- valor pago
- juros
- multa
- adicionais
- desconto
  ↓
Validar títulos
  ↓
Confirmar lote
  ↓
Registrar pagamentos
  ↓
Atualizar saldos e status
  ↓
Registrar auditoria
```

## 6. Fluxo FO-CP-005 — Cancelamento

```text
Selecionar título não pago
  ↓
Solicitar justificativa
  ↓
Validar permissão
  ↓
Cancelar título
  ↓
Retirar da agenda
  ↓
Registrar auditoria
```

## 7. Fluxo FO-CP-006 — Estorno

```text
Selecionar pagamento
  ↓
Validar permissão
  ↓
Solicitar justificativa
  ↓
Estornar pagamento
  ↓
Restaurar saldo
  ↓
Restaurar status
  ↓
Registrar auditoria
```

## 8. Pendências funcionais

- Regra final da compensação.
- Arquivo bancário no MVP.
- Fluxo detalhado de aprovação.
- Regras de rateio.
- Processo de homologação de fornecedores.
