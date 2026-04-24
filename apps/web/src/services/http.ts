/* eslint-disable no-undef -- tipos DOM globales (Response, Headers, RequestInit, AbortSignal, DOMException) resueltos por TypeScript. */
/**
 * Cliente HTTP tipado para la API de AtlasHabita.
 *
 * Expone `apiFetch` como único punto de entrada para cualquier llamada REST.
 * Se encarga de:
 *   - anteponer la base URL configurable (`/api` por defecto, proxy en Vite);
 *   - añadir cabeceras mínimas (`Accept: application/json`);
 *   - parsear la respuesta JSON incluso ante errores;
 *   - normalizar errores en la clase `ApiError` para consumo uniforme en UI.
 */

import type { ApiErrorCode, ErrorResponse } from './types';

/** Base URL configurable mediante variable de entorno de Vite. */
const DEFAULT_BASE_URL = '/api';

function resolveBaseUrl(): string {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env;
  const configured = env?.VITE_API_BASE_URL?.trim();
  if (configured && configured.length > 0) {
    return configured.replace(/\/$/, '');
  }
  return DEFAULT_BASE_URL;
}

/**
 * Error tipado producido por `apiFetch`. Permite al código UI distinguir
 * fallos conocidos (perfil inválido, sin datos, etc.) de caídas de red.
 */
export class ApiError extends Error {
  public readonly code: ApiErrorCode | string;
  public readonly status: number;
  public readonly details?: Record<string, unknown>;

  constructor(params: {
    code: ApiErrorCode | string;
    message: string;
    status: number;
    details?: Record<string, unknown>;
  }) {
    super(params.message);
    this.name = 'ApiError';
    this.code = params.code;
    this.status = params.status;
    if (params.details !== undefined) {
      this.details = params.details;
    }
  }
}

export interface ApiFetchOptions extends Omit<RequestInit, 'body'> {
  /** Payload JSON que se serializará automáticamente. */
  readonly body?: unknown;
  /** Permite cancelar la petición desde fuera. */
  readonly signal?: AbortSignal;
}

function buildHeaders(init?: ApiFetchOptions): Headers {
  const headers = new Headers(init?.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  if (init?.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return headers;
}

function buildUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) {
    return path;
  }
  const base = resolveBaseUrl();
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalized}`;
}

async function parseJsonSafe<T>(response: Response): Promise<T | null> {
  const text = await response.text();
  if (text.length === 0) {
    return null;
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

function toErrorResponse(payload: unknown, status: number): ErrorResponse {
  if (payload && typeof payload === 'object' && 'code' in payload && 'message' in payload) {
    const raw = payload as Partial<ErrorResponse>;
    return {
      code: typeof raw.code === 'string' ? raw.code : 'UNKNOWN',
      message: typeof raw.message === 'string' ? raw.message : `HTTP ${status}`,
      details: raw.details,
    };
  }
  return {
    code: 'UNKNOWN',
    message: `HTTP ${status}`,
  };
}

/**
 * Realiza una petición HTTP a la API y devuelve el JSON parseado.
 *
 * @throws {ApiError} cuando la respuesta no es `ok` o la red falla.
 */
export async function apiFetch<T>(path: string, init: ApiFetchOptions = {}): Promise<T> {
  const { body, signal, method, ...rest } = init;
  const headers = buildHeaders(init);

  const requestInit: RequestInit = {
    ...rest,
    method: method ?? (body !== undefined ? 'POST' : 'GET'),
    headers,
  };
  if (body !== undefined) {
    requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }
  if (signal) {
    requestInit.signal = signal;
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path), requestInit);
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      throw cause;
    }
    const message = cause instanceof Error ? cause.message : 'Network error';
    throw new ApiError({ code: 'UNKNOWN', message, status: 0 });
  }

  if (!response.ok) {
    const payload = await parseJsonSafe<unknown>(response);
    const normalized = toErrorResponse(payload, response.status);
    throw new ApiError({
      code: normalized.code,
      message: normalized.message,
      status: response.status,
      ...(normalized.details !== undefined ? { details: normalized.details } : {}),
    });
  }

  const parsed = await parseJsonSafe<T>(response);
  if (parsed === null) {
    // Respuestas 204/empty body no son esperables en los endpoints tipados
    // que consume este cliente; si ocurre devolvemos un objeto vacío con cast.
    return {} as T;
  }
  return parsed;
}

/**
 * Serializa un objeto en query string, omitiendo claves con `undefined` o `null`.
 */
export function toQueryString(
  params: Record<string, string | number | boolean | undefined | null>
): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    search.set(key, String(value));
  }
  const qs = search.toString();
  return qs.length > 0 ? `?${qs}` : '';
}
