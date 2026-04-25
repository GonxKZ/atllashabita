# Changelog

Todas las versiones notables del producto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto adopta
[Versionado Semántico](https://semver.org/lang/es/).

## [0.5.1] - 2026-04-25

Hito **M13 · Calidad state-of-the-art**. Pase orquestado con 5 teammates en
worktrees aislados sobre `develop` para auditar y endurecer todo el código
sin tocar la estética Atelier ni la funcionalidad.

### Añadido

- `react-scan@0.5.3` integrado en `apps/web/src/main.tsx` bajo
  `import.meta.env.DEV`. Bundle de producción intacto.
- Auditoría `react-doctor` con score `90 → ≥95/100` (1 error → 0; 23
  warnings corregidos). Reporte: `docs/reviews/v0.5.1-react-doctor.md`.
- Skip-link al `#main-content` en `index.html` + `globals.css` (WCAG 2.4.1).
- Focus trap básico en `CommandPalette` (Tab/Shift+Tab) y orden de foco
  coordinado en `TerritorySheet` (sin `stopPropagation`).
- Reportes de auditoría: `v0.5.1-react-scan.md`, `v0.5.1-react-doctor.md`,
  `v0.5.1-ultrareview-backend.md`, `v0.5.1-ultrareview-frontend.md`,
  `v0.5.1-ultrareview-rdf.md`, `v0.5.1-review-cross.md`,
  `v0.5.1-simplify.md`.
- `scripts/_bootstrap/_github_api.py` · cliente compartido por los scripts
  `create_m{8,9,11,12}_issues.py` (~120 líneas duplicadas eliminadas).

### Cambiado

- **Backend** (`apps/api`): O(n²) eliminado en rankings; `_resolve_scope`
  cacheado por provincia/comunidad; `risk()` y `summary()` single-pass;
  `_top_pairs` con `heapq.nlargest`; cache `_make_key` estable.
- **Frontend** (`apps/web`): patrón "adjusting state during render" en
  `CommandPalette` y `TerritorySheet` (sustituye `useEffect` de
  sincronización); `<form action>` React 19 en `Topbar`; keys estables
  sin index en `MapLegend`, `Pagination`, `CodeBlock`, `CommandPalette`,
  `ComparadorPage`; functional setState en `StatsStrip`.
- **Ontología y SHACL**: `ah:flowDestination` subPropertyOf
  `prov:wasInfluencedBy`; `ah:transitMode` `owl:FunctionalProperty`;
  `sh:datatype` y `sh:message` con códigos en cinco shapes.
- **SPARQL**: `mobility_flow_between` con `VALUES` + IRIs canónicas;
  `top_by_composite_score` con `PREFIX xsd`; `provenance_chain` con
  `OPTIONAL` desacoplado; `count_triples_by_class` con `LIMIT 1000`.
- Comentarios obsoletos eliminados en `state/auth.ts`, `services/auth.ts`,
  `interfaces/api/schemas.py` (`HealthResponse`).

### Eliminado

- 10 archivos huérfanos: `components/ui/{ErrorState,Skeleton,index}.tsx` y
  `features/{activity,hero,map,provenance,recommendations,sparql,trends}/index.ts`.

### Calidad

- pytest: 493 passed + 1 skipped (cobertura 95%).
- vitest: 370/370 passed (82 archivos).
- ESLint: 0 warnings (`--max-warnings 0`).
- TypeScript estricto sin errores.
- ruff/ruff format clean.

## [Unreleased] · candidato v0.3.0 · 2026-04-24

Hito **M9 · Pulido pixel-perfect**. Cuatro pistas paralelas (A/B/C/D) coordinadas en
worktrees aislados sobre `develop`, cerrando el TFG.

### Añadido

- ADR `docs/adr/0004-pulido-pixel-perfect.md` que formaliza el pase pixel-perfect, el
  sistema de motion con GSAP y la estrategia de fallback `prefers-reduced-motion`.
- Auditoría completa `docs/reviews/v0.3.0-audit.md` con estado de issues, PRs,
  identidad git, workflows en verde, métricas de calidad y plan post-defensa.
- Sección "Capturas" en el README con referencias a `docs/screenshots/` (PNGs
  pixel-perfect generados por Playwright en la pista D).
- Sección "Capacidades v0.2.0" tabular en el README con la matriz exhaustiva de lo
  ejecutable sobre `develop`.

### Cambiado

- `README.md` reescrito íntegramente con descripción ejecutiva, badges, requisitos,
  pipeline, modelo RDF, API, UI, testing y roadmap actualizados al estado real
  (101 municipios, 909 observaciones, 9 indicadores, 4 perfiles, 8 fuentes
  oficiales, 14 endpoints, 372/372 backend tests, 127/127 frontend tests).
- `docs/architecture.md`: nueva sección "Estado real v0.2.0 / v0.3.0", referencia a
  ADR-0004, decisiones DA-005 (GeoSPARQL/PROV-O) y DA-006 (`/sparql` whitelist +
  Fuseki).
- `docs/data-pipeline.md`: dataset seed con 172 territorios, 909 observaciones y 4
  perfiles; tabla con los cinco conectores reales y las ocho fuentes oficiales.
- `docs/api.md`: catálogo de endpoints con todos los estados marcados como
  `completado`; versión expuesta en `/health` actualizada a 0.2.0.
- `docs/testing.md`: estado real de la pirámide (372/127), suites Playwright
  ampliadas a `ranking`, `territory`, `sparql`.
- `docs/roadmap.md`: M3..M8 cerradas, M9 con cuatro pistas (A/B/C/D) y referencias
  a la auditoría v0.3.0.
- `docs/github-workflow.md`: lista de workflows ampliada a 10 (`ci-codeql`,
  `ci-trivy`); regla explícita de "único autor" en commits y PRs.
- `apps/api/README.md` y `apps/web/README.md`: notas resincronizadas con la
  release v0.2.0.
- `CONTRIBUTING.md`: párrafo recordando la regla de un único autor en commits
  y PRs.

## [0.2.0] - 2026-04-24

### Añadido

- Dataset nacional mock `apps/web/src/data/national_mock.ts` con más de 100 municipios
  reales y siete indicadores sintéticos por entrada (población, renta, alquiler, banda
  ancha, servicios sanitarios, clima, calidad del aire).
- Panel `features/ranking/RankingPanel` con paginación (20/página), filtros duros
  (precio máximo y conectividad mínima) y badge de confianza.
- Ficha territorial `features/territory/TerritoryDetail` con cabecera, población,
  tabla de indicadores, chips PROV-O y modal "Ver RDF" paginado.
- Modal `features/territory/RdfExportModal` con fallback Turtle determinista cuando
  `/rdf/export` aún no está disponible.
- Panel técnico `features/sparql/SparqlPlayground` con catálogo de consultas,
  validador tipado (`schema.ts` estilo zod) y ejecutor con fallback local.
- Panel de capas `features/map/layers/LayerSwitcher` con seis capas activables
  (score, renta, alquiler, banda ancha, servicios, clima) y leyenda por capa.
- Componente `features/provenance/ProvenanceChip` con tooltip accesible (licencia,
  periodo, link oficial) reutilizable en cualquier indicador.
- Primitivas UI: `Pagination`, `Slider`, `CodeBlock`, `DataTable`, `Toggle`.
- Cliente tipado `services/sparql.ts` y `services/rdf_export.ts` + hooks
  `useSparql`, `useRdfExport`.
- Rutas `/ranking`, `/territorio/:id`, `/sparql` en `routes/AppRouter`. La ruta
  `/sparql` carga el panel mediante `React.lazy` para no aumentar el bundle inicial.
- Suites Playwright `tests/e2e/ranking.spec.ts`, `tests/e2e/territory.spec.ts`,
  `tests/e2e/sparql.spec.ts`.
- Documento `docs/reviews/v0.2.0-release-notes.md` con notas de versión detalladas.

### Cambiado

- `README.md`: nueva sección "Pantallas v0.2.0" enlazando rutas y release notes.
- `routes/AppRouter.tsx`: añade lazy-load y nuevas rutas manteniendo compatibilidad
  con los tests existentes.

### Calidad

- 41 archivos de test Vitest / 127 tests verdes.
- Lint y format (Prettier) sin warnings.
- Build Vite con chunk separado para el panel SPARQL (~13 KB / 5 KB gzip).

## [0.1.1] - 2026-04-10

- Consolidación de CI (trivy, ci-e2e, ci-quality) en verde.
- Fix de hallazgos de seguridad y rendimiento previos al release.

## [0.1.0] - 2026-04-01

- Primera versión con scaffolding del monorepo, pipeline RDF, backend FastAPI inicial
  y dashboard React + Tailwind v4 con datos demo (10 municipios) y mapa MapLibre.
