-- FinControl
-- Migration: Create schemas by business domain
-- Version: 0.1.0

BEGIN;

CREATE SCHEMA IF NOT EXISTS cadastros;
CREATE SCHEMA IF NOT EXISTS financeiro;
CREATE SCHEMA IF NOT EXISTS tesouraria;
CREATE SCHEMA IF NOT EXISTS administracao;
CREATE SCHEMA IF NOT EXISTS inteligencia;
CREATE SCHEMA IF NOT EXISTS integracoes;

COMMENT ON SCHEMA cadastros IS 'DOM-001 - Master data and auxiliary registrations.';
COMMENT ON SCHEMA financeiro IS 'DOM-002 - Accounts payable and financial obligations.';
COMMENT ON SCHEMA tesouraria IS 'DOM-003 - Banking, cash and treasury operations.';
COMMENT ON SCHEMA administracao IS 'DOM-004 - Users, permissions, configuration and audit.';
COMMENT ON SCHEMA inteligencia IS 'DOM-005 - Dashboards, reports and indicators.';
COMMENT ON SCHEMA integracoes IS 'DOM-006 - External systems and communication services.';

COMMIT;
