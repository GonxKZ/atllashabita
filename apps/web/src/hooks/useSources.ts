/**
 * Hooks para consumir el inspector de fuentes (RF-013).
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getSource, listSources } from '../services/sources';
import type { SourceDetail, SourceSummary } from '../services/types';

export const SOURCES_LIST_KEY = ['sources'] as const;

export function sourceDetailKey(id: string | null | undefined) {
  return ['sources', 'detail', id ?? null] as const;
}

export function useSources(): UseQueryResult<readonly SourceSummary[]> {
  return useQuery({
    queryKey: SOURCES_LIST_KEY,
    queryFn: ({ signal }) => listSources(signal),
    staleTime: 10 * 60_000,
  });
}

export function useSource(id: string | null | undefined): UseQueryResult<SourceDetail> {
  return useQuery({
    queryKey: sourceDetailKey(id),
    queryFn: ({ signal }) => {
      if (!id) {
        return Promise.reject(new Error('source id is required'));
      }
      return getSource(id, signal);
    },
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
}
