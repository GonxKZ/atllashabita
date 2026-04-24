/**
 * Página `/mapa`: vista a página completa del mapa interactivo.
 *
 * Reutiliza el mismo componente `SpainMap` que monta el dashboard, pero con
 * altura mayor y un panel lateral de leyenda + capas. Al ser una ruta
 * dedicada, la dejamos lazy-loadable desde el router para que el bundle
 * principal no incluya la dependencia `maplibre-gl` cuando el usuario no
 * navega a `/mapa`.
 */

import { useMemo, useState } from 'react';

import { SpainMap } from './SpainMap';
import { mockPoints } from '@/data/mock';

const VIEW_HEIGHTS = ['600px', '720px', '820px'] as const;

export function MapPage() {
  const [layerLabel, setLayerLabel] = useState<string>('Score territorial');
  const heights = useMemo(() => VIEW_HEIGHTS, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <SpainMap
        points={mockPoints}
        ariaLabel="Mapa territorial de España con municipios destacados"
        layerLabel={layerLabel}
        className="rounded-3xl shadow-[var(--shadow-card)]"
        unit=""
      />
      <aside
        aria-label="Capas y leyenda"
        className="flex h-fit flex-col gap-4 rounded-3xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--color-line-soft)]"
      >
        <div>
          <h2 className="font-display text-ink-900 text-base font-semibold tracking-tight">
            Capa activa
          </h2>
          <p className="text-ink-500 mt-0.5 text-xs">
            Cambia el indicador que colorea las burbujas.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          {[
            'Score territorial',
            'Conectividad',
            'Vivienda asequible',
            'Empleo',
            'Servicios',
            'Clima',
          ].map((label) => (
            <label
              key={label}
              className="flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-colors hover:bg-[var(--color-surface-muted)]"
            >
              <input
                type="radio"
                name="map-layer"
                checked={layerLabel === label}
                onChange={() => setLayerLabel(label)}
                className="accent-brand-500 h-4 w-4"
              />
              <span className="text-ink-700">{label}</span>
            </label>
          ))}
        </div>
        <p className="text-ink-500 mt-3 text-[11px] leading-snug">
          Datos servidos desde el dataset nacional de AtlasHabita: 101 municipios, 9 indicadores y
          909 observaciones del periodo 2024-2025.
        </p>
      </aside>
      <span className="sr-only">{`Altura referencia: ${heights[0]}`}</span>
    </div>
  );
}
