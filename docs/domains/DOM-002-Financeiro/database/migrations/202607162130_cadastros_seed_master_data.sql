-- FinControl
-- DOM-001: Initial master data

BEGIN;

INSERT INTO cadastros.document_types (code, name, requires_fiscal_key)
VALUES
    ('INVOICE', 'Nota Fiscal', true),
    ('BOLETO', 'Boleto', false),
    ('CONTRACT', 'Contrato', false),
    ('UTILITY_BILL', 'Conta de Consumo', false),
    ('RECEIPT', 'Recibo', false),
    ('INTERNAL', 'Documento Interno', false)
ON CONFLICT (code) DO NOTHING;

INSERT INTO cadastros.payment_methods (code, name)
VALUES
    ('PIX', 'PIX'),
    ('BOLETO', 'Boleto'),
    ('BANK_TRANSFER', 'Transferência Bancária'),
    ('DIRECT_DEBIT', 'Débito Automático'),
    ('CARD', 'Cartão'),
    ('CASH', 'Dinheiro'),
    ('CHECK', 'Cheque'),
    ('COMPENSATION', 'Compensação'),
    ('OTHER', 'Outros')
ON CONFLICT (code) DO NOTHING;

INSERT INTO cadastros.attachment_types (code, name)
VALUES
    ('XML', 'XML da Nota Fiscal'),
    ('INVOICE_PDF', 'PDF da Nota Fiscal'),
    ('BOLETO', 'Boleto'),
    ('PAYMENT_RECEIPT', 'Comprovante de Pagamento'),
    ('CONTRACT', 'Contrato'),
    ('IMAGE', 'Imagem'),
    ('OTHER', 'Outro')
ON CONFLICT (code) DO NOTHING;

COMMIT;
