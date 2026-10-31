## Próxima tarefa executável

Prioridade de 31/10: corrigir o fluxo "Cancelar título". Usuário relata que
lançamentos duplicados continuam na Agenda (REC-20261022, R$ 1.421,80).
Usuário esclareceu que os registros aparecem como cancelados na listagem.
Implementadas abas Contas/Cancelados: consulta normal e busca ampla excluem
cancelados; histórico só mediante seleção explícita, sem exclusão física.
Correção local invalida Agenda/resumos após cancelamento individual e de série,
exibe recusas da API e bloqueia reenvio enquanto pendente. Teste PostgreSQL
isolado confirmou persistência CANCELLED/inativo e ausência na Agenda/abertos.
Nenhum lançamento real foi removido nem houve deploy deste ajuste. Validar
visualmente e publicar o pacote controlado; se persistir após recarga, consultar
os IDs e a auditoria atuais da VPS. Não inferir duplicidade só por valor/documento.
Banco local antigo não encontrado no Docker atual; teste usou base temporária
restaurada do backup, com rollback. Não alterar .env nem restaurar produção.

Validação final do ajuste de 31/10: Checar_alteracao.sh STATUS OK,
log checar_alteracao_20261031_120422.log; teste PostgreSQL real de cancelamento,
Agenda e histórico explícito aprovado com rollback. Tipos, lint, testes e builds
aprovados. Tentativas anteriores falharam em tipagem/lint de testes novos,
corrigidos antes da execução final. Base temporária encerrada. Sem commit,
push ou deploy deste pacote; aguarda conferência visual/publicação controlada.

Ajustes adicionais de 31/10: "Série finalizada" passou a "Geração da série
concluída", com explicação de que vencimento/pagamento continuam independentes.
Nenhuma mudança de estado financeiro ou recorrência. Ao salvar edição, retornar
à origem informada pelos links; acesso direto retorna a /payables. Filtros,
aba e página da lista são transportados na navegação. Salvar e Novo permanece
como operação de novo cadastro; criação normal mantém comportamento anterior.
Testes focados de navegação, filtros, contas/Agenda e app: 25 aprovados.

Checagem final após retorno da edição e rótulo de série: STATUS OK,
log checar_alteracao_20261031_121151.log (tipos, lint, testes e builds).
Pacote completo permanece local, sem commit/push/deploy.

### Checkpoint anterior — notas importadas

Deploy concluído: commit `478bcb735c415d26d1c2e04cacde229f50ad4aec`,
workflow `39453420210` aprovado, incluindo preflight e execução na VPS.
Backup pré-deploy concluído antes da migration 202610201200; verificação
oficial de banco PASS. SHA público confirmado, relatório HTTP 200 e
API/PostgreSQL de produção com status ok.

Usuário confirmou após o deploy: "Testado. Tudo funcionando."
Entrega do módulo encerrada com validação em produção pelo usuário.
Próxima frente a definir: backlog financeiro e revisão de dependências já
registrados abaixo. Nenhuma automação DFe/Sintegra foi iniciada.
Log privado: `.local/deploy-39453420210.log`.

A implementação local passou em Checar_alteracao.sh (STATUS OK), log
`checar_alteracao_20261020_113244.log`, testes ZIP/UI e 6 integrações reais.
Chrome conferiu ZIP, hashes, XLSX, histórico, PDF sem menus e tela móvel.
Migration 202610201200 aplicada após backup privado; dados financeiros
preservados (201 títulos, 192 pagamentos), total de 59 migrations.

Escopo: somente notas importadas manualmente e download ZIP para envio manual.
DFe/Sintegra permanece como feature futura, sem consultas automáticas.
Contratos e evidências: `docs/IMPORTED-INVOICES-REPORT-AND-EXPORT.md`.
Sessões temporárias de QA foram revogadas; arquivos reais estão em `.local/`.

Manter no backlog a revisão dos avisos npm preexistentes em @fastify/busboy e
node-forge, registrados na especificação, além da conferência financeira dos
relatórios anteriores. Não fazer atualização ampla automática de dependências.
