/* eslint-disable no-undef -- AbortSignal es tipo DOM global gestionado por TypeScript. */
/**
 * Cliente del endpoint `/rdf/export`.
 *
 * Permite obtener el grafo RDF asociado a un territorio en formato Turtle,
 * N-Triples o JSON-LD. La API es sincrónica y paginable por tamaño máximo
 * (`chunk_bytes`), lo que evita colapsar la UI al renderizar grafos grandes.
 */

import { apiFetch } from './http';

export type RdfFormat = 'turtle' | 'ntriples' | 'jsonld';

export interface RdfExportRequest {
  readonly territoryId: string;
  readonly format?: RdfFormat;
  /** Tamaño máximo de cada página en bytes. Por defecto 64 KiB. */
  readonly chunkBytes?: number;
  readonly page?: number;
}

export interface RdfExportPage {
  readonly territoryId: string;
  readonly format: RdfFormat;
  readonly content: string;
  readonly page: number;
  readonly totalPages: number;
  readonly totalBytes: number;
}

const DEFAULT_CHUNK_BYTES = 64 * 1024;

/**
 * Recupera una página del grafo RDF del territorio pedido.
 *
 * El cliente envía `POST /rdf/export` con el identificador y las opciones de
 * paginación. Devolvemos la respuesta tal cual para que la UI pueda pasarla a
 * `CodeBlock` sin transformaciones adicionales.
 */
export function exportRdf(request: RdfExportRequest, signal?: AbortSignal): Promise<RdfExportPage> {
  const body = {
    territory_id: request.territoryId,
    format: request.format ?? 'turtle',
    chunk_bytes: request.chunkBytes ?? DEFAULT_CHUNK_BYTES,
    page: request.page ?? 1,
  };
  return apiFetch<RdfExportPage>('/rdf/export', {
    method: 'POST',
    body,
    ...(signal ? { signal } : {}),
  });
}
