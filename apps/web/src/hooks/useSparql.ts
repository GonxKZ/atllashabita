/**
 * Hooks TanStack Query para interactuar con el panel SPARQL.
 *
 * - `useSparqlCatalog()` recupera el catálogo de consultas disponibles.
 * - `useSparqlMutation()` ejecuta una consulta con bindings y expone estado
 *   de carga/error tipado (`ApiError`).
 *
 * La caché del catálogo se mantiene larga (5 min) porque cambia con el
 * despliegue, no con la navegación del usuario.
 */

import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { ApiError } from '../services/http';
import {
  executeSparql,
  fetchSparqlCatalog,
  type SparqlCatalog,
  type SparqlExecuteRequest,
  type SparqlResult,
} from '../services/sparql';

export const SPARQL_CATALOG_KEY = ['sparql', 'catalog'] as const;

export function useSparqlCatalog(): UseQueryResult<SparqlCatalog, ApiError> {
  return useQuery<SparqlCatalog, ApiError>({
    queryKey: SPARQL_CATALOG_KEY,
    queryFn: ({ signal }) => fetchSparqlCatalog(signal),
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });
}

export function useSparqlMutation(): UseMutationResult<
  SparqlResult,
  ApiError,
  SparqlExecuteRequest
> {
  return useMutation<SparqlResult, ApiError, SparqlExecuteRequest>({
    mutationKey: ['sparql', 'execute'],
    mutationFn: (request) => executeSparql(request),
  });
}
