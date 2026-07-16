-- FinControl
-- Migration: Seed initial financial statuses
-- Version: 0.1.0

BEGIN;

INSERT INTO financeiro.payable_title_statuses
    (code, name, description, display_order, is_terminal)
VALUES
    ('DRAFT', 'Rascunho', 'Registro ainda não concluído.', 10, false),
    ('OPEN', 'Em Aberto', 'Título válido e com saldo em aberto.', 20, false),
    ('IN_APPROVAL', 'Em Aprovação', 'Título aguardando decisão de aprovação.', 30, false),
    ('APPROVED', 'Aprovado', 'Título aprovado para programação ou pagamento.', 40, false),
    ('SCHEDULED', 'Programado', 'Título incluído em programação de pagamento.', 50, false),
    ('PARTIALLY_PAID', 'Parcialmente Pago', 'Título possui pagamento e saldo restante.', 60, false),
    ('PAID', 'Pago', 'Título totalmente quitado.', 70, true),
    ('OVERDUE', 'Atrasado', 'Título vencido com saldo em aberto.', 80, false),
    ('REJECTED', 'Reprovado', 'Título reprovado, aguardando correção ou cancelamento.', 90, false),
    ('CANCELLED', 'Cancelado', 'Título encerrado sem quitação.', 100, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO financeiro.payable_installment_statuses
    (code, name, description, display_order, is_terminal)
VALUES
    ('OPEN', 'Em Aberto', 'Parcela com saldo em aberto.', 10, false),
    ('OVERDUE', 'Atrasada', 'Parcela vencida com saldo em aberto.', 20, false),
    ('PARTIALLY_PAID', 'Parcialmente Paga', 'Parcela com pagamento parcial.', 30, false),
    ('PAID', 'Paga', 'Parcela totalmente quitada.', 40, true),
    ('CANCELLED', 'Cancelada', 'Parcela cancelada.', 50, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO financeiro.payment_statuses
    (code, name, description, display_order, is_terminal)
VALUES
    ('EFFECTIVE', 'Efetivo', 'Pagamento válido e contabilizado.', 10, false),
    ('REVERSED', 'Estornado', 'Pagamento revertido.', 20, true),
    ('CANCELLED', 'Cancelado', 'Pagamento cancelado antes da efetivação.', 30, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO financeiro.payment_batch_statuses
    (code, name, description, display_order, is_terminal)
VALUES
    ('OPEN', 'Aberto', 'Lote em preparação.', 10, false),
    ('SCHEDULED', 'Programado', 'Lote programado para processamento.', 20, false),
    ('PROCESSING', 'Em Processamento', 'Lote em execução.', 30, false),
    ('PROCESSED', 'Processado', 'Lote processado com sucesso.', 40, true),
    ('PARTIALLY_PROCESSED', 'Parcialmente Processado', 'Parte dos itens foi processada.', 50, false),
    ('CANCELLED', 'Cancelado', 'Lote cancelado.', 60, true),
    ('FAILED', 'Falhou', 'Lote com falha de processamento.', 70, true)
ON CONFLICT (code) DO NOTHING;

INSERT INTO financeiro.approval_statuses
    (code, name, description, display_order, is_terminal)
VALUES
    ('PENDING', 'Pendente', 'Aguardando decisão.', 10, false),
    ('APPROVED', 'Aprovado', 'Etapa aprovada.', 20, true),
    ('REJECTED', 'Reprovado', 'Etapa reprovada.', 30, true),
    ('RETURNED', 'Devolvido', 'Devolvido para correção.', 40, false),
    ('CANCELLED', 'Cancelado', 'Etapa cancelada.', 50, true)
ON CONFLICT (code) DO NOTHING;

COMMIT;
