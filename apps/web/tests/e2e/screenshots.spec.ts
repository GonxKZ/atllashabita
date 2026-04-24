/**
 * Generador de capturas reales del producto.
 *
 * Este spec NO valida nada del producto: su única responsabilidad es navegar
 * por las pantallas principales y volcar PNGs en `docs/screenshots/`. Forma
 * parte del proyecto Playwright `screenshots` (ver `playwright.config.ts`),
 * que fija un viewport 1440×900 para producir imágenes consistentes entre
 * ejecuciones.
 *
 * Las capturas se utilizan en el README, en la memoria académica y en
 * presentaciones del TFG. Se almacenan en formato PNG comprimido y se
 * versionan: el `.gitattributes` raíz ya marca `*.png` como binario.
 */

import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';
import { existsSync, mkdirSync } from 'node:fs';
import process from 'node:process';

/**
 * Carpeta destino. Resuelta relativa a la raíz del monorepo. Playwright se
 * ejecuta desde `apps/web/`, así que subimos dos niveles y entramos en
 * `docs/screenshots/`.
 */
const SCREENSHOTS_DIR = path.resolve(process.cwd(), '..', '..', 'docs', 'screenshots');

if (!existsSync(SCREENSHOTS_DIR)) {
  mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

interface ShotTarget {
  /** Nombre de fichero sin extensión, en kebab-case. */
  readonly name: string;
  /** Ruta dentro de la app a la que se navega. */
  readonly path: string;
  /** Espera adicional para garantizar que el contenido está pintado. */
  readonly waitFor: (page: Page) => Promise<void>;
  /**
   * Selector que se forzará a estar visible en pantalla antes de capturar
   * (vía `scrollIntoViewIfNeeded`). Necesario porque la `DashboardShell` se
   * monta como hermano del `<Outlet />` y empuja el contenido de cada ruta
   * por debajo del primer pliegue de un viewport 1440×900.
   *
   * Si es `null`, se hace scroll al inicio para asegurar que la captura
   * empieza en el origen del documento.
   */
  readonly scrollTo: string | null;
}

/**
 * Suprime errores ruidosos esperados (p. ej. tiles del mapa, llamadas a la API
 * que no está corriendo o avisos de desarrollo de React relativos a
 * componentes que no son responsabilidad de este spec) para mantener la
 * salida limpia. El test sigue fallando si la consola emite un error que no
 * encaja con ninguno de estos patrones.
 *
 * Importante: este spec no debe modificar el código del frontend. Cuando los
 * teammates de UI/animaciones cierren las advertencias en `develop`, los
 * patrones se eliminarán de aquí.
 */
const IGNORED_ERROR_PATTERNS: readonly RegExp[] = [
  /favicon/i,
  /Failed to load resource/i,
  /status of 5\d\d/i,
  /status of 4\d\d/i,
  /Failed to fetch/i,
  /NetworkError/i,
  /AbortError/i,
  /maplibre/i,
  /tile/i,
  /WebGL/i,
  /Canvas2D/i,
  /cannot contain a nested/i,
  /cannot be a descendant of/i,
  /hydration error/i,
  /validateDOMNesting/i,
  /<button>/i,
  /Warning:/i,
];

function shouldIgnore(message: string): boolean {
  return IGNORED_ERROR_PATTERNS.some((pattern) => pattern.test(message));
}

const TARGETS: readonly ShotTarget[] = [
  {
    name: 'dashboard',
    path: '/',
    scrollTo: null,
    waitFor: async (page) => {
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      // El hero contiene la marca AtlasHabita; esperar a que aparezca asegura
      // que el bundle del shell está montado antes de capturar.
      await expect(page.getByText(/AtlasHabita/i).first()).toBeVisible();
    },
  },
  {
    name: 'ranking',
    path: '/ranking',
    scrollTo: '[data-route="ranking"]',
    waitFor: async (page) => {
      await expect(page.getByRole('list', { name: 'Lista de municipios' })).toBeVisible();
      // Asegura que al menos una fila del ranking está pintada antes de capturar.
      await expect(page.locator('[data-testid^="ranking-item-"]').first()).toBeVisible();
    },
  },
  {
    name: 'territory',
    path: '/territorio/41091',
    scrollTo: '[data-route="territorio"]',
    waitFor: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: 'Sevilla' })).toBeVisible();
      await expect(page.getByRole('table')).toBeVisible();
    },
  },
  {
    name: 'sparql',
    path: '/sparql',
    scrollTo: '[data-route="sparql"]',
    waitFor: async (page) => {
      await expect(page.getByTestId('sparql-selector')).toBeVisible();
      const runButton = page.getByTestId('sparql-run');
      await expect(runButton).toBeEnabled();
      await runButton.click();
      await expect(page.getByRole('table')).toBeVisible();
    },
  },
  {
    name: 'territory-rdf-modal',
    path: '/territorio/41091',
    scrollTo: '[data-route="territorio"]',
    waitFor: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: 'Sevilla' })).toBeVisible();
      await page.getByTestId('open-rdf-modal').click();
      await expect(page.getByRole('dialog', { name: /Grafo RDF · Sevilla/i })).toBeVisible();
    },
  },
  {
    name: 'ranking-page-2',
    path: '/ranking',
    scrollTo: '[data-route="ranking"]',
    waitFor: async (page) => {
      await expect(page.getByRole('list', { name: 'Lista de municipios' })).toBeVisible();
      await page.getByRole('button', { name: 'Página siguiente' }).click();
      await expect(page.getByRole('list', { name: 'Lista de municipios' })).toBeVisible();
    },
  },
];

test.describe('Capturas reales del producto', () => {
  test.describe.configure({ mode: 'serial' });

  for (const target of TARGETS) {
    test(`captura ${target.name}`, async ({ page }) => {
      const consoleErrors: string[] = [];
      page.on('console', (message) => {
        if (message.type() !== 'error') return;
        const text = message.text();
        if (!shouldIgnore(text)) {
          consoleErrors.push(text);
        }
      });
      page.on('pageerror', (error) => {
        const text = error.message;
        if (!shouldIgnore(text)) {
          consoleErrors.push(text);
        }
      });

      await page.goto(target.path);
      await page.waitForLoadState('networkidle');
      await target.waitFor(page);

      if (target.scrollTo) {
        // Llevamos el contenedor de la ruta al inicio del viewport para que el
        // recorte 1440×900 muestre el contenido específico de la pantalla.
        await page
          .locator(target.scrollTo)
          .first()
          .evaluate((node) => {
            node.scrollIntoView({ block: 'start' });
          });
      } else {
        await page.evaluate(() => {
          window.scrollTo(0, 0);
        });
      }

      // Pequeño settle para asegurar que las imágenes/iconos se han pintado.
      await page.waitForTimeout(500);

      const filename = path.join(SCREENSHOTS_DIR, `${target.name}.png`);
      await page.screenshot({
        path: filename,
        fullPage: false,
        animations: 'disabled',
        caret: 'hide',
        type: 'png',
      });

      expect(consoleErrors, consoleErrors.join('\n')).toEqual([]);
    });
  }
});
