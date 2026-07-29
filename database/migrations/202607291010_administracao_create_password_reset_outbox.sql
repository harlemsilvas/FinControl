-- FinControl
-- DOM-004: Password reset tokens and email outbox

BEGIN;

CREATE TABLE administracao.password_reset_tokens (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    token_hash varchar(64) NOT NULL,
    expires_at timestamptz NOT NULL,
    used_at timestamptz,
    requested_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    requested_ip inet,
    user_agent varchar(500),
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_password_reset_tokens_hash UNIQUE (token_hash),
    CONSTRAINT fk_password_reset_tokens_user FOREIGN KEY (user_id)
        REFERENCES administracao.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_password_reset_tokens_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT ck_password_reset_tokens_expiry CHECK (expires_at > requested_at),
    CONSTRAINT ck_password_reset_tokens_used_after_request CHECK (
        used_at IS NULL OR used_at >= requested_at
    )
);

CREATE INDEX ix_password_reset_tokens_user_active
ON administracao.password_reset_tokens (user_id, expires_at)
WHERE used_at IS NULL;

CREATE TABLE administracao.email_outbox (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_email varchar(255) NOT NULL,
    recipient_name varchar(160),
    subject varchar(255) NOT NULL,
    body_text text NOT NULL,
    body_html text,
    status_code varchar(30) NOT NULL DEFAULT 'PENDING',
    related_entity_name varchar(80),
    related_entity_id uuid,
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    sent_at timestamptz,
    failed_at timestamptz,
    failure_reason text,
    created_by uuid,
    CONSTRAINT fk_email_outbox_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT ck_email_outbox_status CHECK (status_code IN ('PENDING', 'SENT', 'FAILED')),
    CONSTRAINT ck_email_outbox_terminal_status CHECK (
        (status_code = 'PENDING' AND sent_at IS NULL AND failed_at IS NULL)
        OR (status_code = 'SENT' AND sent_at IS NOT NULL)
        OR (status_code = 'FAILED' AND failed_at IS NOT NULL)
    )
);

CREATE INDEX ix_email_outbox_status_created
ON administracao.email_outbox (status_code, created_at);

COMMIT;
