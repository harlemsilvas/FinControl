-- FinControl
-- Migration: Create shared updated_at trigger function
-- Version: 0.1.0

BEGIN;

CREATE OR REPLACE FUNCTION administracao.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION administracao.set_updated_at()
IS 'Automatically updates the updated_at timestamp before row updates.';

COMMIT;
