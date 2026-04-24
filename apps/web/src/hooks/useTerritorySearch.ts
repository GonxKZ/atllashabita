/**
 * Hook de búsqueda de territorios por texto.
 *
 * Se inhabilita automáticamente cuando la cadena es más corta que
 * `MIN_QUERY_LENGTH` para evitar requests inútiles mientras el usuario
 * teclea (RF-024).
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { searchTerritories } from '../services/territories';
import type { TerritorySearchResult } from '../services/types';

const MIN_QUERY_LENGTH = 2;
const DEFAULT_LIMIT = 10;

export function territorySearchKey(query: string, limit: number) {
  return ['territories', 'search', query, limit] as const;
}

export function useTerritorySearch(
  query: string,
  limit: number = DEFAULT_LIMIT
): UseQueryResult<readonly TerritorySearchResult[]> {
  const normalized = query.trim();
  const enabled = normalized.length >= MIN_QUERY_LENGTH;
  return useQuery({
    queryKey: territorySearchKey(normalized, limit),
    queryFn: ({ signal }) => searchTerritories(normalized, limit, signal),
    enabled,
    staleTime: 60_000,
  });
}
