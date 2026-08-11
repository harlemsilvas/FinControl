# Feature futura: seed completo de cidades IBGE

**Status:** documentado para implementacao futura, sem aplicacao no banco agora.

## Contexto

O cadastro de estados ja esta completo na migration
`database/migrations/202607181140_cadastros_create_states.sql`, com as 27 UFs
brasileiras e seus codigos IBGE.

O cadastro de cidades existe em
`database/migrations/202607181150_cadastros_create_cities.sql`, mas hoje traz
apenas uma carga minima de 16 cidades usadas para validacao inicial.

## Decisao

Nao vamos subir a base completa de municipios agora.

Quando houver necessidade operacional, devemos gerar um script manual em
`database/scripts/`, por exemplo:

```text
database/scripts/seed_br_cities_ibge.sql
```

Esse arquivo nao deve ser migration obrigatoria, porque a carga completa tem
aproximadamente 5.570 municipios e pode ser aplicada apenas quando o ambiente
precisar desse cadastro completo.

## Fonte recomendada

Usar uma fonte oficial ou derivada do IBGE contendo:

- UF;
- codigo IBGE da UF;
- nome do municipio;
- codigo IBGE do municipio.

## Estrategia do seed futuro

O script deve:

- usar `\set ON_ERROR_STOP on`;
- abrir transacao com `BEGIN`;
- inserir/atualizar cidades em `cadastros.cities`;
- relacionar cada cidade com `cadastros.states` via `states.code` ou
  `states.ibge_code`;
- usar `ON CONFLICT (ibge_code) DO UPDATE` quando o codigo IBGE existir;
- manter `is_active = true`;
- nao criar objetos no schema `public`;
- encerrar com uma verificacao de quantidade.

Exemplo de formato:

```sql
WITH seed(state_code, city_name, city_ibge_code) AS (
    VALUES
        ('SP', 'Sao Paulo', '3550308')
)
INSERT INTO cadastros.cities (state_id, name, ibge_code, is_active)
SELECT states.id, seed.city_name, seed.city_ibge_code, true
  FROM seed
  JOIN cadastros.states states
    ON states.country_code = 'BR'
   AND states.code = seed.state_code
ON CONFLICT (ibge_code) DO UPDATE
   SET name = EXCLUDED.name,
       state_id = EXCLUDED.state_id,
       is_active = true,
       updated_at = CURRENT_TIMESTAMP;
```

## Validacao esperada

Depois de aplicado, validar:

```sql
SELECT count(*) FROM cadastros.states WHERE country_code = 'BR';
SELECT count(*) FROM cadastros.cities WHERE is_active = true;
SELECT states.code, count(*)
  FROM cadastros.cities cities
  JOIN cadastros.states states ON states.id = cities.state_id
 GROUP BY states.code
 ORDER BY states.code;
```

Resultado esperado:

- `states`: 27 UFs;
- `cities`: aproximadamente 5.570 municipios ativos, conforme a fonte usada.

## Observacao

Se a carga completa for adicionada ao repositorio, preferir um script manual
versionado em `database/scripts/` e aplicar na VPS somente por decisao explicita.
