BEGIN;

ALTER TABLE cadastros.cost_centers
ADD COLUMN description varchar(255);

COMMENT ON COLUMN cadastros.cost_centers.description
IS 'Descrição funcional do centro de custo.';

COMMIT;
