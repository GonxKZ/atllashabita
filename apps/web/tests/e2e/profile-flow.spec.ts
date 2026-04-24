import { expect, test, type Locator, type Page } from '@playwright/test';

/**
 * E2E-002 · Cambio de perfil.
 *
 * Verifica que al cambiar el perfil activo mediante los controles visibles, el contenido del
 * ranking (ranking card) se actualiza. No asume un selector concreto: prueba en orden un
 * combobox accesible, un grupo de botones de rol `radio` y un botón etiquetado con el nombre del
 * perfil. Si el flujo requiere backend real, marcar `E2E_BACKEND=1`.
 */

test.describe.configure({ mode: 'serial' });

test.describe('Flujo de perfil y ranking', () => {
  test('el cambio de perfil refleja un cambio en la ranking card', async ({ page }) => {
    test.skip(
      process.env.E2E_BACKEND !== '1' && process.env.E2E_PROFILE_FLOW !== '1',
      'Requiere backend disponible o datos mock del flujo de perfil. Exportar E2E_BACKEND=1.'
    );

    await page.goto('/');

    const ranking = await resolveRankingRegion(page);
    await expect(ranking).toBeVisible();

    const initialContent = (await ranking.innerText()).trim();
    expect(initialContent.length).toBeGreaterThan(0);

    const changed = await switchProfile(page);
    expect(changed, 'No se encontró un control visible para cambiar el perfil').toBe(true);

    await expect
      .poll(
        async () => {
          const current = (await ranking.innerText()).trim();
          return current !== initialContent && current.length > 0;
        },
        { timeout: 8_000 }
      )
      .toBe(true);
  });
});

async function resolveRankingRegion(page: Page): Promise<Locator> {
  const candidates: Locator[] = [
    page.getByRole('region', { name: /ranking/i }),
    page.getByRole('list', { name: /ranking|territorios/i }),
    page.getByTestId('ranking-card'),
    page.locator('[data-testid="ranking"]').first(),
  ];

  for (const candidate of candidates) {
    if (await candidate.count()) {
      return candidate.first();
    }
  }

  // Fallback: buscar un encabezado "Ranking" y devolver su contenedor próximo.
  const heading = page.getByRole('heading', { name: /ranking/i }).first();
  await expect(heading).toBeVisible();
  return heading.locator('xpath=ancestor::*[self::section or self::aside or self::main][1]');
}

async function switchProfile(page: Page): Promise<boolean> {
  const newProfiles = ['Familia', 'Estudiante', 'Emprendedor', 'Teletrabajo'];

  // 1) Combobox accesible.
  const combo = page.getByRole('combobox', { name: /perfil/i }).first();
  if (await combo.count()) {
    for (const target of newProfiles) {
      try {
        await combo.selectOption({ label: target });
        return true;
      } catch {
        // Si el combobox no tiene esa opción, probamos la siguiente.
      }
    }
  }

  // 2) Grupo de radios.
  const radioGroup = page.getByRole('radiogroup', { name: /perfil/i }).first();
  if (await radioGroup.count()) {
    for (const target of newProfiles) {
      const radio = radioGroup.getByRole('radio', { name: new RegExp(target, 'i') }).first();
      if (await radio.count()) {
        await radio.check({ force: true });
        return true;
      }
    }
  }

  // 3) Botones etiquetados con el perfil.
  for (const target of newProfiles) {
    const button = page.getByRole('button', { name: new RegExp(target, 'i') }).first();
    if (await button.count()) {
      await button.click();
      return true;
    }
  }

  return false;
}
