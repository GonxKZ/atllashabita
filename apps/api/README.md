# AtlasHabita · Backend

Servicio Python que orquesta la ingesta territorial, la construcción del grafo RDF, el scoring explicable y la API REST que consume el frontend. Estado v0.2.0 (M8 cerrado): 372/372 tests verde, 14 endpoints publicados, adaptador SPARQL Fuseki opcional, ontología GeoSPARQL + PROV-O reforzada.

## Estructura

```text
apps/api/
├── src/atlashabita/
│   ├── domain/             # Entidades puras y reglas de dominio
│   ├── application/        # Casos de uso
│   ├── infrastructure/     # Adaptadores (RDFLib, ingesta, filesystem, HTTP, cache, Fuseki)
│   ├── interfaces/
│   │   └── api/            # Routers FastAPI (10 routers v0.2.0)
│   ├── config/             # Configuración tipada
│   └── observability/      # Logging estructurado, errores y request-id
└── tests/                  # 372 tests (unitarios + integración + API + RDF + SHACL)
```

## Routers v0.2.0

`health`, `profiles`, `territories`, `rankings`, `map_layers`, `sources`, `quality`, `rdf_export`, `sparql`, y errores normalizados ([`api.md`](../../docs/api.md)).

## Desarrollo

```bash
# Crear entorno y dependencias
python -m venv .venv && . .venv/bin/activate
pip install -e apps/api[dev]

# Lint, types, tests
ruff check apps/api/src apps/api/tests
mypy apps/api/src
pytest apps/api/tests

# Arrancar la API que consume la app web
uvicorn atlashabita.interfaces.api:create_app --factory --reload
```

## Pipeline de datos y RDF

La orquestación (ingesta, validación, construcción del grafo y SHACL) se expone como servicios internos invocados desde el panel técnico de la aplicación web y desde `scripts/data_pipeline.py`. La CLI `data_pipeline.py ingest` permite ejecutar la cadena completa offline (lectura del seed) u online (`ATLASHABITA_INGESTION_ONLINE=1` para invocar los conectores reales). Los endpoints administrativos quedan detrás de un flag de entorno (`ATLASHABITA_ADMIN=1`) para evitar exposición accidental.

## SPARQL y exportación RDF

- `POST /sparql` ejecuta consultas del catálogo whitelist con bindings tipados; ver `services/sparql.py`.
- `GET /sparql/catalog` publica las firmas (`query_id`, `required`, `optional`).
- `GET /rdf/export` serializa el grafo (Turtle/TriG/JSON-LD/NT) con streaming y tope de 16 MB.
- Backend dual: `rdflib` en memoria (default) o adaptador `Fuseki` (`ATLASHABITA_SPARQL_BACKEND=fuseki` + `make fuseki-up`).

## Cobertura

- 372/372 tests verde.
- Cobertura >= 90 % en `infrastructure.rdf`, `infrastructure.data`, `infrastructure.security`, `application` (scoring) y `interfaces.api`.
- `mypy --strict` verde sobre todos los paquetes.
- `ruff` y `ruff format` sin warnings.
