# AtlasHabita · Backend

Servicio Python que orquesta la ingesta territorial, la construcción del grafo RDF, el scoring explicable y la API REST que consume el frontend.

## Estructura

```
apps/api/
├── src/atlashabita/
│   ├── domain/             # Entidades puras y reglas de dominio
│   ├── application/        # Casos de uso
│   ├── infrastructure/     # Adaptadores (RDFLib, filesystem, HTTP, cache)
│   ├── interfaces/
│   │   └── api/            # Routers FastAPI (la app es exclusivamente gráfica)
│   ├── config/             # Configuración tipada
│   └── observability/      # Logging estructurado y errores
└── tests/                  # Pruebas unitarias e integración
```

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

Toda la orquestación (ingesta, validación, construcción del grafo y SHACL) se
expone como servicios internos invocados desde el panel técnico de la
aplicación web. No existe CLI: el producto es exclusivamente una aplicación
gráfica. Los endpoints administrativos quedan detrás de un flag de entorno
para evitar exposición accidental.
