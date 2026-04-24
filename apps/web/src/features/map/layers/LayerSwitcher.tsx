/**
 * Selector reactivo de capa activa para el mapa multi-métrica.
 *
 * Renderiza un grupo de radios accesible donde cada opción muestra:
 *  - una rampa cromática preview con la paleta de la capa,
 *  - su etiqueta principal,
 *  - su descripción larga,
 *  - la unidad asociada (en mayúsculas para que sea legible como sufijo).
 *
 * El componente es totalmente controlado: el padre proporciona `activeLayerId`
 * y `onChange`. Esto permite al store global (`state/mapLayer.ts`) mantener
 * la sincronía entre la home y la página `/mapa`. La lista de capas y los
 * metadatos provienen del catálogo (`features/map/layers/catalog.ts`) para
 * evitar duplicaciones.
 *
 * Accesibilidad:
 *  - `role="radiogroup"` con `aria-label` describe el grupo.
 *  - Cada opción es un `<input type="radio">` etiquetado con su descripción.
 *  - Los cambios disparan un anuncio "polite" via `aria-live` para lectores
 *    de pantalla, satisfaciendo el criterio AA del issue.
 */

import { useId, useMemo } from 'react';

import { cn } from '../../../components/ui/cn';
import { MAP_LAYER_CATALOG, type MapLayerDefinition, type MapLayerId } from './catalog';

export interface LayerSwitcherProps {
  /** Lista de capas a mostrar. Por defecto el catálogo completo. */
  readonly layers?: readonly MapLayerDefinition[];
  /** Identificador de la capa actualmente activa. */
  readonly activeLayerId: MapLayerId;
  /** Callback al cambiar de capa. */
  readonly onChange: (id: MapLayerId) => void;
  /** Si `true`, muestra una versión compacta sin descripción larga. */
  readonly compact?: boolean;
  /** Etiqueta accesible del grupo de radios. */
  readonly ariaLabel?: string;
  readonly className?: string;
}

/**
 * Renderiza la rampa cromática (5 stops) como un degradado lineal horizontal.
 * Es puramente decorativo y se oculta a tecnologías asistivas.
 */
function LayerRampPreview({ palette }: { palette: readonly string[] }) {
  // Reverseamos visualmente para mostrar bajo→alto (left → right). La paleta
  // se declara alto→bajo, así que aquí invertimos el orden visual.
  const reversed = palette.slice().reverse();
  return (
    <span
      aria-hidden="true"
      className="block h-1.5 w-full rounded-full"
      style={{
        backgroundImage: `linear-gradient(to right, ${reversed.join(', ')})`,
      }}
    />
  );
}

export function LayerSwitcher({
  layers = MAP_LAYER_CATALOG,
  activeLayerId,
  onChange,
  compact = false,
  ariaLabel = 'Capa activa del mapa',
  className,
}: LayerSwitcherProps) {
  const groupId = useId();
  const activeLayer = useMemo(
    () => layers.find((layer) => layer.id === activeLayerId) ?? layers[0],
    [layers, activeLayerId]
  );

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      data-feature="layer-switcher"
      className={cn('flex flex-col gap-2', className)}
    >
      {layers.map((layer) => {
        const isActive = layer.id === activeLayerId;
        const inputId = `${groupId}-${layer.id}`;
        return (
          <label
            key={layer.id}
            htmlFor={inputId}
            className={cn(
              'group relative flex cursor-pointer flex-col gap-1.5 rounded-2xl border px-3 py-2.5 transition-colors',
              'focus-within:ring-brand-300 focus-within:ring-2 focus-within:ring-offset-2',
              isActive
                ? 'border-brand-300 bg-brand-50 shadow-sm'
                : 'border-[color:var(--color-line-soft)] bg-white hover:bg-[var(--color-surface-muted)]'
            )}
          >
            <span className="flex items-start justify-between gap-3">
              <span className="flex flex-col gap-0.5">
                <span className="text-ink-900 text-sm font-semibold tracking-tight">
                  {layer.label}
                </span>
                {!compact ? (
                  <span className="text-ink-500 text-xs leading-snug">{layer.description}</span>
                ) : null}
              </span>
              <input
                id={inputId}
                type="radio"
                name={`map-layer-${groupId}`}
                value={layer.id}
                checked={isActive}
                onChange={() => onChange(layer.id)}
                className="text-brand-500 focus:ring-brand-300 mt-0.5 h-4 w-4 cursor-pointer accent-[var(--color-brand-500)]"
                aria-describedby={`${inputId}-meta`}
              />
            </span>
            <span className="flex items-center gap-2">
              <LayerRampPreview palette={layer.palette} />
              <span
                id={`${inputId}-meta`}
                className="text-ink-500 shrink-0 text-[10px] font-medium tracking-wider uppercase"
              >
                {layer.unit.trim() === '' ? '0–100' : layer.unit.trim()}
              </span>
            </span>
          </label>
        );
      })}
      <p className="sr-only" aria-live="polite">
        Capa activa: {activeLayer.label}. {activeLayer.description}
      </p>
    </div>
  );
}

export { MAP_LAYER_CATALOG } from './catalog';
export type { MapLayerDefinition, MapLayerId } from './catalog';
