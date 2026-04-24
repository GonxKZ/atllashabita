/* eslint-disable no-undef -- AbortSignal es tipo DOM global gestionado por TypeScript. */
/**
 * Servicios para los recursos `/map/layers`.
 */

import { apiFetch, toQueryString } from './http';
import type { MapLayerPayload, MapLayerSummary, ProfileId } from './types';

/** Lista las capas de mapa disponibles (sin payload GeoJSON). */
export function listMapLayers(signal?: AbortSignal): Promise<readonly MapLayerSummary[]> {
  const init = signal ? { signal } : undefined;
  return apiFetch<readonly MapLayerSummary[]>('/map/layers', init);
}

/**
 * Devuelve el payload GeoJSON de una capa.
 *
 * Cuando se suministra `profile`, el backend resuelve los valores de score
 * con los pesos por defecto del perfil para acelerar el render.
 */
export function getMapLayer(
  id: string,
  profile?: ProfileId,
  signal?: AbortSignal
): Promise<MapLayerPayload> {
  const qs = toQueryString({ profile });
  const init = signal ? { signal } : undefined;
  return apiFetch<MapLayerPayload>(`/map/layers/${encodeURIComponent(id)}${qs}`, init);
}
