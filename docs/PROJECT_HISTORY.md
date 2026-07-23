# PROJECT_HISTORY — FinControl

## 16/07/2026

### PH-0001

A tela de Cadastro de Contas a Pagar foi aprovada como referência visual inicial.

### PH-0002

Foram removidos da primeira página os campos Projeto, Conta Bancária e Centro de
Custo.

### PH-0003

Foram definidos Número do Documento obrigatório e Parcela obrigatória no padrão
`n/N`.

### PH-0004

O Centro de Custo foi transferido para a aba Observações.

### PH-0005

A imagem gerada foi preservada como artefato histórico.

### PH-0006

Foi criado o DOC-00 — Visão do Domínio.

### PH-0007

Foi criado o DOC-03 — Fluxos Operacionais.

### PH-0008

Foi criada a RTM-001 — Matriz de Rastreabilidade.

### PH-0016

Iniciado o modelo lógico preliminar do DOM-002 — Financeiro.

### PH-0017

Definidas onze estruturas lógicas iniciais para títulos, parcelas, pagamentos,
estornos, lotes, anexos, marcadores, aprovações, importações XML e auditoria.

### PH-0018

Criado o DER preliminar do DOM-002 em Mermaid.

### PH-0019

Documentadas as restrições, os índices preliminares e as pendências necessárias
antes do modelo físico e das migrations PostgreSQL.

### PH-0020

Aprovado o uso de schemas separados por domínio.

### PH-0021

Aprovado o uso de tabelas de domínio em vez de enums PostgreSQL.

### PH-0022

Definido armazenamento de anexos em diretório privado da VPS, com metadados no
banco.

### PH-0023

Definida exclusão lógica como padrão e rotina física restrita para manutenção.

### PH-0024

Definidos UUID com pgcrypto, auditoria, timestamps e integridade referencial.

### PH-0025

Criados o DOC-09 — Modelo Físico PostgreSQL e o DOC-09A — Convenções de
Migrations.

## 23/07/2026

### PH-0026

Foi aprovada a especificação MVP de contas a pagar recorrentes.

### PH-0027

Foram criadas as migrations locais de recorrências e de permissões de acesso ao
módulo.

### PH-0028

API, tela `/recurrences` e fluxo de preview/geração foram implementados no
código local.

### PH-0029

Foi adicionada cobertura automatizada de backend, frontend e integração real com
PostgreSQL local para recorrências.

### PH-0030

Foram refinados os atalhos de recorrência na listagem e no detalhe de contas a
pagar, incluindo revisão futura, cancelamento de série e prévia dos títulos
futuros afetados.
