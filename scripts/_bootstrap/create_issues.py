"""Creación masiva de issues de planificación en GitHub.

Se ejecuta una única vez al iniciar el proyecto. Idempotente: si un issue con
el mismo título ya existe, no lo duplica.
"""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")

TOKEN = os.environ["GH_TOKEN"]
REPO = "GonxKZ/atllashabita"
API = f"https://api.github.com/repos/{REPO}"


def call(method: str, path: str, body: dict | None = None) -> dict | list:
    url = f"{API}{path}"
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("Authorization", f"token {TOKEN}")
    req.add_header("Accept", "application/vnd.github+json")
    if data:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req) as r:
            return json.loads(r.read() or b"null")
    except urllib.error.HTTPError as exc:
        raise RuntimeError(f"{method} {path} -> {exc.code} {exc.read().decode('utf-8', 'replace')}") from exc


def existing_titles() -> set[str]:
    titles: set[str] = set()
    page = 1
    while True:
        items = call("GET", f"/issues?state=all&per_page=100&page={page}")
        assert isinstance(items, list)
        if not items:
            break
        for it in items:
            if "pull_request" not in it:
                titles.add(it["title"])
        page += 1
    return titles


ISSUES: list[dict] = [
    {
        "title": "[02] Configurar develop, labels, milestones y plantillas de GitHub",
        "body": (
            "## Objetivo\nEstandarizar el flujo GitHub del proyecto.\n\n"
            "## Tareas\n- Rama develop desde main.\n- Labels (tipo/prioridad/estado/tamaño/fase).\n"
            "- 8 milestones M0..M7.\n- Plantillas de issue y PR en `.github/`.\n- CODEOWNERS y CONTRIBUTING.\n\n"
            "## Aceptación\n- develop existe en origin.\n- Labels, milestones y plantillas accesibles desde la UI de GitHub."
        ),
        "labels": ["fase:1-arquitectura", "tipo:infra", "tipo:ci", "prioridad:alta", "tamaño:S"],
        "milestone": 1,
    },
    {
        "title": "[03] Definir arquitectura screaming y ADRs iniciales",
        "body": (
            "## Objetivo\nFormalizar arquitectura por dominios: territories, datasets, ingestion, indicators, "
            "knowledge_graph, validation, scoring, api, reports.\n\n"
            "## Tareas\n- ADRs en `docs/adr/` (arquitectura, stack, dominios, RDF vs tabular, scoring explicable).\n"
            "- Diagrama de alto nivel.\n\n"
            "## Aceptación\n- `docs/architecture.md` y ADRs publicados."
        ),
        "labels": ["fase:1-arquitectura", "tipo:docs", "prioridad:alta", "tamaño:M"],
        "milestone": 2,
    },
    {
        "title": "[04] Scaffolding del monorepo (apps/api, apps/web, ontology, data)",
        "body": (
            "## Objetivo\nCrear estructura screaming del monorepo.\n\n"
            "## Tareas\n- `apps/api/src/atlashabita/{domain,application,infrastructure,interfaces,config,observability}`.\n"
            "- `apps/web/src/{features,components,routes,services,hooks,state,styles,tests}`.\n"
            "- `ontology/`, `data/{raw,interim,processed,rdf}`, `scripts/`, `docs/`.\n- `.env.example`.\n\n"
            "## Aceptación\n- Árbol de carpetas refleja el dominio del proyecto."
        ),
        "labels": ["fase:1-arquitectura", "tipo:infra", "prioridad:alta", "tamaño:M"],
        "milestone": 2,
    },
    {
        "title": "[05] Configurar Python 3.12, uv, ruff, mypy y pytest",
        "body": (
            "## Tareas\n- `apps/api/pyproject.toml` con dependencias productivas (fastapi, pydantic, rdflib, "
            "pyshacl, httpx, tenacity, structlog) y dev (pytest, ruff, mypy, pytest-asyncio).\n"
            "- Configurar ruff, mypy, pytest.\n- Makefile backend (lint, typecheck, test, run).\n\n"
            "## Aceptación\n- `make api-test` y `make api-lint` verdes."
        ),
        "labels": ["fase:1-arquitectura", "tipo:infra", "tipo:backend", "prioridad:alta", "tamaño:M"],
        "milestone": 2,
    },
    {
        "title": "[06] Configurar frontend Vite + React 19 + TS + Tailwind v4",
        "body": (
            "## Tareas\n- `apps/web/package.json` con React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Query, "
            "Zustand, React Router v7, MapLibre GL, Recharts, Lucide.\n- ESLint, Prettier, Vitest, Playwright.\n"
            "- Scripts dev/build/test/e2e.\n\n"
            "## Aceptación\n- `pnpm -C apps/web dev` levanta la app.\n- `pnpm -C apps/web build` produce dist."
        ),
        "labels": ["fase:1-arquitectura", "tipo:infra", "tipo:frontend", "prioridad:alta", "tamaño:M"],
        "milestone": 2,
    },
    {
        "title": "[07] Makefile y Docker Compose para bootstrap reproducible",
        "body": (
            "## Tareas\n- Makefile con `bootstrap`, `dev`, `test`, `lint`, `build`, `rdf`, `e2e`.\n"
            "- `docker-compose.yml` con servicios api, web y volumen para data.\n- `.dockerignore` y Dockerfiles.\n\n"
            "## Aceptación\n- `make bootstrap` prepara un entorno funcional desde cero."
        ),
        "labels": ["fase:1-arquitectura", "tipo:infra", "tipo:ci", "prioridad:media", "tamaño:M"],
        "milestone": 2,
    },
    {
        "title": "[08] Descarga reproducible de datasets base (demo offline)",
        "body": (
            "## Objetivo\nProveer un pack de datasets demo con territorios españoles, renta, alquiler, "
            "conectividad, servicios y clima, suficiente para el MVP sin depender de redes externas.\n\n"
            "## Tareas\n- `apps/api/src/atlashabita/infrastructure/ingestion/` con descargadores cacheables.\n"
            "- Manifiesto con checksum y timestamp.\n- Dataset demo embebido en `data/seed/`.\n\n"
            "## Aceptación\n- `python -m atlashabita.cli data ingest --demo` deja `data/raw/` y `data/processed/` poblados."
        ),
        "labels": ["fase:2-datos-rdf", "tipo:data", "prioridad:alta", "tamaño:M"],
        "milestone": 3,
    },
    {
        "title": "[09] Perfilado y validación tabular con quality gates",
        "body": (
            "## Tareas\n- Validadores `Required columns`, `Types`, `Ranges`, `Unicidad`, `Nulos`, `Cobertura`.\n"
            "- Reporte JSON con estado OK/WARN/ERROR.\n- Bloqueo de publicación ante fallos críticos.\n\n"
            "## Aceptación\n- `python -m atlashabita.cli data validate` produce `data/reports/*.json`."
        ),
        "labels": ["fase:2-datos-rdf", "tipo:data", "prioridad:alta", "tamaño:M"],
        "milestone": 3,
    },
    {
        "title": "[10] Limpieza y normalización territorial (códigos INE, jerarquía)",
        "body": (
            "## Tareas\n- Normalizar códigos INE de CCAA, provincia y municipio.\n- Jerarquía administrativa.\n"
            "- Normalización de geometrías (CRS WGS84, simplificación para mapa).\n\n"
            "## Aceptación\n- Cada municipio tiene code, name, province, autonomous_community y geometría simplificada."
        ),
        "labels": ["fase:2-datos-rdf", "tipo:data", "prioridad:alta", "tamaño:M"],
        "milestone": 3,
    },
    {
        "title": "[11] Diseño de ontología AtlasHabita (ah:) y política de URIs",
        "body": (
            "## Tareas\n- `ontology/atlashabita.ttl` con clases (Territory, Municipality, Province, "
            "AutonomousCommunity, Indicator, IndicatorObservation, DataSource, DecisionProfile, Score, "
            "ScoreContribution, IngestionRun) y propiedades.\n- Namespaces, comentarios y labels.\n- URIs estables."
        ),
        "labels": ["fase:2-datos-rdf", "tipo:rdf", "prioridad:alta", "tamaño:M"],
        "milestone": 3,
    },
    {
        "title": "[12] Mapeo semántico a RDF con RDFLib",
        "body": (
            "## Tareas\n- Servicio `GraphBuilder` que convierte datasets normalizados a tripletas.\n"
            "- Soporte Turtle, JSON-LD, N-Triples, TriG.\n- Named graphs por dominio (territorios, indicadores, fuentes, scores).\n\n"
            "## Aceptación\n- `python -m atlashabita.cli rdf build` genera `data/rdf/*.ttl` y manifiesto."
        ),
        "labels": ["fase:2-datos-rdf", "tipo:rdf", "prioridad:alta", "tamaño:L"],
        "milestone": 3,
    },
    {
        "title": "[13] Serialización RDF, manifiesto y estadísticas",
        "body": (
            "## Tareas\n- Serializar Turtle y JSON-LD.\n- Manifiesto con nº triples, nº entidades, versión.\n"
            "- Métricas por named graph."
        ),
        "labels": ["fase:2-datos-rdf", "tipo:rdf", "prioridad:media", "tamaño:S"],
        "milestone": 3,
    },
    {
        "title": "[14] Validación RDF con SHACL (pySHACL)",
        "body": (
            "## Tareas\n- Shapes en `ontology/shapes.ttl` (MunicipalityShape, IndicatorObservationShape, "
            "ScoreShape, DataSourceShape).\n- Reporte HTML/JSON y bloqueo de publicación.\n\n"
            "## Aceptación\n- `python -m atlashabita.cli rdf validate` genera reporte y código de salida."
        ),
        "labels": ["fase:2-datos-rdf", "tipo:rdf", "prioridad:alta", "tamaño:M"],
        "milestone": 3,
    },
    {
        "title": "[15] Consultas SPARQL predefinidas de dominio",
        "body": (
            "## Tareas\n- Catálogo `apps/api/src/atlashabita/infrastructure/rdf/queries/*.rq` con top-score por perfil, "
            "municipios por provincia, fuentes por territorio, indicadores por municipio.\n- Servicio `SparqlService`."
        ),
        "labels": ["fase:2-datos-rdf", "tipo:rdf", "prioridad:alta", "tamaño:M"],
        "milestone": 3,
    },
    {
        "title": "[16] Servicio de territorios y jerarquías administrativas",
        "body": (
            "## Tareas\n- Dominio `Territory`, repositorio, caso de uso SearchTerritories y GetTerritoryDetail.\n"
            "- Indexación por texto (normalización de tildes)."
        ),
        "labels": ["fase:3-backend", "tipo:backend", "prioridad:alta", "tamaño:M"],
        "milestone": 4,
    },
    {
        "title": "[17] Servicio de scoring explicable ponderado",
        "body": (
            "## Tareas\n- Scoring por suma ponderada normalizada con reescalado si faltan datos.\n"
            "- Contribuciones y motivos (highlights/warnings).\n- Versión de scoring y versión de datos."
        ),
        "labels": ["fase:3-backend", "tipo:backend", "prioridad:alta", "tamaño:L"],
        "milestone": 4,
    },
    {
        "title": "[18] API REST con FastAPI y OpenAPI documentada",
        "body": (
            "## Tareas\n- `/health`, `/profiles`, `/territories/search`, `/territories/{id}`, "
            "`/territories/{id}/indicators`, `/rankings`, `/rankings/custom`, `/map/layers`, `/map/layers/{id}`, "
            "`/sources`, `/sources/{id}`, `/rdf/export`, `/sparql`, `/quality/reports`.\n"
            "- Errores normalizados, paginación, límites.\n- OpenAPI 3.1 y ejemplos.\n\n"
            "## Aceptación\n- Documentación OpenAPI accesible en `/docs` con ejemplos."
        ),
        "labels": ["fase:3-backend", "tipo:backend", "prioridad:alta", "tamaño:L"],
        "milestone": 4,
    },
    {
        "title": "[19] Cache LRU para rankings y consultas SPARQL",
        "body": "Implementar cache en memoria con TTL, invalidación por versión de datos/scoring y métricas de hit-rate.",
        "labels": ["fase:3-backend", "tipo:performance", "prioridad:media", "tamaño:S"],
        "milestone": 4,
    },
    {
        "title": "[20] Observabilidad: logs estructurados, request-id y errores",
        "body": "Middleware de request-id, logs structlog JSON, manejador de excepciones con códigos normalizados (INVALID_PROFILE, TERRITORY_NOT_FOUND, etc.).",
        "labels": ["fase:3-backend", "tipo:backend", "prioridad:media", "tamaño:S"],
        "milestone": 4,
    },
    {
        "title": "[21] Sistema de diseño (tokens, tipografía, colores, radios)",
        "body": (
            "## Objetivo\nReproducir fielmente el estilo de la captura AtlasHabita.\n\n"
            "## Tareas\n- Tokens en Tailwind v4: paleta verde-turquesa, neutros, gradientes, radios, sombras, "
            "tipografía Inter/Geist.\n- Primitivas Card, Button, Tag, Badge, IconButton, Avatar, Stat."
        ),
        "labels": ["fase:4-frontend", "tipo:frontend", "tipo:ux", "prioridad:alta", "tamaño:M"],
        "milestone": 5,
    },
    {
        "title": "[22] Dashboard principal con sidebar, topbar y layout",
        "body": (
            "## Tareas\n- Sidebar con logo AtlasHabita, navegación, sección Capas activas y user card.\n"
            "- Topbar con buscador, botón Feedback y Nuevo análisis.\n- Layout de 3 columnas."
        ),
        "labels": ["fase:4-frontend", "tipo:frontend", "tipo:ux", "prioridad:alta", "tamaño:L"],
        "milestone": 5,
    },
    {
        "title": "[23] Panel hero con mapa interactivo de España (MapLibre GL)",
        "body": (
            "## Tareas\n- Hero con título y chips de filtros (Calidad de vida, Vivienda asequible, Empleo, Conectividad, Más filtros).\n"
            "- Mapa interactivo con burbujas coloreadas por score.\n- Tooltip con nombre y score.\n- Leyenda."
        ),
        "labels": ["fase:4-frontend", "tipo:frontend", "tipo:ux", "prioridad:alta", "tamaño:L"],
        "milestone": 5,
    },
    {
        "title": "[24] Panel derecho: Recomendación destacada, Tendencias y Actividad",
        "body": (
            "## Tareas\n- Card Recomendación destacada con imagen, rating y chips.\n"
            "- Gráfico Tendencias (Recharts).\n- Lista Actividad reciente."
        ),
        "labels": ["fase:4-frontend", "tipo:frontend", "prioridad:alta", "tamaño:M"],
        "milestone": 5,
    },
    {
        "title": "[25] Índice de oportunidad y cards inferiores Explorar/Recomendar/Comparar/Analizar",
        "body": "Implementar progreso, texto motivacional y cuatro accesos rápidos con iconografía coherente.",
        "labels": ["fase:4-frontend", "tipo:frontend", "prioridad:media", "tamaño:S"],
        "milestone": 5,
    },
    {
        "title": "[26] Estados de carga, error, vacío y datos incompletos",
        "body": "Skeletons, mensajes de error, empty states y advertencias de calidad accesibles.",
        "labels": ["fase:4-frontend", "tipo:frontend", "tipo:ux", "prioridad:media", "tamaño:S"],
        "milestone": 5,
    },
    {
        "title": "[27] Integración frontend ↔ backend con TanStack Query",
        "body": "Servicios tipados, manejo de errores, refetch, cache de cliente, Zustand para filtros activos.",
        "labels": ["fase:5-integracion", "tipo:frontend", "tipo:backend", "prioridad:alta", "tamaño:M"],
        "milestone": 6,
    },
    {
        "title": "[28] Tests unitarios backend (scoring, URIs, SHACL, SPARQL)",
        "body": "Pruebas pytest para normalización, scoring ponderado, builder de URIs, validación SHACL y consultas SPARQL.",
        "labels": ["fase:6-qa", "tipo:test", "tipo:backend", "prioridad:alta", "tamaño:M"],
        "milestone": 7,
    },
    {
        "title": "[29] Tests de datos y RDF (quality gates, triples críticos)",
        "body": "Cobertura mínima por indicador, ausencia de nulos en claves, consistencia jerárquica, recuento de triples.",
        "labels": ["fase:6-qa", "tipo:test", "tipo:data", "prioridad:alta", "tamaño:M"],
        "milestone": 7,
    },
    {
        "title": "[30] Tests frontend con Vitest + Testing Library",
        "body": "Pruebas de componentes críticos (Sidebar, HeroMap, Ranking, FichaTerritorial).",
        "labels": ["fase:6-qa", "tipo:test", "tipo:frontend", "prioridad:media", "tamaño:M"],
        "milestone": 7,
    },
    {
        "title": "[31] E2E con Playwright del flujo principal",
        "body": "Flujo Inicio → Perfil → Ranking → Ficha → Comparador → Inspector fuentes con capturas.",
        "labels": ["fase:6-qa", "tipo:test", "prioridad:alta", "tamaño:M"],
        "milestone": 7,
    },
    {
        "title": "[32] CI en GitHub Actions (lint, typecheck, test, build)",
        "body": "Workflows para backend (ruff, mypy, pytest) y frontend (eslint, tsc, vitest, build). Cache pip/pnpm.",
        "labels": ["fase:6-qa", "tipo:ci", "tipo:infra", "prioridad:alta", "tamaño:M"],
        "milestone": 7,
    },
    {
        "title": "[33] Hardening de seguridad y performance",
        "body": "CORS, límites, timeouts SPARQL, bloqueo UPDATE, validación de entrada, path traversal, rate limiting básico, cabeceras seguras.",
        "labels": ["fase:6-qa", "tipo:security", "tipo:performance", "prioridad:alta", "tamaño:M"],
        "milestone": 7,
    },
    {
        "title": "[34] Documentación completa (README, architecture, api, data, rdf, testing, workflow)",
        "body": "Guía de instalación, ejecución, pipeline de datos, modelo RDF, endpoints, testing y flujo GitHub.",
        "labels": ["fase:7-release", "tipo:docs", "prioridad:alta", "tamaño:M"],
        "milestone": 8,
    },
    {
        "title": "[35] Release develop→main con verificación E2E",
        "body": "PR final con release notes en español. Checklist: lint, typecheck, test, build, E2E, docs, git log sin menciones a asistentes.",
        "labels": ["fase:7-release", "tipo:docs", "prioridad:alta", "tamaño:S"],
        "milestone": 8,
    },
]


def main() -> None:
    already = existing_titles()
    created: list[tuple[int, str]] = []
    for item in ISSUES:
        if item["title"] in already:
            continue
        res = call("POST", "/issues", item)
        created.append((res["number"], res["title"]))  # type: ignore[index]
    for num, title in created:
        print(num, title)


if __name__ == "__main__":
    main()
