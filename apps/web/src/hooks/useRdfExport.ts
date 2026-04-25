/**
 * Hook para exportar el grafo RDF de un territorio con paginación lazy.
 *
 * El componente consumidor gestiona la paginación (`page` actual y
 * `onPageChange`). Cuando el usuario navega entre páginas, TanStack Query
 * mantiene las anteriores en caché para que `Anterior` sea instantáneo.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { ApiError } from '../services/http';
import { exportRdf, type RdfExportPage, type RdfExportRequest } from '../services/rdf_export';

/**
 * Clave estable que vive cuando el hook se llama con `null`. Comparte el
 * prefijo `'rdf', 'export'` para que cualquier `invalidateQueries(['rdf'])`
 * la limpie igual que las claves activas.
 */
const RDF_EXPORT_NOOP_KEY = ['rdf', 'export', 'noop'] as const;

type RdfExportQueryKey =
  | readonly ['rdf', 'export', string, RdfExportRequest['format'] | 'turtle', number]
  | typeof RDF_EXPORT_NOOP_KEY;

export function rdfExportKey(params: RdfExportRequest): RdfExportQueryKey {
  return [
    'rdf',
    'export',
    params.territoryId,
    params.format ?? 'turtle',
    params.page ?? 1,
  ] as const;
}

export function useRdfExport(
  params: RdfExportRequest | null,
  enabled = true
): UseQueryResult<RdfExportPage, ApiError> {
  // Sin doble cast: ambas ramas devuelven `RdfExportQueryKey` y TanStack
  // Query acepta cualquier tupla `readonly unknown[]` para `queryKey`.
  const queryKey: RdfExportQueryKey = params ? rdfExportKey(params) : RDF_EXPORT_NOOP_KEY;
  return useQuery<RdfExportPage, ApiError>({
    queryKey,
    queryFn: ({ signal }) => {
      if (!params) {
        return Promise.reject(new Error('territoryId is required'));
      }
      return exportRdf(params, signal);
    },
    enabled: Boolean(params) && enabled,
    staleTime: 60_000,
    placeholderData: (previous) => previous,
  });
}
