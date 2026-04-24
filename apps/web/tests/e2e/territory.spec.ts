import { expect, test } from '@playwright/test';

/**
 * E2E · Ficha territorial.
 *
 * Navega a `/territorio/:id` y valida que se muestran cabecera, tabla de
 * indicadores, chips de procedencia y el botón "Ver RDF" que abre el modal.
 */

test.describe('Ficha territorial', () => {
  test('renderiza indicadores con chips de procedencia', async ({ page }) => {
    await page.goto('/territorio/28079');

    await expect(page.getByRole('heading', { level: 1, name: 'Madrid' })).toBeVisible();

    const table = page.getByRole('table');
    await expect(table).toBeVisible();

    // Al menos un chip de procedencia (botón con el nombre de la fuente INE/AEMET/MITECO…)
    const provChip = page.locator('[data-prov-chip]').first();
    await expect(provChip).toBeVisible();
  });

  test('abre el modal con el RDF Turtle paginado', async ({ page }) => {
    await page.goto('/territorio/41091');
    await page.getByTestId('open-rdf-modal').click();

    const dialog = page.getByRole('dialog', { name: /Grafo RDF · Sevilla/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('region', { name: /Turtle de Sevilla/i })).toBeVisible();
  });
});
