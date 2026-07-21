# FinControl — Fase 11: Frontend de Contas a Pagar

**Data:** 16/07/2026
**Status:** concluída para o modelo funcional atual
**Próxima fase:** dashboard e agenda

## Listagem

- menu financeiro e rota `/payables`;
- pesquisa por documento, descrição ou fornecedor;
- filtro por estado;
- paginação;
- destaque para títulos atrasados e pagos;
- documento, fornecedor, descrição, status e saldo aberto;
- navegação para criação e edição.

## Cadastro em abas

O formulário segue as seis abas do wireframe aprovado:

1. Dados da Conta;
2. Parcelas;
3. Impostos;
4. Aprovações;
5. Anexos;
6. Observações.

### Dados da Conta

Contém fornecedor, categoria, descrição, número e tipo de documento, série, emissão,
condição de pagamento, valor original, desconto, acréscimo e total calculado somente
para leitura.

Projeto, Conta Bancária e Centro de Custo não aparecem nesta aba. Centro de Custo foi
mantido exclusivamente em Observações, conforme RN-CP-024 a RN-CP-027.

### Parcelas

- uma parcela `1/1` é criada por padrão;
- inclusão e remoção de parcelas em títulos novos;
- número atual, quantidade total, valor, vencimento e forma de pagamento;
- soma comparada em centavos com o valor total;
- edição individual usa o contrato protegido da API.

### Fluxos complementares

- alerta de duplicidade `409` com opções Revisar ou Confirmar e salvar;
- confirmação auditada enviada apenas após ação explícita;
- cancelamento financeiro separado do simples abandono da edição;
- justificativa obrigatória no cancelamento;
- visualização dos estados de aprovação;
- visualização dos metadados de anexos existentes;
- Centro de Custo, observações e opção de rascunho na aba Observações.

## Limites preservados

- Impostos exibe uma seção informativa porque impostos e retenções continuam pendentes
  de decisão funcional; nenhum campo fiscal foi inventado.
- A aba Anexos exibe metadados. Upload binário aguarda a política de armazenamento,
  retenção e limites de arquivo.
- A criação de aprovadores depende de uma futura API de consulta administrativa de
  usuários; a aba atual apresenta o workflow já persistido.

## Validações

```text
npm run lint      PASS — API e web
npm run typecheck PASS — API e web
npm test          PASS — 27 testes API + 6 testes web
npm run build     PASS — API e web

Vite production build:
246 módulos transformados
CSS: 21,56 kB (5,04 kB gzip)
Aplicação: 222,04 kB (68,37 kB gzip)
React: 101,70 kB (34,37 kB gzip)
Dados: 82,44 kB (28,24 kB gzip)
Formulários: 93,30 kB (28,16 kB gzip)
```
