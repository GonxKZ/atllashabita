import { expect, test } from '@playwright/test';

/**
 * E2E · Ranking nacional.
 *
 * Verifica que en `/ranking` se renderiza la lista paginada, los filtros duros
 * y el paginador accesible. La prueba no depende del backend: el dataset
 * nacional mock vive en el bundle del frontend.
 */

test.describe('Ranking nacional', () => {
  test('renderiza la lista de municipios y el paginador', async ({ page }) => {
    await page.goto('/ranking');

    await expect(page.getByRole('region', { name: /ranking nacional/i })).toBeVisible();
    const list = page.getByRole('list', { name: 'Lista de municipios' });
    await expect(list).toBeVisible();

    const items = list.locator('li');
    await expect(items.first()).toBeVisible();
    const count = await items.count();
    expect(count).toBeLessThanOrEqual(20);
    expect(count).toBeGreaterThan(0);

    await expect(
      page.getByRole('navigation', { name: /paginación del ranking/i })
    ).toBeVisible();
  });

  test('avanza a la página 2 al pulsar el botón siguiente', async ({ page }) => {
    await page.goto('/ranking');

    const firstItemBefore = await page
      .locator('[data-testid^="ranking-item-"]')
      .first()
      .getAttribute('data-testid');
    await page.getByRole('button', { name: 'Página siguiente' }).click();
    const firstItemAfter = await page
      .locator('[data-testid^="ranking-item-"]')
      .first()
      .getAttribute('data-testid');
    expect(firstItemAfter).not.toBe(firstItemBefore);
  });
});
