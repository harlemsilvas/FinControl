# DOC-00 — Visão do Domínio do FinControl

**Projeto:** FinControl  
**Código:** DOC-00  
**Versão:** 0.1  
**Status:** Em elaboração  
**Data:** 16/07/2026  

## 1. Objetivo

Definir o vocabulário oficial do domínio financeiro do FinControl, evitando ambiguidades entre documentação, interface, banco de dados, APIs e testes.

## 2. Conceitos principais

### Título a Pagar
Obrigação financeira registrada no sistema, vinculada a um fornecedor, categoria, documento, vencimento e valor.

### Parcela
Parte individual de um título parcelado, identificada no padrão `n/N`, como `1/5` ou `2/5`.

### Fornecedor
Pessoa física, jurídica ou estrangeira que receberá o pagamento.

### Categoria Financeira
Classificação utilizada para organizar despesas e gerar relatórios gerenciais.

### Centro de Custo
Classificação gerencial complementar, informada na aba Observações.

### Forma de Pagamento
Forma prevista ou efetiva de quitação, como PIX, boleto, transferência, cartão ou dinheiro.

### Condição de Pagamento
Condição comercial que define prazo, parcelamento ou regra acordada com o fornecedor.

### Programação de Pagamento
Etapa em que títulos são preparados para quitação, com definição da conta bancária e demais informações operacionais.

### Pagamento
Evento que registra a quitação integral ou parcial de um título.

### Pagamento Parcial
Pagamento cujo valor não quita totalmente o saldo do título.

### Adiantamento
Valor pago antes da existência ou conclusão do título definitivo, posteriormente vinculado ou compensado.

### Estorno
Reversão controlada de um pagamento, com restauração de saldo e manutenção do histórico.

### Cancelamento
Encerramento de um título ainda não pago, mediante justificativa e auditoria.

### Aprovação
Processo configurável de autorização de um título antes da programação ou pagamento.

### Recorrência
Regra para geração repetitiva de títulos futuros.

### Marcador
Etiqueta flexível usada para classificação, pesquisa e filtros.

### Anexo
Documento associado ao título, como nota fiscal, boleto, comprovante ou imagem.

### Auditoria
Registro permanente de ações relevantes, contendo usuário, data, operação e alterações.

## 3. Relações essenciais

- Um fornecedor pode possuir vários títulos.
- Um título pode possuir uma ou várias parcelas.
- Uma parcela pode receber um ou vários pagamentos.
- Um pagamento pertence a uma parcela ou título.
- Um título pode possuir vários anexos.
- Um título pode possuir vários marcadores.
- Um título pode possuir eventos de auditoria.
- Centro de Custo é informação complementar.
- Conta Bancária pertence ao processo de programação ou pagamento, não ao cadastro inicial.

## 4. Convenções oficiais

- Requisitos Funcionais: `RF-XXX`
- Regras de Negócio: `RN-XXX`
- Casos de Uso: `UC-XXX`
- Wireframes: `WF-XXX`
- Decisões: `DA-XXX`
- Eventos de Auditoria: `EV-XXX`
- Tabelas: `TB-XXX`
- APIs: `API-XXX`
- Casos de Teste: `CT-XXX`
