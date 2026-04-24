/**
 * Hook TanStack Query sobre `/profiles`.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { listProfiles } from '../services/profiles';
import type { Profile } from '../services/types';

export const PROFILES_QUERY_KEY = ['profiles'] as const;

export function useProfiles(): UseQueryResult<readonly Profile[]> {
  return useQuery({
    queryKey: PROFILES_QUERY_KEY,
    queryFn: ({ signal }) => listProfiles(signal),
    staleTime: 5 * 60_000,
  });
}
