BEGIN;

CREATE TABLE cadastros.supplier_markers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_id uuid NOT NULL,
    marker_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by uuid,
    CONSTRAINT uq_supplier_markers UNIQUE (supplier_id, marker_id),
    CONSTRAINT fk_supplier_markers_supplier FOREIGN KEY (supplier_id)
        REFERENCES cadastros.suppliers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_supplier_markers_marker FOREIGN KEY (marker_id)
        REFERENCES cadastros.markers(id) ON DELETE RESTRICT,
    CONSTRAINT fk_supplier_markers_created_by FOREIGN KEY (created_by)
        REFERENCES administracao.users(id) ON DELETE SET NULL
);

CREATE INDEX ix_supplier_markers_supplier
ON cadastros.supplier_markers (supplier_id);

CREATE INDEX ix_supplier_markers_marker
ON cadastros.supplier_markers (marker_id);

COMMIT;
