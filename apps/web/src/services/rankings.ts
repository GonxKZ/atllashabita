/* eslint-disable no-undef -- AbortSignal es tipo DOM global gestionado por TypeScript. */
/**
 * Servicios para los recursos `/rankings` y `/rankings/custom`.
 */

import { apiFetch, toQueryString } from './http';
import type { RankingCustomBody, RankingQueryParams, RankingResponse } from './types';

const DEFAULT_LIMIT = 20;

/**
 * Recupera un ranking parametrizado (perfil + ámbito + límite).
 *
 * El contrato permite no enviar `limit`; mantenemos un valor por defecto
 * para que la UI tenga una cota razonable.
 */
export function computeRanking(
  params: RankingQueryParams,
  signal?: AbortSignal
): Promise<RankingResponse> {
  const qs = toQueryString({
    profile: params.profile,
    scope: params.scope,
    limit: params.limit ?? DEFAULT_LIMIT,
  });
  const init = signal ? { signal } : undefined;
  return apiFetch<RankingResponse>(`/rankings${qs}`, init);
}

/**
 * Ejecuta un ranking con configuración personalizada (pesos y filtros duros).
 */
export function computeRankingCustom(
  body: RankingCustomBody,
  signal?: AbortSignal
): Promise<RankingResponse> {
  return apiFetch<RankingResponse>('/rankings/custom', {
    method: 'POST',
    body,
    ...(signal ? { signal } : {}),
  });
}
