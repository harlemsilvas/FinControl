-- FinControl
-- DOM-002: Payable recurrences foundation

BEGIN;

CREATE TABLE financeiro.payable_recurrence_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(80) NOT NULL,
    description varchar(255),
    display_order integer NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payable_recurrence_statuses_code UNIQUE (code),
    CONSTRAINT ck_payable_recurrence_statuses_display_order CHECK (display_order >= 0)
);

CREATE TRIGGER trg_payable_recurrence_statuses_updated_at
BEFORE UPDATE ON financeiro.payable_recurrence_statuses
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

INSERT INTO financeiro.payable_recurrence_statuses
    (code, name, description, display_order, is_terminal)
VALUES
    ('ACTIVE', 'Ativa', 'Recorrência apta para gerar títulos.', 10, false),
    ('SUSPENDED', 'Suspensa', 'Recorrência pausada temporariamente.', 20, false),
    ('CANCELLED', 'Cancelada', 'Recorrência encerrada definitivamente.', 30, true),
    ('FINISHED', 'Finalizada', 'Recorrência encerrada por atingir data final ou quantidade máxima.', 40, true)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE financeiro.payable_recurrences (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id uuid NOT NULL,
    supplier_id uuid NOT NULL,
    category_id uuid NOT NULL,
    cost_center_id uuid,
    document_type_id uuid NOT NULL,
    payment_method_id uuid NOT NULL,
    payment_term_id uuid,
    description varchar(255) NOT NULL,
    base_document_number varchar(80),
    base_amount numeric(18,2) NOT NULL,
    frequency_code varchar(30) NOT NULL,
    start_date date NOT NULL,
    end_date date,
    max_occurrences integer,
    due_day integer,
    is_open_ended boolean NOT NULL DEFAULT false,
    generation_window_months integer NOT NULL DEFAULT 6,
    next_occurrence_date date,
    last_generated_until date,
    status_id uuid NOT NULL,
    notes text,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid NOT NULL,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT fk_payable_recurrences_company FOREIGN KEY (company_id)
        REFERENCES cadastros.companies(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_recurrences_supplier FOREIGN KEY (supplier_id)
        REFERENCES cadastros.suppliers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_recurrences_category FOREIGN KEY (category_id)
        REFERENCES cadastros.financial_categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_recurrences_cost_center FOREIGN KEY (cost_center_id)
        REFERENCES cadastros.cost_centers(id) ON DELETE SET NULL,
    CONSTRAINT fk_payable_recurrences_document_type FOREIGN KEY (document_type_id)
        REFERENCES cadastros.document_types(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_recurrences_payment_method FOREIGN KEY (payment_method_id)
        REFERENCES cadastros.payment_methods(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_recurrences_payment_term FOREIGN KEY (payment_term_id)
        REFERENCES cadastros.payment_terms(id) ON DELETE SET NULL,
    CONSTRAINT fk_payable_recurrences_status FOREIGN KEY (status_id)
        REFERENCES financeiro.payable_recurrence_statuses(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_recurrences_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_recurrences_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_recurrences_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT ck_payable_recurrences_amount CHECK (base_amount > 0),
    CONSTRAINT ck_payable_recurrences_frequency CHECK (frequency_code IN ('WEEKLY','BIWEEKLY','MONTHLY','ANNUAL')),
    CONSTRAINT ck_payable_recurrences_end_date CHECK (end_date IS NULL OR end_date >= start_date),
    CONSTRAINT ck_payable_recurrences_max_occurrences CHECK (max_occurrences IS NULL OR max_occurrences >= 1),
    CONSTRAINT ck_payable_recurrences_due_day CHECK (due_day IS NULL OR due_day BETWEEN 1 AND 31),
    CONSTRAINT ck_payable_recurrences_due_day_required CHECK (
        frequency_code NOT IN ('MONTHLY','ANNUAL') OR due_day IS NOT NULL
    ),
    CONSTRAINT ck_payable_recurrences_generation_window CHECK (generation_window_months BETWEEN 1 AND 6),
    CONSTRAINT ck_payable_recurrences_termination CHECK (
        is_open_ended OR end_date IS NOT NULL OR max_occurrences IS NOT NULL
    )
);

CREATE TRIGGER trg_payable_recurrences_updated_at
BEFORE UPDATE ON financeiro.payable_recurrences
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_payable_recurrences_company_status
ON financeiro.payable_recurrences (company_id, status_id)
WHERE deleted_at IS NULL;

CREATE INDEX ix_payable_recurrences_supplier
ON financeiro.payable_recurrences (supplier_id)
WHERE deleted_at IS NULL;

CREATE INDEX ix_payable_recurrences_next_occurrence
ON financeiro.payable_recurrences (next_occurrence_date)
WHERE deleted_at IS NULL AND next_occurrence_date IS NOT NULL;

CREATE TABLE financeiro.payable_recurrence_titles (
    recurrence_id uuid NOT NULL,
    payable_title_id uuid NOT NULL,
    occurrence_date date NOT NULL,
    sequence_number integer NOT NULL,
    generated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generated_by uuid,
    regenerated_from_title_id uuid,
    notes text,
    CONSTRAINT pk_payable_recurrence_titles PRIMARY KEY (recurrence_id, payable_title_id),
    CONSTRAINT uq_payable_recurrence_titles_occurrence UNIQUE (recurrence_id, occurrence_date),
    CONSTRAINT uq_payable_recurrence_titles_title UNIQUE (payable_title_id),
    CONSTRAINT fk_payable_recurrence_titles_recurrence FOREIGN KEY (recurrence_id)
        REFERENCES financeiro.payable_recurrences(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_recurrence_titles_title FOREIGN KEY (payable_title_id)
        REFERENCES financeiro.payable_titles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_payable_recurrence_titles_replaced_title FOREIGN KEY (regenerated_from_title_id)
        REFERENCES financeiro.payable_titles(id) ON DELETE SET NULL,
    CONSTRAINT fk_payable_recurrence_titles_generated_by FOREIGN KEY (generated_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT ck_payable_recurrence_titles_sequence CHECK (sequence_number >= 1)
);

CREATE INDEX ix_payable_recurrence_titles_recurrence_sequence
ON financeiro.payable_recurrence_titles (recurrence_id, sequence_number);

ALTER TABLE financeiro.payable_titles
DROP CONSTRAINT ck_payable_titles_origin;

ALTER TABLE financeiro.payable_titles
ADD CONSTRAINT ck_payable_titles_origin
CHECK (origin_code IN ('MANUAL','XML','INTEGRATION','RECURRENCE'));

COMMENT ON TABLE financeiro.payable_recurrences
IS 'Modelos de contas recorrentes que geram títulos a pagar futuros com rastreabilidade.';

COMMENT ON TABLE financeiro.payable_recurrence_titles
IS 'Vínculo auditável entre recorrências e títulos a pagar gerados.';

COMMENT ON COLUMN financeiro.payable_recurrences.generation_window_months
IS 'Limite operacional por geração. No MVP, deve permanecer entre 1 e 6 meses.';

COMMIT;
