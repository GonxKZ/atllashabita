const path = require('node:path');
const { chromium, expect } = require('../../apps/web/node_modules/@playwright/test');

const baseUrl = process.env.ATLASHABITA_BASE_URL ?? 'https://atlashabita.vercel.app';
const screenshotPath =
  process.env.ATLASHABITA_SCREENSHOT_PATH ??
  path.resolve(__dirname, '../../docs/screenshots/vercel-atlashabita-home.png');

async function clickIfPresent(page, locator) {
  if ((await locator.count()) > 0) {
    await locator.first().click();
    return true;
  }
  return false;
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  let canvasCount = 0;

  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(message.text());
    }
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));

  try {
  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Descubre el mejor lugar para vivir en España' })).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator('input[placeholder*="Buscar"], input[placeholder*="Busca"]').first()).toBeVisible();

  canvasCount = await page.locator('canvas').count();
  if (canvasCount < 1) {
    throw new Error('No se ha renderizado ningún canvas de mapa.');
  }

  if (await clickIfPresent(page, page.getByRole('button', { name: /Feedback/i }))) {
    await page.getByLabel('Mensaje').fill('Validacion de despliegue Vercel automatizada.');
    await page.getByRole('button', { name: /Enviar feedback/i }).click();
    await expect(page.getByRole('status')).toContainText('Feedback registrado');
    await page.getByRole('button', { name: /Cancelar/i }).click();
  }
  if (await clickIfPresent(page, page.getByRole('button', { name: /Notificaciones/i }))) {
    await expect(page.getByRole('dialog')).toContainText('Notificaciones territoriales');
    await page.getByRole('dialog').getByLabel('Cerrar').click();
  }
  await clickIfPresent(page, page.getByRole('button', { name: /Buscar acciones|Ver atajos/i }));
  await page.keyboard.press('Escape').catch(() => undefined);

  await page.getByRole('button', { name: /Nuevo análisis/i }).click();
  await page.waitForURL('**/sparql', { timeout: 10000 });
  await expect(page.getByRole('heading', { name: /SPARQL|consultas/i })).toBeVisible({
    timeout: 10000,
  });

  await page.goto(`${baseUrl}/ranking`, { waitUntil: 'networkidle' });
  await expect(page.locator('h1', { hasText: 'Ranking nacional' })).toBeVisible({ timeout: 10000 });
  await page.goto(`${baseUrl}/comparador`, { waitUntil: 'networkidle' });
  await expect(page.locator('h1', { hasText: 'Comparador' })).toBeVisible({ timeout: 10000 });
  await page.goto(`${baseUrl}/escenarios`, { waitUntil: 'networkidle' });
  await expect(page.locator('h1', { hasText: 'Escenarios' })).toBeVisible({ timeout: 10000 });

  const email = `vercel.qa.${Date.now()}@atlashabita.test`;
  const password = 'AtlasHabita2026';

  await page.goto(`${baseUrl}/registro`, { waitUntil: 'networkidle' });
  await page.getByLabel(/Nombre completo/i).fill('QA Vercel AtlasHabita');
  await page.getByLabel(/Correo electrónico/i).fill(email);
  await page.getByLabel(/^Contraseña$/i).fill(password);
  await page.getByLabel(/Confirmar contraseña/i).fill(password);
  await page.getByRole('button', { name: /Crear cuenta/i }).click();
  await page.waitForURL('**/cuenta', { timeout: 10000 });
  await expect(page.getByText(email)).toBeVisible({ timeout: 10000 });

  await page.getByLabel('Mi cuenta', { exact: true }).getByRole('button', { name: 'Cerrar sesión' }).click();
  await page.waitForURL('**/login', { timeout: 10000 }).catch(() => undefined);
  await page.goto(`${baseUrl}/login?next=/cuenta`, { waitUntil: 'networkidle' });
  await page.getByLabel(/Correo electrónico/i).fill(email);
  await page.getByLabel(/^Contraseña$/i).fill(password);
  await page.getByRole('button', { name: /Entrar|Iniciar/i }).click();
  await page.waitForURL('**/cuenta', { timeout: 10000 });
  await expect(page.getByText(email)).toBeVisible({ timeout: 10000 });

  await page.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: 'Descubre el mejor lugar para vivir en España' })).toBeVisible({
    timeout: 20000,
  });
  await page.screenshot({ path: screenshotPath, fullPage: false });
  } finally {
    await browser.close();
  }

  if (consoleErrors.length > 0 || pageErrors.length > 0) {
    throw new Error(
      JSON.stringify(
        {
          consoleErrors,
          pageErrors,
        },
        null,
        2
      )
    );
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        baseUrl,
        canvasCount,
        screenshotPath,
      },
      null,
      2
    )
  );
}

main().catch(async (error) => {
  console.error(error);
  process.exitCode = 1;
});
