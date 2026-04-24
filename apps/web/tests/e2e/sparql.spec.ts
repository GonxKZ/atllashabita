import { expect, test } from '@playwright/test';

/**
 * E2E · Panel SPARQL.
 *
 * Abre `/sparql`, comprueba que el catálogo local se expone cuando no hay
 * API, ejecuta la consulta por defecto y verifica que aparecen resultados en
 * la tabla.
 */

test.describe('Panel SPARQL', () => {
  test('muestra el catálogo y ejecuta la consulta por defecto', async ({ page }) => {
    await page.goto('/sparql');

    const selector = page.getByTestId('sparql-selector');
    await expect(selector).toBeVisible();

    const runButton = page.getByTestId('sparql-run');
    await expect(runButton).toBeEnabled();
    await runButton.click();

    await expect(page.getByRole('table')).toBeVisible();
    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
  });
});
