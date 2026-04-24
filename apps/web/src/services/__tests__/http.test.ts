/* eslint-disable no-undef -- Response, Headers, RequestInit, AbortController y DOMException son tipos DOM globales. */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, apiFetch, toQueryString } from '../http';
import { installFetchMock, jsonResponse, type FetchMock } from './fetchMock';

function mockFetchResponse(response: Response): FetchMock {
  return installFetchMock(async () => response);
}

function mockFetchError(error: Error): FetchMock {
  return installFetchMock(async () => {
    throw error;
  });
}

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('antepone la base url /api y añade Accept application/json', async () => {
    const fetchFn = mockFetchResponse(jsonResponse({ ok: true }));
    await apiFetch('/profiles');
    expect(fetchFn).toHaveBeenCalledTimes(1);
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('/api/profiles');
    const headers = (init as RequestInit).headers as Headers;
    expect(headers.get('Accept')).toBe('application/json');
    expect((init as RequestInit).method).toBe('GET');
  });

  it('serializa body JSON y fuerza Content-Type', async () => {
    const fetchFn = mockFetchResponse(jsonResponse({ ok: true }));
    await apiFetch('/rankings/custom', { method: 'POST', body: { profile: 'explorer' } });
    const [, init] = fetchFn.mock.calls[0];
    const headers = (init as RequestInit).headers as Headers;
    expect(headers.get('Content-Type')).toBe('application/json');
    expect((init as RequestInit).body).toBe('{"profile":"explorer"}');
  });

  it('parsea JSON en respuestas 2xx', async () => {
    mockFetchResponse(jsonResponse({ value: 42 }));
    const result = await apiFetch<{ value: number }>('/anything');
    expect(result).toEqual({ value: 42 });
  });

  it('convierte respuestas de error en ApiError preservando code y status', async () => {
    mockFetchResponse(
      jsonResponse(
        { code: 'INVALID_PROFILE', message: 'Perfil desconocido', details: { profile: 'x' } },
        { status: 422 }
      )
    );
    await expect(apiFetch('/rankings')).rejects.toMatchObject({
      name: 'ApiError',
      code: 'INVALID_PROFILE',
      status: 422,
      message: 'Perfil desconocido',
      details: { profile: 'x' },
    });
  });

  it('convierte respuestas de error sin payload en ApiError UNKNOWN', async () => {
    mockFetchResponse(jsonResponse(undefined, { status: 500 }));
    const error = (await apiFetch('/anything').catch((err) => err)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.code).toBe('UNKNOWN');
    expect(error.status).toBe(500);
  });

  it('transforma errores de red en ApiError status 0', async () => {
    mockFetchError(new TypeError('network down'));
    const error = (await apiFetch('/anything').catch((err) => err)) as ApiError;
    expect(error).toBeInstanceOf(ApiError);
    expect(error.status).toBe(0);
    expect(error.message).toBe('network down');
  });

  it('propaga AbortError sin envolverlo', async () => {
    const abort = new DOMException('aborted', 'AbortError');
    mockFetchError(abort);
    await expect(apiFetch('/anything')).rejects.toBe(abort);
  });

  it('reenvía el AbortSignal al fetch subyacente', async () => {
    const fetchFn = mockFetchResponse(jsonResponse({ ok: true }));
    const controller = new AbortController();
    await apiFetch('/anything', { signal: controller.signal });
    const [, init] = fetchFn.mock.calls[0];
    expect((init as RequestInit).signal).toBe(controller.signal);
  });
});

describe('toQueryString', () => {
  it('omite claves undefined/null y concatena prefijo ?', () => {
    const qs = toQueryString({ a: 1, b: undefined, c: null, d: 'x' });
    expect(qs).toBe('?a=1&d=x');
  });
  it('devuelve cadena vacía cuando no hay parámetros', () => {
    expect(toQueryString({ a: undefined })).toBe('');
  });
});
