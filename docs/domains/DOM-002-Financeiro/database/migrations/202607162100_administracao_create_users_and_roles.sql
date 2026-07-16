-- FinControl
-- DOM-004: Minimal identity, roles and permissions required by financial FKs

BEGIN;

CREATE TABLE administracao.users (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    full_name varchar(160) NOT NULL,
    email varchar(255) NOT NULL,
    password_hash varchar(255),
    is_master boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT fk_users_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_users_updated_by FOREIGN KEY (updated_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_users_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TABLE administracao.roles (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(60) NOT NULL,
    name varchar(120) NOT NULL,
    description varchar(255),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_roles_code UNIQUE (code)
);

CREATE TABLE administracao.permissions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code varchar(100) NOT NULL,
    name varchar(160) NOT NULL,
    description varchar(255),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_permissions_code UNIQUE (code)
);

CREATE TABLE administracao.user_roles (
    user_id uuid NOT NULL,
    role_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id)
        REFERENCES administracao.users(id) ON DELETE CASCADE,
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id)
        REFERENCES administracao.roles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_user_roles_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TABLE administracao.role_permissions (
    role_id uuid NOT NULL,
    permission_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    PRIMARY KEY (role_id, permission_id),
    CONSTRAINT fk_role_permissions_role FOREIGN KEY (role_id)
        REFERENCES administracao.roles(id) ON DELETE CASCADE,
    CONSTRAINT fk_role_permissions_permission FOREIGN KEY (permission_id)
        REFERENCES administracao.permissions(id) ON DELETE RESTRICT,
    CONSTRAINT fk_role_permissions_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON administracao.users
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE TRIGGER trg_roles_updated_at
BEFORE UPDATE ON administracao.roles
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE TRIGGER trg_permissions_updated_at
BEFORE UPDATE ON administracao.permissions
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_users_active ON administracao.users (is_active) WHERE deleted_at IS NULL;
CREATE INDEX ix_user_roles_role ON administracao.user_roles (role_id);
CREATE INDEX ix_role_permissions_permission ON administracao.role_permissions (permission_id);

COMMIT;
