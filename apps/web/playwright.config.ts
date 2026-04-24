import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración Playwright para AtlasHabita.
 *
 * Define dos proyectos:
 *   - `chromium`: suite e2e por defecto (1280×720, perfil Desktop Chrome).
 *   - `screenshots`: proyecto dedicado a generar las capturas reales del
 *     producto que se publican en `docs/screenshots/`. Usa una resolución fija
 *     1440×900 (estándar de presentación TFG) y deshabilita reintentos para que
 *     las imágenes sean siempre deterministas.
 *
 * El servidor Vite se levanta automáticamente vía `webServer`. En CI se reusa
 * cuando la flag `reuseExistingServer` lo permite; en local, si ya hay un
 * `pnpm dev` corriendo, también se reaprovecha.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /screenshots\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'screenshots',
      testMatch: /screenshots\.spec\.ts$/,
      retries: 0,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        screenshot: 'off',
        video: 'off',
        trace: 'off',
      },
    },
  ],
  webServer: {
    command: 'pnpm dev --host 127.0.0.1 --port 5173',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
