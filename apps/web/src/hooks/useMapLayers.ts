/**
 * Hooks para listar capas de mapa y descargar su GeoJSON.
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getMapLayer, listMapLayers } from '../services/map_layers';
import type { MapLayerPayload, MapLayerSummary, ProfileId } from '../services/types';

export const MAP_LAYERS_LIST_KEY = ['map', 'layers'] as const;

export function mapLayerKey(id: string, profile: ProfileId | undefined) {
  return ['map', 'layer', id, profile ?? 'default'] as const;
}

export function useMapLayers(): UseQueryResult<readonly MapLayerSummary[]> {
  return useQuery({
    queryKey: MAP_LAYERS_LIST_KEY,
    queryFn: ({ signal }) => listMapLayers(signal),
    staleTime: 10 * 60_000,
  });
}

export function useMapLayer(
  id: string | null | undefined,
  profile?: ProfileId
): UseQueryResult<MapLayerPayload> {
  return useQuery({
    queryKey: mapLayerKey(id ?? '', profile),
    queryFn: ({ signal }) => {
      if (!id) {
        return Promise.reject(new Error('map layer id is required'));
      }
      return getMapLayer(id, profile, signal);
    },
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  });
}
