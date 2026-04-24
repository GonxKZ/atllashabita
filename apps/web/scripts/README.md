# `apps/web/scripts`

Utilidades CLI auxiliares del paquete frontend. Pensadas para ser invocadas
con `npx tsx` (sin paso de compilación) o vía objetivos de `Makefile` desde la
raíz del repositorio.

## Scripts disponibles

### `take_screenshots.ts`

Regenera las capturas reales del producto que se publican en
`docs/screenshots/`. Internamente:

1. Levanta `pnpm dev --host 127.0.0.1 --port 5173` en background.
2. Espera (polling HTTP, timeout 60 s) a que Vite responda.
3. Ejecuta el proyecto Playwright `screenshots`
   (`tests/e2e/screenshots.spec.ts`) con un viewport 1440×900.
4. Mata el proceso del dev server al finalizar, ocurra lo que ocurra
   (incluido en Windows mediante `taskkill /T /F`).

Uso:

```bash
# Desde la raíz del monorepo:
make screenshots

# O directamente desde apps/web:
cd apps/web
npx tsx scripts/take_screenshots.ts
```

Requisitos previos (ejecutar una sola vez):

```bash
cd apps/web
pnpm install --no-frozen-lockfile
pnpm exec playwright install chromium
```

Las capturas resultantes son PNG comprimidos a 1440×900 (≈100–250 kB cada
una) y se versionan: el `.gitattributes` raíz marca `*.png` como binario.

## Convenciones

- Los scripts deben funcionar en Windows, macOS y Linux sin tocar `node_modules`.
- No deben dejar procesos huérfanos (siempre limpiar en `finally`).
- No deben modificar el código fuente del frontend (`apps/web/src/`); si una
  captura requiere ajustar una pantalla, hablar primero con los teammates de
  UI/animaciones.
