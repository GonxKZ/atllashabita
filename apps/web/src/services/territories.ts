/* eslint-disable no-undef -- AbortSignal es tipo DOM global gestionado por TypeScript. */
/**
 * Servicios para los recursos `/territories/*`.
 *
 * Agrupa búsqueda, detalle e indicadores de una entidad territorial.
 */

import { apiFetch, toQueryString } from './http';
import type { TerritoryDetail, TerritoryIndicator, TerritorySearchResult } from './types';

const DEFAULT_SEARCH_LIMIT = 10;

/** Busca territorios por nombre (tolerante a tildes y mayúsculas). */
export function searchTerritories(
  query: string,
  limit: number = DEFAULT_SEARCH_LIMIT,
  signal?: AbortSignal
): Promise<readonly TerritorySearchResult[]> {
  const qs = toQueryString({ q: query, limit });
  const init = signal ? { signal } : undefined;
  return apiFetch<readonly TerritorySearchResult[]>(`/territories/search${qs}`, init);
}

/** Recupera la ficha territorial completa por identificador estable. */
export function getTerritory(id: string, signal?: AbortSignal): Promise<TerritoryDetail> {
  const init = signal ? { signal } : undefined;
  return apiFetch<TerritoryDetail>(`/territories/${encodeURIComponent(id)}`, init);
}

/** Devuelve la lista de indicadores asociados al territorio. */
export function getTerritoryIndicators(
  id: string,
  signal?: AbortSignal
): Promise<readonly TerritoryIndicator[]> {
  const init = signal ? { signal } : undefined;
  return apiFetch<readonly TerritoryIndicator[]>(
    `/territories/${encodeURIComponent(id)}/indicators`,
    init
  );
}
