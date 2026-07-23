# FinControl — AI Context

**Status deste contexto:** ativo  
**Última atualização:** 23/07/2026

## 1. Objetivo

Este arquivo é a memória estável do projeto para sessões de IA.

Ele deve registrar apenas contexto estrutural e decisões permanentes, evitando
misturar tarefa do momento, pendências operacionais pontuais ou checklist de
uma entrega específica.

## 2. Produto e arquitetura

- O FinControl é um ERP financeiro modular.
- O primeiro módulo funcional é `DOM-002 — Financeiro / Contas a Pagar`.
- A arquitetura foi preparada para crescer para:
  - contas a receber;
  - fluxo de caixa;
  - tesouraria;
  - conciliação bancária;
  - compras;
  - fiscal;
  - estoque;
  - contabilidade;
  - relatórios e indicadores;
  - integrações bancárias e externas.

## 3. Domínios oficiais

- `DOM-001 — Cadastros`
- `DOM-002 — Financeiro`
- `DOM-003 — Tesouraria`
- `DOM-004 — Administração`
- `DOM-005 — Inteligência e Relatórios`
- `DOM-006 — Integrações`

## 4. Stack oficial

- Frontend: React + Vite + TypeScript
- Backend: Node.js 22 + Fastify + TypeScript
- Banco: PostgreSQL 17
- Infra local: Docker Desktop no Windows
- Deploy atual: PostgreSQL em Docker na VPS, API Node.js nativa com PM2 e
  frontend estático em Nginx

## 5. Princípios obrigatórios

- Documentation First
- arquitetura modular
- baixo acoplamento
- alta coesão
- rastreabilidade
- auditoria
- exclusão lógica quando aplicável
- migrations imutáveis
- segurança por perfil e permissão
- domínio financeiro separado dos demais domínios

## 6. Regras técnicas permanentes

- Não reiniciar o projeto do zero nem substituir a arquitetura oficial.
- Não criar aplicação paralela fora da estrutura oficial `apps/api` e
  `apps/web`.
- Não substituir Fastify por outro framework HTTP.
- Não usar armazenamento em memória para regras persistentes do sistema.
- Não alterar migrations já aplicadas; toda correção estrutural deve ser nova
  migration.
- Não criar objetos de aplicação no schema PostgreSQL `public`.
- Usar o Docker Desktop do Windows para o PostgreSQL local.
- Documentar validações, decisões e desvios relevantes.

## 7. Regras funcionais permanentes já aprovadas

### Contas a pagar

- Campos obrigatórios iniciais:
  - fornecedor;
  - categoria;
  - descrição/histórico;
  - número do documento;
  - tipo de documento;
  - parcela;
  - data de emissão;
  - data de vencimento;
  - forma de pagamento;
  - valor original.
- `Valor Total = Valor Original - Desconto + Acréscimo`.
- `Projeto` não faz parte da primeira página.
- `Conta Bancária` não aparece no cadastro inicial.
- `Conta Bancária` deve ser informada na programação ou pagamento.
- `Centro de Custo` fica na aba Observações/Complementos.
- Parcela usa padrão obrigatório `n/N`.
- Duplicidade gera alerta, não bloqueio absoluto; continuidade deve ser
  confirmada e auditada.

### Multiempresa

- A empresa do XML é resolvida pelo CNPJ do destinatário.
- Não existe empresa ativa global por sessão nesta fase.
- Consultas e relatórios futuros devem preferir filtro explícito por empresa ou
  todas.
- Os dados de fundação multiempresa já existentes não devem ser reinterpretados
  como escopo global invisível.

## 8. Estado estrutural já consolidado até 23/07/2026

- Fases 1 a 16 foram concluídas e documentadas.
- O deploy manual controlado na VPS foi validado.
- O workflow `.github/workflows/deploy-production.yml` já existe no repositório.
- O sistema avançou além da Fase 16 com:
  - evolução operacional de XML imports;
  - fundação multiempresa;
  - parâmetros por empresa;
  - pagamentos com saldo oficial e comprovantes;
  - movimentos de conta bancária;
  - contas recorrentes com geração, revisão futura, cancelamento de série e
    prévia dos títulos futuros afetados.

## 9. Documentos de continuidade

### Arquivos-raiz de retomada

- `AI_CONTEXT.md`: memória permanente
- `PROJECT_STATUS.md`: estado consolidado do projeto
- `NEXT_TASK.md`: próxima tarefa executável
- `AGENTS.md`: ordem de leitura e regras obrigatórias
- `README.md`: setup e execução

### Documentos operacionais vivos

- `docs/MULTIEMPRESA-DEVELOPMENT-CHECKLIST.md`
- `docs/MULTIEMPRESA-EXECUTION-BACKLOG.md`
- `docs/MULTIEMPRESA-IMPLEMENTATION-PLAN.md`
- `docs/PAYABLES-RECURRENCES.md`
- `docs/XML-IMPORTS-LIST-PAGE.md`
- `docs/XML-IMPORTS-TECHNICAL-AUDIT-2026-07-21.md`
- `docs/VPS-DEPLOY-PLAN-2026-07-22.md`

### Documentos de futuro

Os documentos `docs/FUTURE-*.md` e equivalentes não devem ser abandonados nem
misturados ao status atual. Eles representam:

- escopo deliberadamente adiado;
- desenho futuro já analisado;
- decisões negativas temporárias;
- backlog qualitativo que não deve sumir durante reorganizações.

Ao reorganizar a continuidade, esses arquivos devem ser preservados como
referência de roadmap futuro, e não como descrição do estado atual.
