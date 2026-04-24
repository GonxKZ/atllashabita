# Changelog

Todas las versiones notables del producto se documentan en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y el proyecto adopta
[Versionado Semántico](https://semver.org/lang/es/).

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
