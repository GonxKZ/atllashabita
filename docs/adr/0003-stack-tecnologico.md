# ADR 0003 · Stack tecnológico

- **Estado:** Aceptado
- **Fecha:** 2026-04-24

## Contexto

El proyecto requiere un backend con dominio limpio, pipeline de datos reproducible, soporte RDF/SPARQL/SHACL y una interfaz moderna pixel-a-pixel con la captura de referencia. Se busca un stack estable, ampliamente documentado y sin dependencias operativas pesadas.

## Decisión

### Backend

| Aspecto | Elección | Motivo |
|---|---|---|
| Lenguaje | Python 3.12 | Soporte RDF/SHACL maduro, tipado moderno. |
| Framework web | FastAPI | OpenAPI automático, Pydantic v2, async. |
| RDF | RDFLib 7 | Estándar de facto; Turtle, JSON-LD, N-Triples, SPARQL 1.1. |
| SHACL | pySHACL | Validación declarativa del grafo. |
| Datos tabulares | Pandas + Pydantic | Limpieza y normalización con tipado. |
| Logs | structlog | JSON estructurado y contexto request-id. |
| HTTP cliente | httpx + tenacity | Reintentos idempotentes. |
| Gestor de paquetes | uv (fallback pip) | Resolución rápida. |
| Tests | pytest | Fixtures, parametrización, markers. |
| Lint/format | ruff | Formato + lint unificados. |
| Typing | mypy | Detección temprana de errores. |

### Frontend

| Aspecto | Elección | Motivo |
|---|---|---|
| Bundler | Vite | Hot reload ágil, ecosistema moderno. |
| Lenguaje | TypeScript strict | Contratos tipados frente a la API. |
| UI | React 19 + Tailwind CSS v4 | Alineado con el estilo visual objetivo. |
| Mapas | MapLibre GL JS | Código abierto, sin claves de terceros. |
| Gráficos | Recharts | Simple y accesible. |
| Estado servidor | TanStack Query 5 | Cache y refetch declarativos. |
| Estado UI | Zustand | Mínimo y testeable. |
| Enrutado | React Router v7 | Estable y mantenido. |
| Tests | Vitest + Testing Library | Rápidos e integrados con Vite. |
| E2E | Playwright | Cross-browser fiable. |

### Infraestructura

- Makefile con tareas reproducibles (`bootstrap`, `dev`, `test`, `rdf`, `e2e`).
- Docker Compose opcional para entorno aislado.
- GitHub Actions para lint/test/build por PR.

## Consecuencias

- Entorno reproducible en minutos.
- Evitamos dependencias comerciales o cuentas cloud.
- El pipeline puede ejecutarse offline con el dataset demo.
