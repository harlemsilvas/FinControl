BEGIN;

CREATE TABLE cadastros.cities (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    state_id uuid NOT NULL,
    name varchar(160) NOT NULL,
    ibge_code varchar(10),
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cities_state_name UNIQUE (state_id, name),
    CONSTRAINT uq_cities_ibge_code UNIQUE (ibge_code),
    CONSTRAINT fk_cities_state FOREIGN KEY (state_id)
        REFERENCES cadastros.states(id) ON DELETE RESTRICT
);

CREATE TRIGGER trg_cities_updated_at
BEFORE UPDATE ON cadastros.cities
FOR EACH ROW EXECUTE FUNCTION administracao.set_updated_at();

CREATE INDEX ix_cities_state
ON cadastros.cities (state_id, name);

CREATE INDEX ix_cities_active
ON cadastros.cities (is_active, name);

INSERT INTO cadastros.cities (state_id, name, ibge_code)
SELECT s.id, seed.name, seed.ibge_code
FROM cadastros.states AS s
JOIN (
    VALUES
        ('SP', 'São Paulo', '3550308'),
        ('SP', 'São Bernardo do Campo', '3548708'),
        ('SP', 'Santo André', '3547809'),
        ('SP', 'São Caetano do Sul', '3548807'),
        ('SP', 'Guarulhos', '3518800'),
        ('SP', 'Campinas', '3509502'),
        ('RJ', 'Rio de Janeiro', '3304557'),
        ('MG', 'Belo Horizonte', '3106200'),
        ('PR', 'Curitiba', '4106902'),
        ('RS', 'Porto Alegre', '4314902'),
        ('SC', 'Florianópolis', '4205407'),
        ('BA', 'Salvador', '2927408'),
        ('PE', 'Recife', '2611606'),
        ('CE', 'Fortaleza', '2304400'),
        ('GO', 'Goiânia', '5208707'),
        ('DF', 'Brasília', '5300108')
) AS seed(state_code, name, ibge_code)
    ON seed.state_code = s.code
ON CONFLICT (state_id, name) DO NOTHING;

COMMIT;
