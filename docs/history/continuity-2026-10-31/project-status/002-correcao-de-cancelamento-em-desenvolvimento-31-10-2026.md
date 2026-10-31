## Correção de cancelamento em desenvolvimento — 31/10/2026

Usuário confirmou uso de "Cancelar título" e relatou duplicados na Agenda.
Identificada invalidação incompleta do cache (Agenda fresca por 30 segundos)
e ausência de tratamento de falhas no cancelamento individual. Ajuste local
atualiza consultas financeiras, trata erros e impede reenvio durante execução.
Teste real isolado confirmou cancelamento persistido e exclusão das consultas
operacionais, preservando histórico. Sem alteração de registros reais/deploy.
Usuário esclareceu que os registros estão cancelados, mas continuam visíveis.
Consulta ampla incluía CANCELLED: corrigida para excluir por padrão e criada
aba Cancelados na listagem. Histórico acessível por escolha explícita; sem
exclusão física. Ainda pendente de publicação deste pacote.

Validação final do ajuste de 31/10: Checar_alteracao.sh STATUS OK,
log checar_alteracao_20261031_120422.log; teste PostgreSQL real de cancelamento,
Agenda e histórico explícito aprovado com rollback. Tipos, lint, testes e builds
aprovados. Tentativas anteriores falharam em tipagem/lint de testes novos,
corrigidos antes da execução final. Base temporária encerrada. Sem commit,
push ou deploy deste pacote; aguarda conferência visual/publicação controlada.
