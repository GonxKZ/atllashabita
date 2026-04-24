/**
 * Hooks para la ficha territorial y sus indicadores.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getTerritory, getTerritoryIndicators } from '../services/territories';
import type { TerritoryDetail, TerritoryIndicator } from '../services/types';

export function territoryDetailKey(id: string | null | undefined) {
  return ['territories', 'detail', id ?? null] as const;
}

export function territoryIndicatorsKey(id: string | null | undefined) {
  return ['territories', 'indicators', id ?? null] as const;
}

export function useTerritoryDetail(id: string | null | undefined): UseQueryResult<TerritoryDetail> {
  return useQuery({
    queryKey: territoryDetailKey(id),
    queryFn: ({ signal }) => {
      if (!id) {
        return Promise.reject(new Error('territory id is required'));
      }
      return getTerritory(id, signal);
    },
    enabled: Boolean(id),
    staleTime: 2 * 60_000,
  });
}

export function useTerritoryIndicators(
  id: string | null | undefined
): UseQueryResult<readonly TerritoryIndicator[]> {
  return useQuery({
    queryKey: territoryIndicatorsKey(id),
    queryFn: ({ signal }) => {
      if (!id) {
        return Promise.reject(new Error('territory id is required'));
      }
      return getTerritoryIndicators(id, signal);
    },
    enabled: Boolean(id),
    staleTime: 2 * 60_000,
  });
}
