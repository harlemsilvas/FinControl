# DOC-06 — Máquina de Estados de Contas a Pagar

**Projeto:** FinControl  
**Domínio:** DOM-002 — Financeiro  
**Código:** DOC-06  
**Versão:** 0.1  
**Status:** Em elaboração  
**Data:** 16/07/2026  

## 1. Estados oficiais iniciais

- Rascunho
- Em Aberto
- Em Aprovação
- Aprovado
- Programado
- Parcialmente Pago
- Pago
- Atrasado
- Cancelado

`Estornado` será tratado inicialmente como evento sobre pagamento, com recálculo do estado financeiro do título.

## 2. Fluxo principal

```text
Rascunho
   ↓ concluir
Em Aberto
   ├─ exige aprovação → Em Aprovação
   ├─ não exige aprovação → Aprovado ou disponível para Programação
   └─ vencimento ultrapassado → Atrasado

Em Aprovação
   ├─ aprovar → Aprovado
   ├─ devolver → Rascunho
   └─ reprovar/cancelar → Cancelado

Aprovado
   ├─ programar → Programado
   ├─ pagar parcialmente → Parcialmente Pago
   ├─ pagar integralmente → Pago
   └─ cancelar → Cancelado

Programado
   ├─ pagar parcialmente → Parcialmente Pago
   ├─ pagar integralmente → Pago
   └─ retirar programação → Aprovado

Parcialmente Pago
   ├─ novo pagamento parcial → Parcialmente Pago
   ├─ quitação → Pago
   └─ estorno → estado recalculado

Pago
   └─ estorno → Em Aberto, Atrasado ou Parcialmente Pago

Cancelado
   └─ estado terminal, salvo reabertura futura por regra específica
```

## 3. Regras de transição

- Título Pago não poderá ser cancelado; deverá ser estornado.
- Título Cancelado não poderá receber pagamento.
- Título Atrasado é uma condição calculada sobre saldo e vencimento.
- Título com saldo zero será Pago.
- Título com pagamento e saldo positivo será Parcialmente Pago.
- Toda transição deverá gerar auditoria.
