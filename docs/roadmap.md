# Roadmap de AtlasHabita

Plan de entrega por milestones, con estado y trazabilidad a issues. El flujo operativo que rige la creación de ramas y PRs se describe en [`github-workflow.md`](github-workflow.md) y [`CONTRIBUTING.md`](../CONTRIBUTING.md).

Leyenda de estado:

| Símbolo | Significado |
|---|---|
| `completado` | Fusionado en `develop` y verificado en CI. |
| `en curso` | Hay ramas activas trabajando sobre la milestone. |
| `ready` | Especificado, con issues abiertas y pendiente de implementación. |
| `futuro` | Fuera del alcance del MVP; propuesta post-defensa. |

---

## Visión general

```mermaid
flowchart LR
    M0[M0 · Fundamentos] --> M1[M1 · Infraestructura]
    M1 --> M2[M2 · Pipeline y RDF]
    M2 --> M3[M3 · Calidad de datos]
    M3 --> M4[M4 · Backend FastAPI]
    M4 --> M5[M5 · Frontend pixel-a-pixel]
    M5 --> M6[M6 · Tests, CI, seguridad]
    M6 --> M7[M7 · Documentación y release v0.1.0]
    M7 --> M8[M8 · Ingesta nacional + SPARQL + v0.2.0]
    M8 --> M9[M9 · Pulido pixel-perfect + v0.3.0]
```

---

## M0 · Fundamentos

**Estado:** `completado`

- ADRs iniciales, CODEOWNERS, plantillas de issue/PR, `CONTRIBUTING.md`.
- Workflows base de CI (quality, security, docs).

Issues asociadas:

| Issue | Título | Estado |
|---|---|---|
| #1 | Auditoría inicial y plan de ejecución. | completado |
| #2 | Crear `develop`, labels y milestones. | completado |
| #3 | Plantillas de issue, PR y CODEOWNERS. | completado |

Entregables:

- [`docs/adr/0001-auditoria-inicial.md`](adr/0001-auditoria-inicial.md)
- [`docs/adr/0002-arquitectura-screaming.md`](adr/0002-arquitectura-screaming.md)
- [`docs/adr/0003-stack-tecnologico.md`](adr/0003-stack-tecnologico.md)
- [`docs/github-workflow.md`](github-workflow.md)

---

## M1 · Infraestructura y scaffolding

**Estado:** `completado`

- Monorepo `apps/api` + `apps/web`.
- Backend FastAPI con dominio limpio, `/health` y observabilidad.
- Frontend Vite + React 19 + Tailwind v4 + Vitest.
- Docker Compose, Makefile, `.env.example`.
- CI completa por áreas (`ci-backend`, `ci-frontend`, `ci-build`, `ci-rdf`, `ci-e2e`, `ci-docs`).

Issues asociadas:

| Issue | Título | Estado |
|---|---|---|
| #4 | Scaffolding del monorepo y CI completa. | completado |
| #5 | Backend inicial con dominio limpio y `/health`. | completado |
| #6 | Frontend inicial con Vite + Tailwind v4. | completado |
| #7 | Infra: Makefile, Compose, `.env.example`. | completado |

---

## M2 · Pipeline de datos y RDF base

**Estado:** `completado`

- Dataset demo versionado (`data/seed/`).
- Ontología `ontology/atlashabita.ttl` y shapes `ontology/shapes.ttl`.
- Lector seed (`seed_loader.py`).

Issues asociadas:

| Issue | Título | Estado |
|---|---|---|
| #8 | Dataset demo, ontología y lector seed. | completado |
| #9 | Shapes SHACL mínimas. | completado |
| #10 | Política de URIs y named graphs documentada. | completado |
| #11 | Validación RDF en CI. | completado |
| #12 | Infraestructura RDF (rdflib + pyshacl). | completado |

---

## M3 · Diseño del sistema de datos (calidad avanzada)

**Estado:** `completado`

- Validaciones tabulares y geoespaciales con reportes persistentes.
- Named graphs operativos con particiones por dominio.
- Reporte consolidado de calidad.

Issues asociadas:

| Issue | Título | Estado |
|---|---|---|
| #13 | Validaciones tabulares con reporte YAML/JSON. | completado |
| #14 | Validaciones geoespaciales (CRS, topología, simplificación). | completado |
| #15 | Particionado por named graphs y exportación TriG. | completado |
| #16 | Reporte consolidado de calidad. | completado |
| #17 | Quality gates en CI (`ci-rdf` ampliado). | completado |

---

## M4 · Backend FastAPI con dominio limpio

**Estado:** `completado`

- Endpoints de dominio: perfiles, territorios, rankings, capas, fuentes, RDF.
- Scoring explicable con contribuciones.
- SPARQL endpoints internos predefinidos.

Issues asociadas:

| Issue | Título | Estado |
|---|---|---|
| #18 | `GET /profiles` y `GET /territories`. | completado |
| #19 | `GET /rankings` y `POST /rankings/custom`. | completado |
| #20 | `GET /map/layers` y `GET /sources`. | completado |

Referencias: [`api.md`](api.md), [`15_BACKEND_API_CONTRATOS_Y_SERVICIOS.md`](15_BACKEND_API_CONTRATOS_Y_SERVICIOS.md).

---

## M5 · Frontend pixel a pixel

**Estado:** `completado`

- Sistema de diseño derivado de la captura de referencia.
- Sidebar, topbar con "Nuevo análisis", mapa, ranking y panel de tendencias.
- Estados: cargando, vacío, error, datos incompletos, modo demo.

Issues asociadas:

| Issue | Título | Estado |
|---|---|---|
| #21 | Sistema de diseño y tokens Tailwind v4. | completado |
| #22 | Design system shell (sidebar + topbar). | completado |
| #23 | Mapa MapLibre y capas coropléticas. | completado |
| #24 | Ranking lateral sincronizado con el mapa. | completado |
| #25 | Ficha territorial con indicadores y explicación. | completado |
| #26 | Inspector de fuentes. | completado |
| #27 | Integración frontend con API. | completado |

Referencias: [`16_FRONTEND_UX_UI_Y_FLUJOS.md`](16_FRONTEND_UX_UI_Y_FLUJOS.md).

---

## M6 · Tests, CI, seguridad y performance

**Estado:** `completado`

- Cobertura de tests unitarios y de integración por encima del 70 %.
- OWASP Top 10 revisado para la API.
- Playwright con cobertura del flujo principal.
- Benchmark ligero con datos demo.

Issues asociadas:

| Issue | Título | Estado |
|---|---|---|
| #28 | Cobertura backend ≥ 70 %. | completado |
| #29 | Cobertura frontend ≥ 60 %. | completado |
| #30 | `bandit`, `pip-audit`, `npm audit` estrictos. | completado |
| #31 | Playwright para E2E-001..E2E-005. | completado |
| #32 | Lighthouse/k6 smoke. | completado |
| #33 | Revisión OWASP Top 10. | completado |

Referencias: [`testing.md`](testing.md), [`18_PLAN_DE_PRUEBAS_VALIDACION_Y_CALIDAD.md`](18_PLAN_DE_PRUEBAS_VALIDACION_Y_CALIDAD.md).

---

## M7 · Documentación final y release

**Estado:** `completado`

- README exhaustivo.
- Guías `architecture.md`, `data-pipeline.md`, `rdf-model.md`, `api.md`, `testing.md`, `roadmap.md`.
- Playwright E2E `home.spec.ts` y `profile-flow.spec.ts`.
- Release final: PR `develop → main` con tag SemVer (v0.1.0) y release notes.

Issues asociadas:

| Issue | Título | Estado |
|---|---|---|
| #34 | Documentación final y guía E2E. | completado |
| #59 | Ultrareview cruzada del repositorio v0.1.1. | completado ([reviews/v0.1.1-ultrareview.md](reviews/v0.1.1-ultrareview.md)) |

---

## M8 · Ingesta real, SPARQL y release v0.2.0

**Estado:** `completado`

La milestone M8 descompone el salto desde el demo con 10 municipios a una plataforma
demostrable a nivel nacional en cuatro fases independientes (A/B/C/D) que se han
trabajado en worktrees aislados para reducir acoplamiento. Todas las fases se
fusionaron en `develop` y el tag v0.2.0 cierra la milestone (PR #86).

| Fase | Alcance | Issues principales | Estado |
|---|---|---|---|
| A · Ingesta real | Conectores INE + MITECO + SETELECO + AEMET, dataset nacional con 101 municipios y 909 observaciones. | #70, #72, #73 | completado |
| B · Ontología | GeoSPARQL + PROV-O, SHACL ampliado, consultas de referencia. | #74, #75 | completado |
| C · Endpoints | `/sparql`, `/sparql/catalog`, `/rdf/export`, adaptador Fuseki opcional. | #76, #77, #83 | completado |
| D · UI/UX v0.2.0 | Ranking nacional, ficha con PROV-O, panel SPARQL, release v0.2.0. | #78, #80, #84, #86 | completado |

El detalle de la Fase D (ranking paginado, ficha con "Ver RDF", panel SPARQL,
`ProvenanceChip`, `LayerSwitcher` con seis capas) se documenta en
[`reviews/v0.2.0-release-notes.md`](reviews/v0.2.0-release-notes.md).

---

## M9 · Pulido pixel-perfect y release v0.3.0

**Estado:** `en curso`

Milestone final que cierra el TFG. Cuatro pistas paralelas (A/B/C/D) coordinadas en
worktrees aislados, sin solapamiento de ficheros:

| Pista | Alcance | Issues principales | Estado |
|---|---|---|---|
| A · Pixel-perfect UI | Tokens consolidados, hero, recommendations, trends, dashboard, ranking, territorio y SPARQL al pixel frente a la captura de referencia. | #89 | en curso |
| B · Motion con GSAP | Timeline GSAP + scroll trigger, fallback `prefers-reduced-motion`. | #90 | en curso |
| C · Documentación + auditoría | Reescritura del README, sincronización de docs con v0.2.0/v0.3.0, ADR 0004, auditoría completa. | #87, #88 | en curso |
| D · Capturas + release | Capturas Playwright reales en `docs/screenshots/`, smoke E2E reforzado, release v0.3.0. | #91, #92 | en curso |

Documento de referencia: [`reviews/v0.3.0-audit.md`](reviews/v0.3.0-audit.md) y
[`adr/0004-pulido-pixel-perfect.md`](adr/0004-pulido-pixel-perfect.md).

---

## Futuro (fuera del MVP)

| Tema | Descripción |
|---|---|
| Modo técnico avanzado | SPARQL console con sandbox. |
| Multi-tenant | Perfiles guardados por usuario. |
| Cobertura internacional | Extender más allá de España. |
| Machine learning complementario | Clustering de territorios similares. |
| Accesibilidad AAA | Auditoría WCAG 2.2 completa. |

---

## Referencias cruzadas

- [`architecture.md`](architecture.md)
- [`data-pipeline.md`](data-pipeline.md)
- [`rdf-model.md`](rdf-model.md)
- [`api.md`](api.md)
- [`testing.md`](testing.md)
- [`github-workflow.md`](github-workflow.md)
- [`CONTRIBUTING.md`](../CONTRIBUTING.md)
