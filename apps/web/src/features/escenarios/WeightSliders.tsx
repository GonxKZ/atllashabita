/**
 * Bloque de sliders ponderables del simulador de escenarios.
 *
 * Cada slider corresponde a un factor de scoring (alquiler, banda ancha,
 * ...). El componente es controlado: la página propietaria del estado
 * proporciona los valores actuales y reacciona a cada cambio.
 *
 * Microcopy y accesibilidad:
 *   - Cada slider muestra el peso como porcentaje real para evitar abstracciones.
 *   - Encima del bloque se indica si la suma actual cuadra con 100%.
 *   - Una etiqueta explica el sentido (mayor peso ⇒ más influencia).
 */
import { Slider } from '../../components/ui/Slider';
import { HelpKey } from '../../components/ui/HelpKey';
import { Tooltip } from '../../components/ui/Tooltip';
import type { WeightVector } from '../../state/escenariosStore';

export interface WeightDescriptor {
  readonly id: string;
  readonly label: string;
  readonly hint: string;
}

/**
 * Lista canónica de factores en el simulador. Mantenerla en este módulo
 * permite a las pruebas y a la página apoyarse en el mismo orden y
 * traducción.
 */
export const WEIGHT_DESCRIPTORS: readonly WeightDescriptor[] = [
  {
    id: 'rent_price',
    label: 'Alquiler asequible',
    hint: 'Mayor peso → priorizamos municipios con alquileres más bajos.',
  },
  {
    id: 'income',
    label: 'Renta media',
    hint: 'Mayor peso → priorizamos municipios con renta neta alta.',
  },
  {
    id: 'broadband',
    label: 'Cobertura banda ancha',
    hint: 'Mayor peso → priorizamos cobertura ≥ 100 Mbps.',
  },
  {
    id: 'services',
    label: 'Centros sanitarios',
    hint: 'Mayor peso → priorizamos densidad de servicios sanitarios.',
  },
  {
    id: 'air_quality',
    label: 'Calidad del aire',
    hint: 'Mayor peso → priorizamos AQI bajo (mejor aire).',
  },
  {
    id: 'mobility',
    label: 'Tiempo de commute',
    hint: 'Mayor peso → priorizamos commutes cortos.',
  },
  {
    id: 'transit',
    label: 'Transporte público',
    hint: 'Mayor peso → priorizamos cobertura de transporte público.',
  },
  {
    id: 'climate',
    label: 'Clima templado',
    hint: 'Mayor peso → priorizamos temperatura media moderada.',
  },
];

export interface WeightSlidersProps {
  readonly weights: WeightVector;
  readonly onChange: (id: string, value: number) => void;
  readonly descriptors?: readonly WeightDescriptor[];
}

const PERCENT_FORMATTER = new Intl.NumberFormat('es-ES', {
  style: 'percent',
  maximumFractionDigits: 0,
});

export function WeightSliders({
  weights,
  onChange,
  descriptors = WEIGHT_DESCRIPTORS,
}: WeightSlidersProps) {
  const total = descriptors.reduce((acc, descriptor) => {
    const value = weights[descriptor.id];
    return acc + (typeof value === 'number' && Number.isFinite(value) ? value : 0);
  }, 0);
  const totalLabel = PERCENT_FORMATTER.format(total);
  const balanced = Math.abs(total - 1) < 0.005;

  return (
    <section
      aria-label="Pesos del perfil"
      data-testid="weight-sliders"
      className="rounded-3xl border border-[color:var(--color-line-soft)] bg-white p-5 shadow-[var(--shadow-card)]"
    >
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-ink-900 text-base font-semibold tracking-tight">
            Reparto del perfil
          </h2>
          <p className="text-ink-500 text-xs">
            Mueve los sliders para ajustar la importancia relativa de cada criterio.
          </p>
        </div>
        <Tooltip
          content={
            balanced
              ? 'Suma de pesos = 100% (perfil equilibrado).'
              : 'La suma actual difiere de 100%. El ranking normaliza al puntuar, pero conviene reequilibrar.'
          }
          side="left"
        >
          <span
            className={
              balanced
                ? 'bg-brand-50 text-brand-700 inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold'
                : 'inline-flex items-center gap-1 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700'
            }
            data-testid="weight-total"
          >
            Total {totalLabel}
            <HelpKey tone={balanced ? 'default' : 'solid'}>=100%</HelpKey>
          </span>
        </Tooltip>
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {descriptors.map((descriptor) => {
          const value = weights[descriptor.id] ?? 0;
          return (
            <Slider
              key={descriptor.id}
              label={descriptor.label}
              value={value}
              min={0}
              max={1}
              step={0.01}
              onValueChange={(next) => onChange(descriptor.id, next)}
              format={(rawValue) => PERCENT_FORMATTER.format(rawValue)}
              helper={descriptor.hint}
              data-testid={`weight-slider-${descriptor.id}`}
            />
          );
        })}
      </div>
    </section>
  );
}
