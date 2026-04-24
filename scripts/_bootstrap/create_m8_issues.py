"""Creación de milestone M8 y de las 11 issues de la fase de datos reales.

Se ejecuta una única vez al iniciar M8. Idempotente: si una issue con el
mismo título ya existe, no la duplica; si el milestone ya existe, lo reutiliza.
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


def _request(method: str, path: str, body: dict | None = None) -> dict | list:
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
        return {"error": exc.code, "body": exc.read().decode("utf-8", "replace")[:400]}


def find_milestone(title: str) -> int | None:
    data = _request("GET", "/milestones?state=all&per_page=100")
    assert isinstance(data, list)
    for m in data:
        if m.get("title") == title:
            return int(m["number"])
    return None


def existing_titles() -> set[str]:
    titles: set[str] = set()
    page = 1
    while True:
        items = _request("GET", f"/issues?state=all&per_page=100&page={page}")
        assert isinstance(items, list)
        if not items:
            break
        for it in items:
            if "pull_request" not in it:
                titles.add(it["title"])
        page += 1
    return titles


MILESTONE_TITLE = "M8 Datos reales nacionales v0.2.0"
MILESTONE_BODY = (
    "Ingesta real desde INE (API, Atlas Renta, DIRCE) y MITECO (Reto Demografico); "
    "ontologia extendida con GeoSPARQL y PROV-O; UI con datos reales; Fuseki "
    "opcional; release v0.2.0."
)


ISSUES: list[dict] = [
    {
        "title": "[70] Conector INE · datos abiertos (poblacion, hogares, edad)",
        "body": (
            "Modulo `atlashabita.infrastructure.ingestion.ine_api` que descarga series municipales "
            "de poblacion, hogares y estructura de edad desde la API experimental del INE, cacheando "
            "las respuestas en `data/raw/ine_api/` con checksum y normalizandolas a "
            "`data/processed/ine_population.csv`.\n\n"
            "Criterios: cliente httpx+tenacity con reintentos, parser JSON robusto, manifiesto "
            "en `data/reports/`, tests con fixtures locales (sin red en CI), ruff, mypy strict y "
            "cobertura del modulo >= 90%."
        ),
        "labels": ["tipo:data", "fase:2-datos-rdf", "prioridad:alta", "tamaño:L"],
    },
    {
        "title": "[71] Conector INE · Atlas de Renta de los Hogares",
        "body": (
            "Modulo `ingestion.ine_atlas_renta` para renta neta por persona y hogar a nivel municipal, "
            "distrito y seccion censal. Descarga desde la pestaña experimental, normaliza a "
            "`data/processed/ine_income.csv` y aplica quality gates de rango plausible."
        ),
        "labels": ["tipo:data", "fase:2-datos-rdf", "prioridad:alta", "tamaño:M"],
    },
    {
        "title": "[72] Conector INE · DIRCE empresas por actividad",
        "body": (
            "Modulo `ingestion.ine_dirce` que consume el JSON-stat del INE y produce "
            "`data/processed/ine_enterprises.csv` con empresas por municipio y sector CNAE. "
            "Filtra los CNAE de interes (comercio, servicios, turismo)."
        ),
        "labels": ["tipo:data", "fase:2-datos-rdf", "prioridad:media", "tamaño:M"],
    },
    {
        "title": "[73] Conector MITECO · Reto Demografico (demografia + servicios)",
        "body": (
            "Modulos `ingestion.miteco_demographic` y `ingestion.miteco_services` que descargan los "
            "CSV/XLSX publicados por MITECO en las landing pages de datos demograficos y servicios, "
            "fusionan con codigos INE y normalizan a `data/processed/miteco_*.csv`. Tests con "
            "fixtures locales."
        ),
        "labels": ["tipo:data", "fase:2-datos-rdf", "prioridad:alta", "tamaño:L"],
    },
    {
        "title": "[74] Expansion del dataset a cobertura nacional (capitales y top municipios)",
        "body": (
            "Producir un `data/seed/` extendido con >=100 municipios (17 capitales de CCAA, 52 "
            "capitales de provincia y resto top por poblacion) manteniendo compatibilidad con el "
            "MVP. Indicadores: rent_median, broadband_coverage, income_per_capita, services_score, "
            "climate_comfort, population, density, age_median, enterprise_density. 4 perfiles "
            "(anadir `retire`)."
        ),
        "labels": ["tipo:data", "fase:2-datos-rdf", "prioridad:alta", "tamaño:L"],
    },
    {
        "title": "[75] Ontologia extendida con GeoSPARQL y PROV-O",
        "body": (
            "Ampliar `ontology/atlashabita.ttl` con alineacion GeoSPARQL (geo:Feature, geo:Geometry, "
            "geo:hasGeometry, geo:asWKT) y PROV-O (prov:Activity, prov:used, prov:wasGeneratedBy). "
            "Reforzar `ontology/shapes.ttl` con sh:pattern sobre codigo INE y xsd:gYear en periodo."
        ),
        "labels": ["tipo:rdf", "fase:2-datos-rdf", "prioridad:alta", "tamaño:M"],
    },
    {
        "title": "[76] SPARQL geoespacial y de descubrimiento sobre el grafo ampliado",
        "body": (
            "Extender `infrastructure.rdf.sparql_queries` con consultas nuevas: "
            "territories_within_radius, top_by_composite_score, indicators_timeseries, "
            "provenance_chain. GeoSPARQL con fallback si la extension no esta cargada. Tests "
            "contra el grafo seed ampliado."
        ),
        "labels": ["tipo:rdf", "fase:2-datos-rdf", "prioridad:alta", "tamaño:M"],
    },
    {
        "title": "[77] Endpoints /sparql y /rdf/export con sandbox y formatos multiples",
        "body": (
            "Router `sparql.py` con `POST /sparql` (whitelist) y `GET /sparql/catalog`. Router "
            "`rdf.py` con `GET /rdf/export?format=turtle|json-ld|nt|trig`. Sin UPDATE arbitrario "
            "y limites de tamano. Tests y documentacion OpenAPI."
        ),
        "labels": ["tipo:backend", "fase:3-backend", "prioridad:alta", "tamaño:M"],
    },
    {
        "title": "[78] UI/UX con datos reales: capas, ranking ampliado y ficha rica",
        "body": (
            "Mapa con burbujas escaladas y coloreadas por perfil activo, panel de capas (>=6), "
            "ranking con paginacion y filtros duros, ficha con cadena de procedencia y enlace al "
            "RDF. Panel tecnico con consulta SPARQL predefinida. Lighthouse performance >=90, "
            "accesibilidad AA, Playwright verde."
        ),
        "labels": ["tipo:frontend", "tipo:ux", "fase:5-integracion", "prioridad:alta", "tamaño:XL"],
    },
    {
        "title": "[79] Apache Jena Fuseki opcional dockerizado",
        "body": (
            "Servicio Fuseki en `docker-compose.yml` con Dockerfile propio y carga automatica del "
            "grafo serializado. Cliente Python `FusekiSparqlRunner` intercambiable via "
            "`ATLASHABITA_SPARQL_BACKEND=memory|fuseki`. Las consultas principales funcionan igual "
            "con ambos backends."
        ),
        "labels": ["tipo:infra", "fase:5-integracion", "prioridad:media", "tamaño:L"],
    },
    {
        "title": "[80] Validacion E2E real y release v0.2.0",
        "body": (
            "Playwright full sin skip sobre backend con seed nacional. Lighthouse CI (desktop + "
            "mobile). Actualizar README, docs/data-pipeline.md, docs/rdf-model.md, docs/api.md, "
            "docs/roadmap.md. PR final develop -> main, tag v0.2.0, release notes."
        ),
        "labels": ["tipo:test", "tipo:docs", "fase:7-release", "prioridad:alta", "tamaño:L"],
    },
]


def main() -> None:
    milestone_number = find_milestone(MILESTONE_TITLE)
    if milestone_number is None:
        milestone = _request(
            "POST",
            "/milestones",
            {"title": MILESTONE_TITLE, "description": MILESTONE_BODY, "state": "open"},
        )
        milestone_number = int(milestone["number"])  # type: ignore[index]
        print(f"Milestone creado: {milestone_number}")
    else:
        print(f"Milestone reutilizado: {milestone_number}")

    already = existing_titles()
    for item in ISSUES:
        if item["title"] in already:
            print(f"= ya existe: {item['title'][:60]}")
            continue
        payload = {
            "title": item["title"],
            "body": item["body"],
            "labels": item["labels"],
            "milestone": milestone_number,
            "assignees": ["GonxKZ"],
        }
        res = _request("POST", "/issues", payload)
        if isinstance(res, dict) and "number" in res:
            print(f"+ {res['number']} {res['title'][:60]}")
        else:
            print(f"! error creando {item['title']}: {res}")


if __name__ == "__main__":
    main()
