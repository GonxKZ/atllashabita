/**
 * Página `/mapa`: vista a página completa del mapa interactivo multi-métrica.
 *
 * Reutiliza el mismo componente `SpainMap` que monta el dashboard, pero con
 * altura mayor y un panel lateral con `LayerSwitcher`. El estado de la capa
 * activa se sincroniza con el store global (`useMapLayerStore`), por lo que
 * la elección que el usuario hizo en la home se mantiene al navegar a esta
 * ruta y viceversa.
 */

import { useMemo } from 'react';

import { SpainMap } from './SpainMap';
import { LayerSwitcher } from './layers';
import { resolveLayer, type MapLayerId } from './layers/catalog';
import { useMapLayerStore } from '@/state/mapLayer';
import { toEnrichedMapPoints } from '@/data/national_mock';

export function MapPage() {
  const activeLayerId = useMapLayerStore((state) => state.activeLayerId);
  const setActiveLayer = useMapLayerStore((state) => state.setActiveLayer);

  // Memoización del set enriquecido de puntos: en mocks es estático y, cuando
  // el dataset crezca a >2000 municipios, evitará recomputar la conversión en
  // cada cambio de capa.
  const enrichedPoints = useMemo(() => toEnrichedMapPoints(), []);
  const activeLayer = useMemo(() => resolveLayer(activeLayerId), [activeLayerId]);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
      <SpainMap
        points={enrichedPoints}
        ariaLabel="Mapa territorial de España con municipios destacados"
        layerId={activeLayer.id as MapLayerId}
        className="h-[720px] rounded-3xl shadow-[var(--shadow-card)]"
      />
      <aside
        aria-label="Capas y leyenda del mapa"
        className="flex h-fit flex-col gap-4 rounded-3xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--color-line-soft)]"
      >
        <header className="flex flex-col gap-1">
          <h2 className="font-display text-ink-900 text-base font-semibold tracking-tight">
            Capa activa
          </h2>
          <p className="text-ink-500 text-xs">
            Cambia el indicador que colorea las burbujas. La leyenda y los tooltips se actualizan al
            instante.
          </p>
        </header>
        <LayerSwitcher
          activeLayerId={activeLayer.id}
          onChange={(id) => setActiveLayer(id)}
          ariaLabel="Capa activa del mapa territorial"
        />
        <p className="text-ink-500 mt-2 text-[11px] leading-snug">
          Datos servidos desde el dataset nacional de AtlasHabita: 101 municipios, 10 indicadores y
          datasets DGT, MITMA y CRTM combinados con INE, MITECO y AEMET.
        </p>
      </aside>
    </div>
  );
}
