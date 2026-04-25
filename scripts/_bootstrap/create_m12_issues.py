"""Crea milestone M12 (AtlasHabita Atelier) y sus 8 issues."""
from __future__ import annotations

import json
import os
import sys
import urllib.error
import urllib.request

sys.stdout.reconfigure(encoding="utf-8")
TOKEN = os.environ["GH_TOKEN"]
API = "https://api.github.com/repos/GonxKZ/atllashabita"


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
    "title": "M12 AtlasHabita Atelier (UX exhaustiva v0.5.0)",
    "description": (
        "Pase mayor de UX siguiendo la spec del skill frontend-design: paleta moss+copper+linen, "
        "tipografias Fraunces/Geist/JetBrains Mono, glassmorphism, ranking flotante solapado al mapa, "
        "ficha como bottom-sheet, mini-map, leyenda flotante, command palette y comparador/escenarios reales. "
        "Todas las rutas y todos los elementos del DOM deben ser funcionales y orientativos en español."
    ),
}

ISSUES = [
    {
        "title": "[111] Tokens & shell Atelier (paleta moss+copper+linen, Fraunces, scroll-soft, sidebar collapsible)",
        "body": (
            "Reescribe `tokens.css` y `globals.css` con la paleta extendida del spec frontend-design "
            "(moss/copper/linen + capas), incorpora Fraunces y Geist via @fontsource, anade utilidad "
            "`scroll-soft` global y elimina cualquier scroll cutre, hace la sidebar colapsable a 72px "
            "con tooltips y la topbar flotante con breadcrumbs y hint Cmd+K. Stats Strip sobre el mapa."
        ),
        "labels": ["tipo:frontend", "tipo:ux", "fase:4-frontend", "prioridad:alta", "tamaño:L"],
    },
    {
        "title": "[112] Motion atelier: marker reveal radial, magnetic cursor, NumberCountup, sparklines",
        "body": (
            "Helpers GSAP: `MotionMagnetic`, `NumberCountup`, `Sparkline`, hook `usePrefersReducedMotion`. "
            "Marker reveal radial al cargar la home (stagger from:'center'). Hover de cards con glow conico. "
            "Cambio de capa anima color de markers sin remontar."
        ),
        "labels": ["tipo:frontend", "tipo:performance", "fase:4-frontend", "prioridad:alta", "tamaño:M"],
    },
    {
        "title": "[113] Overlays cartograficos: ranking flotante, mini-map, ficha bottom-sheet, leyenda flotante",
        "body": (
            "FloatingRanking con virtual list (380px, glass, pinable, autocollapse a 56px tras 6s). "
            "MiniMap 200x140 abajo-derecha. TerritorySheet bottom-sheet con drag handle y 3 snap points "
            "(15/55/92). RichLegend flotante centro-bajo con cambio capa via `[`/`]` y dominio animado. "
            "Tooltip de marker rico con sparkline 12 meses, top-3 indicadores y boton 'Ver ficha'."
        ),
        "labels": ["tipo:frontend", "tipo:ux", "fase:4-frontend", "prioridad:alta", "tamaño:XL"],
    },
    {
        "title": "[114] Command Palette ⌘K + atajos globales + busqueda fuzzy",
        "body": (
            "CommandPalette modal con surface-glass, busqueda fuzzy de municipios, capas, acciones, "
            "rutas y atajos teclado (Cmd+K, Cmd+B sidebar, Cmd+L legend, Cmd+M mini-map, Cmd+1..9 capas, "
            "/ focus search, ? atajos). Integracion con auth/state y router."
        ),
        "labels": ["tipo:frontend", "tipo:ux", "fase:4-frontend", "prioridad:alta", "tamaño:L"],
    },
    {
        "title": "[115] Comparador real: añadir/quitar municipios, tabla con diferencial visual, exportar CSV/JSON",
        "body": (
            "La ruta /comparador hasta ahora reusa el RankingPanel. Implementar comparador propio: "
            "drawer izquierdo con candidatos (drag&drop al area de comparacion), tabla con barras "
            "diferenciales, gráfico radial spider de 6 dimensiones, exportar CSV/JSON. Persistencia "
            "en Zustand (`compareStore`)."
        ),
        "labels": ["tipo:frontend", "fase:4-frontend", "prioridad:alta", "tamaño:L"],
    },
    {
        "title": "[116] Escenarios real: simulador de pesos del perfil con visualizacion en vivo del ranking",
        "body": (
            "La ruta /escenarios alias a /sparql en M11. Crearla como simulador: sliders de pesos "
            "por indicador, vista previa del top-10 que cambia al instante, save/load de escenarios "
            "en localStorage, comparativa antes/despues. Integrarse con scoring del backend."
        ),
        "labels": ["tipo:frontend", "fase:4-frontend", "prioridad:alta", "tamaño:M"],
    },
    {
        "title": "[117] Microcopy y orientacion: tooltips guiados, empty states ricos, breadcrumbs y feedback",
        "body": (
            "Cada boton, badge y chip orienta al usuario. Empty states con CTA claros. Tooltips con "
            "Tippy o Radix sobre todo dato no obvio. Mensajes en español tecnico claro. Toast 'datos "
            "actualizados', 'cambios guardados', etc."
        ),
        "labels": ["tipo:ux", "tipo:docs", "fase:4-frontend", "prioridad:alta", "tamaño:M"],
    },
    {
        "title": "[118] Release v0.5.0 con capturas Chrome MCP y CHANGELOG",
        "body": (
            "Captura final con Chrome DevTools MCP de cada vista mejorada. Actualizar README, "
            "CHANGELOG, ADR sobre el cambio de paleta y layout, PR develop->main, tag v0.5.0."
        ),
        "labels": ["tipo:docs", "fase:7-release", "prioridad:alta", "tamaño:M"],
    },
]


def main() -> None:
    milestone = find_milestone(MILESTONE["title"])
    if milestone is None:
        res = call("POST", "/milestones", {**MILESTONE, "state": "open"})
        milestone = int(res["number"])  # type: ignore[index]
        print(f"Milestone creado #{milestone}")
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
            print(f"! {item['title']}: {res}")


if __name__ == "__main__":
    main()
