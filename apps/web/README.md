# AtlasHabita · Frontend

Aplicación web que reproduce el lenguaje visual de la captura de referencia y consume el backend FastAPI para mostrar mapa territorial, ranking nacional, ficha territorial, panel SPARQL e inspector de fuentes. Estado v0.2.0 (M8 cerrado): 127/127 tests Vitest, 5 suites Playwright, lazy-load del panel SPARQL, fallback offline para SPARQL y RDF export.

## Desarrollo

```bash
pnpm install
pnpm dev
```

El servidor arranca en `http://localhost:5173` y proxyea `/api/*` al backend en `http://127.0.0.1:8000`.

## Estructura

```text
src/
├── features/             # Pantallas y dominios de producto
│   ├── dashboard/        # Layout principal
│   ├── hero/             # Hero animado con GSAP
│   ├── map/              # MapLibre GL + LayerSwitcher (6 capas)
│   ├── ranking/          # Ranking nacional paginado (20/pág) con filtros duros
│   ├── territory/        # Ficha territorial + RdfExportModal
│   ├── sparql/           # Panel técnico con catálogo y bindings tipados
│   ├── provenance/       # ProvenanceChip con tooltip PROV-O
│   ├── recommendations/  # Cards animadas
│   ├── trends/           # Tendencias por CCAA
│   └── activity/         # Histórico de cambios
├── components/           # Primitivas UI (Button, Card, Badge, Pagination, CodeBlock, DataTable, Slider, Toggle)
├── data/                 # Dataset nacional mock (national_mock.ts)
├── services/             # Cliente tipado (sparql.ts, rdf_export.ts)
├── state/                # Zustand stores (selection, profile, ...)
├── hooks/                # Hooks transversales (useSparql, useRdfExport)
├── routes/               # AppRouter con `/`, `/ranking`, `/territorio/:id`, `/sparql`
└── styles/               # Tokens Tailwind v4 y estilos globales
```

## Scripts

| Script | Uso |
|---|---|
| `pnpm dev` | Servidor Vite con HMR. |
| `pnpm build` | `tsc --noEmit && vite build` (chunk separado para SPARQL). |
| `pnpm lint` | ESLint sin warnings. |
| `pnpm test` | Vitest con jsdom (127 tests). |
| `pnpm test:coverage` | Cobertura V8. |
| `pnpm typecheck` | `tsc --noEmit`. |
| `pnpm format` / `pnpm format:check` | Prettier + plugin Tailwind. |
| `pnpm e2e` | Playwright (Chromium): `home`, `profile-flow`, `ranking`, `territory`, `sparql`. |

## Capacidades v0.2.0

- **Ranking** paginado con filtros duros (precio máximo, conectividad mínima) y badge de confianza.
- **Ficha territorial** con cabecera, tabla de indicadores, chips PROV-O y modal "Ver RDF" Turtle paginado.
- **SPARQL playground** con catálogo local de tres consultas y fallback offline cuando `/sparql` no responde.
- **MapLibre GL** con seis capas activables (score, renta, alquiler, banda ancha, servicios, clima) y leyenda por capa.
- **GSAP motion** en hero, recommendations y trends, con respeto a `prefers-reduced-motion` ([ADR 0004](../../docs/adr/0004-pulido-pixel-perfect.md)).
- **Accesibilidad AA**: roles ARIA, focus ring, contraste, navegación por teclado y `aria-live` en estados asíncronos.

## Bundle

- Bundle inicial bajo 420 KB (gzip 128 KB).
- Chunk separado `SparqlPlayground-*.js` (~13 KB / 5 KB gzip) cargado con `React.lazy`.
