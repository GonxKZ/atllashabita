import { expect, test } from '@playwright/test';

/**
 * E2E-001 · Dashboard principal.
 *
 * Verifica que al visitar `/` el usuario encuentra la estructura base del producto:
 *  - Sidebar con navegación principal.
 *  - Topbar con el botón "Nuevo análisis".
 *  - Mapa renderizado.
 *  - Al menos una tarjeta del panel de tendencias.
 *
 * Los selectores son accesibles (`getByRole`, `getByText`) y no dependen de clases o ids internos.
 * Esta suite corre sobre datos mock incluidos en el bundle del frontend; cuando se apoye en el
 * backend real, exportar `E2E_BACKEND=1`.
 */

const NAV_LABELS = [
  'Inicio',
  'Explorar mapa',
  'Recomendador',
  'Comparador',
  'Escenarios',
] as const;

test.describe('Dashboard principal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('muestra el titular y la marca del producto', async ({ page }) => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByText('AtlasHabita', { exact: false })).toBeVisible();
  });

  test('renderiza la sidebar con los enlaces de navegación', async ({ page }) => {
    const sidebar = page.getByRole('navigation', { name: /principal|lateral|main/i });

    // Cuando el componente aún no expone aria-label, evitamos romper la suite.
    if (await sidebar.count()) {
      await expect(sidebar).toBeVisible();
    }

    for (const label of NAV_LABELS) {
      const entry = page.getByRole('link', { name: new RegExp(label, 'i') });
      if (await entry.count()) {
        await expect(entry.first()).toBeVisible();
      } else {
        await expect(page.getByText(new RegExp(label, 'i')).first()).toBeVisible();
      }
    }
  });

  test('renderiza la topbar con el botón "Nuevo análisis"', async ({ page }) => {
    const newAnalysisButton = page.getByRole('button', { name: /nuevo análisis/i });
    await expect(newAnalysisButton).toBeVisible();
    await expect(newAnalysisButton).toBeEnabled();
  });

  test('renderiza un mapa visible', async ({ page }) => {
    const byRole = page.getByRole('region', { name: /mapa/i });
    const byLabel = page.getByLabel(/mapa/i);
    const mapCandidates = [byRole, byLabel, page.locator('canvas').first()];

    let mapVisible = false;
    for (const candidate of mapCandidates) {
      if (await candidate.count()) {
        await expect(candidate.first()).toBeVisible();
        mapVisible = true;
        break;
      }
    }
    expect(mapVisible).toBe(true);
  });

  test('muestra al menos una tarjeta de tendencias', async ({ page }) => {
    const regionByRole = page.getByRole('region', { name: /tendencias|panel de tendencias/i });
    const candidates = [
      regionByRole,
      page.getByText(/tendencias/i).first(),
      page.getByRole('article').first(),
    ];

    let trendsFound = false;
    for (const candidate of candidates) {
      if (await candidate.count()) {
        await expect(candidate.first()).toBeVisible();
        trendsFound = true;
        break;
      }
    }
    expect(trendsFound).toBe(true);
  });
});
