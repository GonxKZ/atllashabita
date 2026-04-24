/**
 * Panel de capas del mapa con multi-select y leyenda por indicador.
 *
 * Ofrece >=6 capas (score por perfil, rent, broadband, income, services,
 * climate) activables a la vez. Cada capa declara su gradiente y unidad, con
 * lo que el consumidor puede renderizar una leyenda coherente sin lógica
 * extra.
 */

import { Layers } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import { Card, CardHeader } from '../../../components/ui/Card';
import { Tag } from '../../../components/ui/Tag';
import { Toggle } from '../../../components/ui/Toggle';
import { cn } from '../../../components/ui/cn';
import type { IndicatorId } from '../../../data/national_mock';

export type MapLayerId = 'score' | IndicatorId;

export interface MapLayerDefinition {
  readonly id: MapLayerId;
  readonly label: string;
  readonly description: string;
  readonly unit: string;
  readonly ramp: readonly string[];
  readonly defaultActive?: boolean;
}

export const DEFAULT_LAYER_DEFINITIONS: readonly MapLayerDefinition[] = [
  {
    id: 'score',
    label: 'Score por perfil',
    description: 'Agregado ponderado del perfil activo.',
    unit: '/100',
    ramp: ['#065f46', '#047857', '#059669', '#10b981', '#34d399'],
    defaultActive: true,
  },
  {
    id: 'rent_price',
    label: 'Precio alquiler',
    description: 'Alquiler medio residencial.',
    unit: ' €/mes',
    ramp: ['#3f6212', '#4d7c0f', '#84cc16', '#bef264', '#ecfccb'],
  },
  {
    id: 'broadband',
    label: 'Banda ancha',
    description: 'Cobertura de fibra FTTH y cable.',
    unit: ' %',
    ramp: ['#0c4a6e', '#075985', '#0369a1', '#38bdf8', '#e0f2fe'],
  },
  {
    id: 'income',
    label: 'Renta por hogar',
    description: 'Renta disponible bruta.',
    unit: ' €',
    ramp: ['#4c1d95', '#6d28d9', '#8b5cf6', '#c4b5fd', '#ede9fe'],
  },
  {
    id: 'services',
    label: 'Servicios sanitarios',
    description: 'Centros por 10.000 habitantes.',
    unit: ' ratio',
    ramp: ['#7c2d12', '#9a3412', '#ea580c', '#fb923c', '#fed7aa'],
  },
  {
    id: 'climate',
    label: 'Clima',
    description: 'Temperatura media anual.',
    unit: ' °C',
    ramp: ['#1e3a8a', '#1d4ed8', '#3b82f6', '#93c5fd', '#dbeafe'],
  },
];

export interface LayerSwitcherProps {
  readonly layers?: readonly MapLayerDefinition[];
  readonly activeLayers?: readonly MapLayerId[];
  readonly onChange?: (active: readonly MapLayerId[]) => void;
  readonly legendSlot?: ReactNode;
  readonly className?: string;
}

export function LayerSwitcher({
  layers = DEFAULT_LAYER_DEFINITIONS,
  activeLayers,
  onChange,
  legendSlot,
  className,
}: LayerSwitcherProps) {
  const [internalActive, setInternalActive] = useState<readonly MapLayerId[]>(() => {
    if (activeLayers) return activeLayers;
    return layers.filter((layer) => layer.defaultActive).map((layer) => layer.id);
  });
  const active = activeLayers ?? internalActive;

  const handleToggle = (layerId: MapLayerId, checked: boolean) => {
    const next = checked
      ? Array.from(new Set([...active, layerId]))
      : active.filter((id) => id !== layerId);
    if (!activeLayers) setInternalActive(next);
    onChange?.(next);
  };

  const activeDefs = layers.filter((layer) => active.includes(layer.id));

  return (
    <Card
      tone="base"
      padding="md"
      className={cn('flex flex-col gap-4', className)}
      aria-label="Panel de capas del mapa"
      data-feature="layer-switcher"
    >
      <CardHeader
        title="Capas del mapa"
        subtitle="Activa múltiples capas para comparar dimensiones."
        action={
          <Tag tone="info" icon={<Layers size={12} aria-hidden="true" />}>
            {active.length} activas
          </Tag>
        }
      />
      <ul className="flex flex-col gap-2" role="group" aria-label="Capas disponibles">
        {layers.map((layer) => {
          const checked = active.includes(layer.id);
          return (
            <li
              key={layer.id}
              className={cn(
                'rounded-2xl border px-3 py-2 transition-colors',
                checked
                  ? 'border-brand-200 bg-brand-50'
                  : 'bg-surface-soft border-[color:var(--color-line-soft)]'
              )}
            >
              <Toggle
                label={layer.label}
                helper={layer.description}
                checked={checked}
                onCheckedChange={(value) => handleToggle(layer.id, value)}
              />
              {checked ? (
                <div className="mt-2 flex items-center gap-2" aria-hidden="true">
                  {layer.ramp.map((color, idx) => (
                    <span
                      key={`${layer.id}-${idx}`}
                      className="h-2 flex-1 rounded-full"
                      style={{ backgroundColor: color }}
                    />
                  ))}
                  <span className="text-ink-500 text-[10px] font-semibold tracking-wide uppercase">
                    {layer.unit}
                  </span>
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      {legendSlot ? (
        <section aria-label="Leyenda combinada" className="flex flex-col gap-2">
          {legendSlot}
        </section>
      ) : null}
      {activeDefs.length === 0 ? (
        <p className="text-ink-500 rounded-xl bg-amber-50 p-3 text-xs" role="status">
          Activa al menos una capa para visualizarla en el mapa.
        </p>
      ) : null}
    </Card>
  );
}
