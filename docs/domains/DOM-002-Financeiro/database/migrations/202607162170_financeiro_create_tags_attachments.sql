-- FinControl
-- DOM-002: Tags and attachments

BEGIN;

CREATE TABLE financeiro.tags (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name varchar(80) NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by uuid,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT uq_tags_name UNIQUE (name),
    CONSTRAINT fk_tags_created_by FOREIGN KEY (created_by) REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tags_updated_by FOREIGN KEY (updated_by) REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tags_deleted_by FOREIGN KEY (deleted_by) REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TABLE financeiro.payable_title_tags (
    payable_title_id uuid NOT NULL,
    tag_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    PRIMARY KEY (payable_title_id, tag_id),
    CONSTRAINT fk_title_tags_title FOREIGN KEY (payable_title_id)
        REFERENCES financeiro.payable_titles(id) ON DELETE CASCADE,
    CONSTRAINT fk_title_tags_tag FOREIGN KEY (tag_id)
        REFERENCES financeiro.tags(id) ON DELETE RESTRICT,
    CONSTRAINT fk_title_tags_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE TABLE financeiro.attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    payable_title_id uuid,
    payment_id uuid,
    attachment_type_id uuid NOT NULL,
    original_name varchar(255) NOT NULL,
    stored_name varchar(255) NOT NULL,
    relative_path varchar(500) NOT NULL,
    mime_type varchar(120) NOT NULL,
    size_bytes bigint NOT NULL,
    file_hash varchar(128) NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid NOT NULL,
    deleted_at timestamptz,
    deleted_by uuid,
    CONSTRAINT fk_attachments_title FOREIGN KEY (payable_title_id)
        REFERENCES financeiro.payable_titles(id) ON DELETE RESTRICT,
    CONSTRAINT fk_attachments_type FOREIGN KEY (attachment_type_id)
        REFERENCES cadastros.attachment_types(id) ON DELETE RESTRICT,
    CONSTRAINT fk_attachments_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE RESTRICT,
    CONSTRAINT fk_attachments_deleted_by FOREIGN KEY (deleted_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL,
    CONSTRAINT ck_attachments_owner CHECK (
        payable_title_id IS NOT NULL OR payment_id IS NOT NULL
    ),
    CONSTRAINT ck_attachments_size CHECK (size_bytes > 0)
);

CREATE TRIGGER trg_tags_updated_at BEFORE UPDATE ON financeiro.tags
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_title_tags_tag ON financeiro.payable_title_tags (tag_id);
CREATE INDEX ix_attachments_title ON financeiro.attachments (payable_title_id);
CREATE INDEX ix_attachments_hash ON financeiro.attachments (file_hash);

COMMIT;
