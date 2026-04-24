"""Crea milestone M11 y las 8 issues del ciclo de movilidad/accidentes/auth."""
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
    data = json.dumps(body).encode("utf-8") if body else None
    req = urllib.request.Request(f"{API}{path}", data=data, method=method)
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
    res = call("GET", "/milestones?state=all&per_page=100")
    assert isinstance(res, list)
    for m in res:
        if m.get("title") == title:
            return int(m["number"])
    return None


MILESTONE = {
    "title": "M11 Movilidad + Accidentes + Auth + Mapa multi-metrica",
    "description": (
        "Integra MITMA opendata-movilidad, DGT accidentes 2024 y CRTM Madrid GTFS; "
        "amplia ontologia y SPARQL geoespacial; mapa con capas reactivas y leyenda "
        "dinamica; autenticacion completa con login, registro, cuenta y rutas "
        "protegidas; release v0.4.0."
    ),
}

ISSUES = [
    {
        "title": "[102] Conector MITMA opendata-movilidad (estudios completos + diarios)",
        "body": (
            "Modulo `infrastructure.ingestion.mitma_movilidad` que descarga, cachea y "
            "normaliza los ficheros de MITMA (https://movilidad-opendata.mitma.es/). "
            "Soporta estudios completos y estudios basicos diarios. Salida normalizada en "
            "`data/processed/mitma_movilidad.csv` con columnas `origin_municipality`, "
            "`destination_municipality`, `period`, `flow`, `mode`, `source`. Tests con "
            "fixtures locales."
        ),
        "labels": ["tipo:data", "fase:2-datos-rdf", "prioridad:alta", "tamaño:L"],
    },
    {
        "title": "[103] Conector DGT accidentes con victimas 2024",
        "body": (
            "Modulo `infrastructure.ingestion.dgt_accidentes` que descarga el dataset de "
            "microdatos de accidentes con victimas 2024 (https://www.dgt.es/) y produce "
            "`data/processed/dgt_accidentes.csv` con columnas `municipio_code`, `fecha`, "
            "`gravedad`, `victimas`, `vehiculos`, `condicion_meteorologica`."
        ),
        "labels": ["tipo:data", "fase:2-datos-rdf", "prioridad:alta", "tamaño:M"],
    },
    {
        "title": "[104] Conector CRTM Madrid GTFS Cercanias y movilidad multimodal",
        "body": (
            "Modulo `infrastructure.ingestion.crtm_madrid` que consume los feeds GTFS "
            "(https://datos.crtm.es/datasets/1a25440bf66f499bae2657ec7fb40144) y el "
            "portal multimodal (https://datos-movilidad.crtm.es/). Genera capas de "
            "transporte publico para los municipios de la Comunidad de Madrid."
        ),
        "labels": ["tipo:data", "fase:2-datos-rdf", "prioridad:media", "tamaño:M"],
    },
    {
        "title": "[105] Ontologia ampliada: movilidad, accidentes, transporte",
        "body": (
            "Anade clases `ah:MobilityFlow`, `ah:RoadAccident`, `ah:TransitNetwork`, "
            "`ah:TransitStop` con sus propiedades; alinea con SOSA/QB/GeoSPARQL/PROV-O. "
            "Reforzar shapes SHACL para los nuevos datos."
        ),
        "labels": ["tipo:rdf", "fase:2-datos-rdf", "prioridad:alta", "tamaño:M"],
    },
    {
        "title": "[106] SPARQL geoespacial extendido (movilidad, accidentes, transporte)",
        "body": (
            "Anade consultas: `mobility_flow_between(orig, dest, periodo)`, "
            "`accidents_in_radius(lat, lon, km)`, `transit_stops_in_municipality(code)`, "
            "`risk_index(municipality)` (combinando accidentes y movilidad)."
        ),
        "labels": ["tipo:rdf", "fase:2-datos-rdf", "prioridad:alta", "tamaño:M"],
    },
    {
        "title": "[107] Mapa multi-metrica con capas reactivas y leyenda dinamica",
        "body": (
            "El cambio de capa actualiza burbujas, leyenda y rampa cromatica EN TIEMPO "
            "REAL sin recargar. Soporta al menos 8 capas: score, alquiler, banda ancha, "
            "renta, servicios, clima, movilidad, accidentes. Cada capa expone su unidad "
            "y dominio. Persistencia de la capa activa en localStorage."
        ),
        "labels": ["tipo:frontend", "tipo:ux", "fase:4-frontend", "prioridad:alta", "tamaño:L"],
    },
    {
        "title": "[108] Autenticacion: login, registro, cuenta y rutas protegidas",
        "body": (
            "Pantallas `/login`, `/registro`, `/cuenta`. Store Zustand persistido. "
            "Proteccion de `/cuenta` y panel administrativo (futuro). Sin servidor real: "
            "credenciales locales validadas con esquema Zod-like del repo. "
            "Boton 'Cerrar sesion' en el UserCard."
        ),
        "labels": ["tipo:frontend", "tipo:security", "fase:5-integracion", "prioridad:alta", "tamaño:L"],
    },
    {
        "title": "[109] Release v0.4.0 (movilidad + accidentes + auth + mapa multi-metrica)",
        "body": (
            "Verificacion integral con Chrome DevTools MCP, capturas reales en "
            "docs/screenshots/v0.4.0-*.png, README, CHANGELOG y docs sincronizados, "
            "PR develop->main, tag v0.4.0 y release notes."
        ),
        "labels": ["tipo:docs", "fase:7-release", "prioridad:alta", "tamaño:M"],
    },
]


def main() -> None:
    milestone = find_milestone(MILESTONE["title"])
    if milestone is None:
        res = call("POST", "/milestones", {**MILESTONE, "state": "open"})
        milestone = int(res["number"])  # type: ignore[index]
        print(f"Milestone creado: #{milestone}")
    existing_titles = {it["title"] for it in call("GET", "/issues?state=all&per_page=100")}  # type: ignore[assignment]
    for item in ISSUES:
        if item["title"] in existing_titles:
            print(f"= existe {item['title'][:70]}")
            continue
        res = call(
            "POST",
            "/issues",
            {
                "title": item["title"],
                "body": item["body"],
                "labels": item["labels"],
                "milestone": milestone,
                "assignees": ["GonxKZ"],
            },
        )
        if isinstance(res, dict) and "number" in res:
            print(f"+ #{res['number']} {res['title'][:70]}")
        else:
            print(f"! error {item['title']}: {res}")


if __name__ == "__main__":
    main()
