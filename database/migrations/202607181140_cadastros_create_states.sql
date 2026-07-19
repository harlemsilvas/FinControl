BEGIN;

CREATE TABLE cadastros.states (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    country_code char(2) NOT NULL DEFAULT 'BR',
    code varchar(10) NOT NULL,
    name varchar(120) NOT NULL,
    ibge_code varchar(10),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_states_country_code UNIQUE (country_code, code),
    CONSTRAINT uq_states_ibge_code UNIQUE (ibge_code)
);

CREATE TRIGGER trg_states_updated_at
BEFORE UPDATE ON cadastros.states
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_states_active
ON cadastros.states (is_active, country_code, name);

INSERT INTO cadastros.states (country_code, code, name, ibge_code)
VALUES
    ('BR', 'AC', 'Acre', '12'),
    ('BR', 'AL', 'Alagoas', '27'),
    ('BR', 'AP', 'Amapá', '16'),
    ('BR', 'AM', 'Amazonas', '13'),
    ('BR', 'BA', 'Bahia', '29'),
    ('BR', 'CE', 'Ceará', '23'),
    ('BR', 'DF', 'Distrito Federal', '53'),
    ('BR', 'ES', 'Espírito Santo', '32'),
    ('BR', 'GO', 'Goiás', '52'),
    ('BR', 'MA', 'Maranhão', '21'),
    ('BR', 'MT', 'Mato Grosso', '51'),
    ('BR', 'MS', 'Mato Grosso do Sul', '50'),
    ('BR', 'MG', 'Minas Gerais', '31'),
    ('BR', 'PA', 'Pará', '15'),
    ('BR', 'PB', 'Paraíba', '25'),
    ('BR', 'PR', 'Paraná', '41'),
    ('BR', 'PE', 'Pernambuco', '26'),
    ('BR', 'PI', 'Piauí', '22'),
    ('BR', 'RJ', 'Rio de Janeiro', '33'),
    ('BR', 'RN', 'Rio Grande do Norte', '24'),
    ('BR', 'RS', 'Rio Grande do Sul', '43'),
    ('BR', 'RO', 'Rondônia', '11'),
    ('BR', 'RR', 'Roraima', '14'),
    ('BR', 'SC', 'Santa Catarina', '42'),
    ('BR', 'SP', 'São Paulo', '35'),
    ('BR', 'SE', 'Sergipe', '28'),
    ('BR', 'TO', 'Tocantins', '17')
ON CONFLICT (country_code, code) DO NOTHING;

COMMIT;
