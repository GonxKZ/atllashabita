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

export function rdfExportKey(params: RdfExportRequest) {
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
  return useQuery<RdfExportPage, ApiError>({
    queryKey: params
      ? rdfExportKey(params)
      : (['rdf', 'export', 'noop'] as unknown as ReturnType<typeof rdfExportKey>),
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
