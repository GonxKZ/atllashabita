# AtlasHabita · Frontend

Aplicación web que reproduce el lenguaje visual de la captura de referencia y consume el backend FastAPI para mostrar mapa territorial, ranking, ficha y comparador.

## Desarrollo

```bash
pnpm install
pnpm dev
```

El servidor arranca en `http://localhost:5173` y proxy-fea `/api/*` al backend en `http://127.0.0.1:8000`.

## Estructura

```
src/
├── features/             # Pantallas y dominios de producto (dashboard, mapa, ranking, ficha)
├── components/           # Primitivas de UI reutilizables
├── services/             # Cliente tipado del backend
├── state/                # Zustand stores
├── hooks/                # Hooks transversales
├── routes/               # Configuración de rutas (cuando se añadan)
└── styles/               # Tokens Tailwind v4 y estilos globales
```

## Scripts

| Script | Uso |
|---|---|
| `pnpm dev` | Servidor Vite con HMR. |
| `pnpm build` | Compila TypeScript y genera producción. |
| `pnpm lint` | ESLint sin warnings. |
| `pnpm test` | Vitest con jsdom. |
| `pnpm test:coverage` | Cobertura V8. |
| `pnpm e2e` | Playwright (flujo principal). |
| `pnpm format` | Prettier + plugin Tailwind. |
