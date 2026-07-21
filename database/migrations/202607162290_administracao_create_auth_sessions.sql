-- FinControl
-- DOM-004: Rotating refresh-token sessions

BEGIN;

CREATE TABLE administracao.auth_sessions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL,
    refresh_token_hash varchar(64) NOT NULL,
    expires_at timestamptz NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_used_at timestamptz,
    revoked_at timestamptz,
    revoked_reason varchar(80),
    created_ip inet,
    user_agent varchar(500),
    CONSTRAINT uq_auth_sessions_refresh_hash UNIQUE (refresh_token_hash),
    CONSTRAINT fk_auth_sessions_user FOREIGN KEY (user_id)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT ck_auth_sessions_expiry CHECK (expires_at > created_at),
    CONSTRAINT ck_auth_sessions_revocation CHECK (
        revoked_at IS NULL OR revoked_reason IS NOT NULL
    )
);

CREATE INDEX ix_auth_sessions_user_active
ON administracao.auth_sessions (user_id, expires_at)
WHERE revoked_at IS NULL;

REVOKE DELETE ON administracao.auth_sessions FROM fincontrol_app;

COMMIT;
