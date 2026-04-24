/* eslint-disable no-undef -- AbortSignal es tipo DOM global gestionado por TypeScript. */
/**
 * Cliente tipado para los recursos `/sparql` y `/sparql/catalog`.
 *
 * El backend (Fase C) acepta:
 *   - `GET /sparql/catalog` con el catálogo de consultas predefinidas.
 *   - `POST /sparql` con `{ id, bindings }` para ejecutar una consulta con
 *     parámetros seguros. También admite `{ query, bindings }` para consultas
 *     ad-hoc autorizadas.
 *
 * Los contratos se escriben aquí porque el OpenAPI de Fase C todavía no está
 * consolidado; cuando se genere, estos tipos pueden delegarse a un artefacto
 * compilado.
 */

import { apiFetch } from './http';

/** Identificador canónico de una consulta del catálogo (p.ej. `top-by-score`). */
export type SparqlQueryId = string;

export type SparqlBindingValue = string | number | boolean;

export interface SparqlBindingSchema {
  readonly name: string;
  readonly label: string;
  readonly type: 'string' | 'integer' | 'number' | 'boolean' | 'iri';
  readonly required?: boolean;
  readonly description?: string;
  readonly default?: SparqlBindingValue;
  readonly example?: SparqlBindingValue;
}

export interface SparqlCatalogEntry {
  readonly id: SparqlQueryId;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly bindings: readonly SparqlBindingSchema[];
  readonly query: string;
}

export interface SparqlCatalog {
  readonly version: string;
  readonly entries: readonly SparqlCatalogEntry[];
}

export interface SparqlExecuteRequest {
  readonly id: SparqlQueryId;
  readonly bindings?: Record<string, SparqlBindingValue>;
}

export interface SparqlResultRow {
  readonly [variable: string]: SparqlBindingValue | null;
}

export interface SparqlResult {
  readonly id: SparqlQueryId;
  readonly variables: readonly string[];
  readonly rows: readonly SparqlResultRow[];
  readonly total: number;
  readonly took_ms: number;
}

/** Recupera el catálogo de consultas SPARQL disponibles para la UI técnica. */
export function fetchSparqlCatalog(signal?: AbortSignal): Promise<SparqlCatalog> {
  const init = signal ? { signal } : undefined;
  return apiFetch<SparqlCatalog>('/sparql/catalog', init);
}

/** Ejecuta una consulta del catálogo con los bindings indicados. */
export function executeSparql(
  request: SparqlExecuteRequest,
  signal?: AbortSignal
): Promise<SparqlResult> {
  return apiFetch<SparqlResult>('/sparql', {
    method: 'POST',
    body: request,
    ...(signal ? { signal } : {}),
  });
}
