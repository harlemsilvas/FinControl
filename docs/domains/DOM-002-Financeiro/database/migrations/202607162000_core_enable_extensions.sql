-- FinControl
-- Migration: Enable required PostgreSQL extensions
-- Version: 0.1.0

BEGIN;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

COMMIT;
