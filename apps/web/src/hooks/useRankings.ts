/**
 * Hooks de rankings parametrizados y personalizados.
 *
 * La clave de caché incluye perfil + ámbito + hash de pesos para garantizar
 * invalidación correcta cuando el usuario mueve sliders.
 */

import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from '@tanstack/react-query';
import { computeRanking, computeRankingCustom } from '../services/rankings';
import type { RankingCustomBody, RankingQueryParams, RankingResponse } from '../services/types';
import { hashWeightOverrides, type WeightOverrides } from '../state/filters';

export function rankingKey(params: RankingQueryParams, weightsHash: string) {
  return ['rankings', params.profile, params.scope, params.limit ?? null, weightsHash] as const;
}

/**
 * Recupera el ranking por defecto del perfil/ámbito.
 *
 * `weightOverrides` sólo se usa para construir la clave de caché: el endpoint
 * GET no los acepta. Cuando el usuario edita pesos, `useCustomRanking` asume
 * el cálculo.
 */
export function useRankings(
  params: RankingQueryParams,
  weightOverrides: WeightOverrides = {}
): UseQueryResult<RankingResponse> {
  const weightsHash = hashWeightOverrides(weightOverrides);
  return useQuery({
    queryKey: rankingKey(params, weightsHash),
    queryFn: ({ signal }) => computeRanking(params, signal),
    staleTime: 60_000,
  });
}

/** Mutation para rankings con pesos y filtros duros personalizados. */
export function useCustomRanking(): UseMutationResult<RankingResponse, Error, RankingCustomBody> {
  return useMutation({
    mutationKey: ['rankings', 'custom'],
    mutationFn: (body: RankingCustomBody) => computeRankingCustom(body),
  });
}
