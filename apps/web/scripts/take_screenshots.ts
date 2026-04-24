#!/usr/bin/env tsx
/**
 * CLI para regenerar las capturas reales de AtlasHabita.
 *
 * Orquesta el ciclo completo en un solo comando:
 *   1. Levanta `pnpm dev` en background apuntando a http://127.0.0.1:5173.
 *   2. Espera a que el servidor responda (polling con timeout).
 *   3. Ejecuta el proyecto Playwright `screenshots`.
 *   4. Mata el proceso del dev server pase lo que pase (éxito o fallo).
 *
 * Se invoca con `npx tsx apps/web/scripts/take_screenshots.ts` o vía
 * `make screenshots` desde la raíz. No depende de variables de entorno
 * adicionales: el comportamiento por defecto es totalmente local.
 */

import { spawn, type ChildProcess } from 'node:child_process';
import { setTimeout as wait } from 'node:timers/promises';
import process from 'node:process';

const HOST = '127.0.0.1';
const PORT = 5173;
const READY_URL = `http://${HOST}:${PORT}/`;
const READY_TIMEOUT_MS = 60_000;
const POLL_INTERVAL_MS = 500;

/**
 * Polling simple del endpoint raíz del dev server.
 *
 * Usamos `fetch` (Node 22+) y consideramos "listo" cualquier respuesta HTTP,
 * ya que basta con que Vite haya empezado a servir HTML para que Playwright
 * pueda navegar.
 */
async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  let lastError: unknown = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url, { method: 'GET' });
      if (response.ok || response.status < 500) {
        return;
      }
    } catch (error) {
      lastError = error;
    }
    await wait(POLL_INTERVAL_MS);
  }
  throw new Error(
    `El servidor de Vite no respondió en ${timeoutMs}ms (${url}). Último error: ${String(lastError)}`
  );
}

function spawnDevServer(): ChildProcess {
  // `shell: true` permite resolver `pnpm` desde el PATH en Windows y POSIX.
  const child = spawn('pnpm', ['dev', '--host', HOST, '--port', String(PORT)], {
    shell: true,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, FORCE_COLOR: '0' },
  });

  child.stdout?.on('data', (chunk) => {
    process.stdout.write(`[dev] ${chunk}`);
  });
  child.stderr?.on('data', (chunk) => {
    process.stderr.write(`[dev] ${chunk}`);
  });

  return child;
}

function killDevServer(child: ChildProcess): Promise<void> {
  return new Promise((resolve) => {
    if (child.exitCode !== null || child.killed) {
      resolve();
      return;
    }
    const onExit = () => resolve();
    child.once('exit', onExit);

    if (process.platform === 'win32' && typeof child.pid === 'number') {
      // En Windows `child.kill` no propaga señales a procesos hijos cuando se
      // usa `shell: true`. Usamos `taskkill /T` para matar el árbol completo.
      const killer = spawn('taskkill', ['/PID', String(child.pid), '/T', '/F'], {
        shell: true,
        stdio: 'ignore',
      });
      killer.once('exit', () => {
        if (!child.killed && child.exitCode === null) {
          child.kill('SIGKILL');
        }
      });
    } else {
      child.kill('SIGTERM');
      // Failsafe a los 5s.
      setTimeout(() => {
        if (child.exitCode === null) {
          child.kill('SIGKILL');
        }
      }, 5_000).unref();
    }
  });
}

function runPlaywright(): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(
      'pnpm',
      ['exec', 'playwright', 'test', '--project=screenshots', 'tests/e2e/screenshots.spec.ts'],
      {
        shell: true,
        stdio: 'inherit',
        env: {
          ...process.env,
        },
      }
    );
    child.once('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Playwright terminó con código ${code ?? 'null'}.`));
      }
    });
    child.once('error', reject);
  });
}

async function main(): Promise<void> {
  console.log(`[screenshots] arrancando dev server en ${READY_URL}…`);
  const dev = spawnDevServer();

  let exitCode = 0;
  try {
    await waitForServer(READY_URL, READY_TIMEOUT_MS);
    console.log('[screenshots] dev server listo, ejecutando Playwright…');
    await runPlaywright();
    console.log('[screenshots] capturas generadas en docs/screenshots/');
  } catch (error) {
    console.error('[screenshots] fallo al generar capturas:', error);
    exitCode = 1;
  } finally {
    console.log('[screenshots] deteniendo dev server…');
    await killDevServer(dev);
  }
  process.exit(exitCode);
}

void main();
