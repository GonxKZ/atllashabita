"""Crea el milestone M9 y las 6 issues del pulido final v0.3.0."""
from __future__ import annotations

import sys

from _github_api import GithubApi

sys.stdout.reconfigure(encoding="utf-8")

api = GithubApi(repo="GonxKZ/atllashabita")


MILESTONE = {
    "title": "M9 Pulido v0.3.0 · pixel-perfect + GSAP + release final",
    "description": (
        "Acabado final: pase pixel-a-pixel comparando la UI con la captura de referencia, "
        "animaciones GSAP para interactividad fluida, capturas Playwright reales, "
        "documentacion actualizada y release v0.3.0."
    ),
}

ISSUES = [
    {
        "title": "[87] Auditoria de issues, PRs y estado del repositorio",
        "body": (
            "Revisar sistematicamente: issues abiertas, PRs abiertas, labels, milestones, "
            "ADRs vivos, estado de workflows y coincidencia de la realidad del codigo con "
            "la documentacion. Publicar el resultado en docs/reviews/v0.3.0-audit.md."
        ),
        "labels": ["tipo:docs", "fase:7-release", "prioridad:alta", "tamaño:M"],
    },
    {
        "title": "[88] README y documentacion sincronizados con v0.2.0/v0.3.0",
        "body": (
            "README con descripcion ejecutiva, stack, arquitectura, instalacion, uso real, "
            "pipeline de datos, ontologia, API, testing, capturas integradas, roadmap al dia. "
            "Sincronizar docs/architecture.md, data-pipeline.md, rdf-model.md, api.md, "
            "testing.md y roadmap.md con el estado tras M8."
        ),
        "labels": ["tipo:docs", "fase:7-release", "prioridad:alta", "tamaño:L"],
    },
    {
        "title": "[89] Pase pixel-perfect de la UI frente a la captura de referencia",
        "body": (
            "Comparar exhaustivamente con C:/Users/Gonzalo/Downloads/atlashabita-main.png y "
            "afinar: paleta, tipografia, radios, sombras, jerarquia, espaciado, sidebar, "
            "topbar, hero, panel de recomendacion, chart de tendencias, actividad reciente, "
            "indice de oportunidad, cards de accion. Sin dependencias nuevas salvo las "
            "estrictamente necesarias."
        ),
        "labels": ["tipo:frontend", "tipo:ux", "fase:4-frontend", "prioridad:alta", "tamaño:L"],
    },
    {
        "title": "[90] Animaciones GSAP para interactividad fluida",
        "body": (
            "Integrar gsap + @gsap/react, aplicar animaciones de entrada en hero, sidebar, "
            "cards, ranking, ficha y mapa; micro-interacciones de hover y foco; "
            "transiciones entre rutas. Respetar `prefers-reduced-motion` y mantener "
            "accesibilidad AA."
        ),
        "labels": ["tipo:frontend", "tipo:ux", "tipo:performance", "fase:4-frontend", "prioridad:alta", "tamaño:L"],
    },
    {
        "title": "[91] Capturas reales del producto con Playwright para la documentacion",
        "body": (
            "Scripts Playwright que arrancan backend + frontend, naveganen las rutas "
            "principales (dashboard, ranking, ficha, playground SPARQL) y guardan PNGs "
            "en docs/screenshots/. Incluir en el README y en docs/architecture.md."
        ),
        "labels": ["tipo:test", "tipo:docs", "fase:6-qa", "prioridad:alta", "tamaño:M"],
    },
    {
        "title": "[92] Release v0.3.0 con CI verde en main",
        "body": (
            "Verificacion integral (ruff, mypy, pytest, vitest, build, e2e), PR develop -> "
            "main, tag v0.3.0 y release notes. Confirmar que git log no incluye co-authors "
            "ni menciones a asistentes."
        ),
        "labels": ["tipo:docs", "fase:7-release", "prioridad:alta", "tamaño:M"],
    },
]


def main() -> None:
    milestone = api.find_milestone(MILESTONE["title"])
    if milestone is None:
        res = api.call("POST", "/milestones", {**MILESTONE, "state": "open"})
        milestone = int(res["number"])  # type: ignore[index]
        print(f"Milestone creado: #{milestone}")
    else:
        print(f"Milestone reutilizado: #{milestone}")

    existing = api.existing_titles()
    for item in ISSUES:
        if item["title"] in existing:
            print(f"= existe {item['title'][:70]}")
            continue
        payload = {
            "title": item["title"],
            "body": item["body"],
            "labels": item["labels"],
            "milestone": milestone,
            "assignees": ["GonxKZ"],
        }
        res = api.call("POST", "/issues", payload)
        if isinstance(res, dict) and "number" in res:
            print(f"+ #{res['number']} {res['title'][:70]}")
        else:
            print(f"! error {item['title']}: {res}")


if __name__ == "__main__":
    main()
