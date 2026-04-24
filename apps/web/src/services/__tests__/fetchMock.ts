/* eslint-disable no-undef -- RequestInfo/RequestInit son tipos DOM globales. */
/**
 * Utilidades de mock de `fetch` reutilizadas por los tests de servicios y hooks.
 *
 * Centralizamos el tipado para que `vi.fn()` exponga correctamente la firma
 * `(input, init)` y los tests puedan leer `mock.calls[i][0]` tipados.
 */

import { vi, type Mock } from 'vitest';

export type FetchArgs = readonly [input: RequestInfo | URL, init?: RequestInit];
export type FetchMock = Mock<(...args: FetchArgs) => Promise<Response>>;

/**
 * Instala un mock de `fetch` que siempre devuelve la respuesta indicada.
 */
export function installFetchMock(factory: (...args: FetchArgs) => Promise<Response>): FetchMock {
  const fetchFn = vi.fn(factory);
  globalThis.fetch = fetchFn as unknown as typeof fetch;
  return fetchFn;
}

/**
 * Construye una `Response` mínima con soporte `text()` para `apiFetch`.
 */
export function jsonResponse(
  body: unknown,
  init: { status?: number; ok?: boolean } = {}
): Response {
  const status = init.status ?? 200;
  const ok = init.ok ?? (status >= 200 && status < 300);
  return {
    ok,
    status,
    text: async () => (body === undefined ? '' : JSON.stringify(body)),
  } as unknown as Response;
}
