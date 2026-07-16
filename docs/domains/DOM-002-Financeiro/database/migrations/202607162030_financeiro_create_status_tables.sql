-- FinControl
-- Migration: Create configurable financial status tables
-- Version: 0.1.0

BEGIN;

CREATE TABLE financeiro.payable_title_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(80) NOT NULL,
    description varchar(255),
    display_order integer NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payable_title_statuses_code UNIQUE (code),
    CONSTRAINT ck_payable_title_statuses_display_order CHECK (display_order >= 0)
);

CREATE TABLE financeiro.payable_installment_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(80) NOT NULL,
    description varchar(255),
    display_order integer NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payable_installment_statuses_code UNIQUE (code),
    CONSTRAINT ck_payable_installment_statuses_display_order CHECK (display_order >= 0)
);

CREATE TABLE financeiro.payment_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(80) NOT NULL,
    description varchar(255),
    display_order integer NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payment_statuses_code UNIQUE (code),
    CONSTRAINT ck_payment_statuses_display_order CHECK (display_order >= 0)
);

CREATE TABLE financeiro.payment_batch_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(80) NOT NULL,
    description varchar(255),
    display_order integer NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_payment_batch_statuses_code UNIQUE (code),
    CONSTRAINT ck_payment_batch_statuses_display_order CHECK (display_order >= 0)
);

CREATE TABLE financeiro.approval_statuses (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(40) NOT NULL,
    name varchar(80) NOT NULL,
    description varchar(255),
    display_order integer NOT NULL DEFAULT 0,
    is_terminal boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_approval_statuses_code UNIQUE (code),
    CONSTRAINT ck_approval_statuses_display_order CHECK (display_order >= 0)
);

CREATE TRIGGER trg_payable_title_statuses_updated_at
BEFORE UPDATE ON financeiro.payable_title_statuses
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE TRIGGER trg_payable_installment_statuses_updated_at
BEFORE UPDATE ON financeiro.payable_installment_statuses
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE TRIGGER trg_payment_statuses_updated_at
BEFORE UPDATE ON financeiro.payment_statuses
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE TRIGGER trg_payment_batch_statuses_updated_at
BEFORE UPDATE ON financeiro.payment_batch_statuses
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE TRIGGER trg_approval_statuses_updated_at
BEFORE UPDATE ON financeiro.approval_statuses
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

COMMIT;
