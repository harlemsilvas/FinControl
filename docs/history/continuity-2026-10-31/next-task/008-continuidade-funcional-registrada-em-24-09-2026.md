## Continuidade funcional registrada em 24/09/2026

- Última solicitação de interface: imprimir apenas os dados dos relatórios,
  ocultando menu lateral, cabeçalho da aplicação e controles de filtro;
  preservar período/empresa no papel, largura útil e quebra de tabelas entre
  páginas. Confirmar esse comportamento no navegador durante a retomada.

- O usuário confirmou os totais do relatório de compromissos a pagar contra
  a Agenda. Próxima entrega aprovada: `Pagamentos realizados`; em seguida,
  `Comparativo previsto x pago`.
- Relatório `Pagamentos realizados` implementado localmente em
  `/reports/payments` e `GET /api/v1/reports/payments`, com escopo multiempresa,
  filtros, resumo, agrupamentos, paginação, impressão, planilha XLSX e acesso
  direto pelo menu lateral.
  Regras e validação operacional: `docs/REPORTS-PAYMENTS-REALIZED.md`.
- Comparativo `Previsto x pago` implementado localmente em
  `/reports/planned-vs-paid` e `GET /api/v1/reports/planned-vs-paid`, com
  conjuntos independentes de vencimentos e pagamentos, filtros por empresa,
  fornecedor e categoria, impressão e planilha. Regra financeira em
  `docs/REPORTS-PLANNED-VS-PAID.md`.
- Monitoramento da API publicado no release `10b4219`, timer e alertas de
  e-mail/Telegram validados na VPS. O token exposto foi revogado e atualizado
  pelo usuário.

- Incidente de 24/09/2026: a API caiu porque o PM2 estava sem processos e
  `pm2-fincontrol.service` estava desabilitado. `pm2 resurrect` recuperou a
  API; monitor, timer e alertas foram publicados e validados. Detalhes em
  `docs/VPS-API-MONITORING.md`.
- O deploy do monitor inicialmente parou em migrations preexistentes sem
  registro. O baseline foi corrigido e o deploy de `10b4219` concluiu.

- Módulo local de certificados digitais A1 em implementação:
  - cofre por empresa com AES-256-GCM e chave exclusiva do ambiente;
  - validação de PFX/P12, senha, chave privada, validade e CNPJ;
  - permissão `DIGITAL_CERTIFICATE_MANAGE`, escopo multiempresa e auditoria;
  - tela `Configurações > Certificados digitais` sem exportação do segredo;
  - consulta SEFAZ permanece como etapa posterior e desacoplada do cofre;
  - guia operacional em `docs/DIGITAL-CERTIFICATES-A1.md`.
  - distribuição futura de DF-e via SEFAZ registrada em Features e em
    `docs/FUTURE-SEFAZ-DFE-DISTRIBUTION.md`, usando o projeto local
    `dfe-sefaz-enhanced` somente como referência técnica.

- Pacote local em desenvolvimento para completar fornecedores:
  - XML da NFe passa a preencher endereço e telefone do emitente;
  - cadastros existentes recebem somente campos ainda vazios;
  - tela de fornecedores recebe consulta pública por CNPJ com revisão manual;
  - não há migration neste pacote;
  - validações focadas de parser, serviço CNPJ, fornecedores e typecheck foram
    aprovadas; falta validação visual e checagem completa antes de commit/deploy.

- Branch de trabalho: `feature/matriz-filial-xml`.
- Checkpoint de 17/09/2026: `ac6df5b feat(web): add global toast
notifications`.
- Busca ampla de `Notas Fiscais e Contas` publicada anteriormente em
  `d55614a fix(payables): broaden text search filters` e validada visualmente.
- Workflow `Deploy VPS Native` número `35276599924` concluído com sucesso em
  17/09/2026:
  - preflight completo aprovado;
  - deploy remoto aprovado;
  - página pública respondeu HTTP `200`;
  - API e PostgreSQL responderam `status: ok`;
  - `version.json` confirmou o SHA completo
    `ac6df5b6b28a4115f2cea9a4863467fcf0eedbce`.
- Produção atual: `https://hrmmotos.com.br/fincontrol/`.
- Branches remotas sincronizadas em 11/08/2026:
  - `main`: `cc7c295`;
  - `agent/phases-5-11`: `005808c`;
  - `feature/matriz-filial-xml`: atualizada depois para `ac6df5b`.
- CI das branches sincronizadas concluído com sucesso:
  - `31544491973 main`: sucesso;
  - `31544627105 agent/phases-5-11`: sucesso;
  - `31544100605 feature/matriz-filial-xml`: sucesso.
- Arquivos locais não versionados permanecem fora do pacote e devem ser
  avaliados separadamente antes de qualquer commit:
  - `diagrams/`;
  - `docs/Erros_Correcoes/`;
  - `docs/architecture-decisions/00.1-Decisoes-de-Arquitetura.md`;
  - `docs/history/PROJECT_HISTORY.md`;
  - `docs/tabelas_fin_control.xlsx`;
  - `docs/wireframes/Tela-Agenda.jpg`.
