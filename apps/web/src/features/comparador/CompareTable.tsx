/**
 * Tabla diferencial del comparador.
 *
 * Cada fila representa un indicador (alquiler, banda ancha, ...) y cada
 * columna un municipio. Se renderiza una barra horizontal cuya longitud es
 * proporcional al valor con respecto al máximo de la fila, y se marca con un
 * borde visual el municipio con mejor desempeño según el sentido del
 * indicador (mayor = mejor, menor = mejor).
 *
 * Diseñada para mostrar hasta cuatro municipios sin scrolling horizontal en
 * laptops; en pantallas pequeñas la tabla se desliza con `overflow-x-auto`.
 */
import type { NationalMunicipality } from '../../data/national_mock';
import { cn } from '../../components/ui/cn';
import { HelpKey } from '../../components/ui/HelpKey';
import { Tooltip } from '../../components/ui/Tooltip';

/** Sentido del indicador para colorear cuál es la mejor columna. */
export type IndicatorDirection = 'higher_is_better' | 'lower_is_better';

/** Definición visible de cada fila de la tabla. */
export interface CompareIndicatorRow {
  readonly id: string;
  readonly label: string;
  readonly unit: string;
  readonly direction: IndicatorDirection;
  /** Hint descriptivo en tooltip; debe explicar qué mide el indicador. */
  readonly hint?: string;
}

/** Definición por defecto. Se exporta para reutilizarla en escenarios. */
export const COMPARE_INDICATORS: readonly CompareIndicatorRow[] = [
  {
    id: 'rent_price',
    label: 'Precio alquiler',
    unit: '€/mes',
    direction: 'lower_is_better',
    hint: 'Importe medio del alquiler residencial reportado por el INE.',
  },
  {
    id: 'income',
    label: 'Renta media',
    unit: '€',
    direction: 'higher_is_better',
    hint: 'Renta neta media por hogar (anual).',
  },
  {
    id: 'broadband',
    label: 'Banda ancha',
    unit: '%',
    direction: 'higher_is_better',
    hint: 'Cobertura de banda ancha fija ≥ 100 Mbps.',
  },
  {
    id: 'services',
    label: 'Centros sanitarios',
    unit: '/10k hab',
    direction: 'higher_is_better',
    hint: 'Centros públicos por 10.000 habitantes.',
  },
  {
    id: 'air_quality',
    label: 'Calidad del aire',
    unit: 'AQI',
    direction: 'lower_is_better',
    hint: 'AQI medio anual; valores menores son preferibles.',
  },
  {
    id: 'mobility',
    label: 'Tiempo de commute',
    unit: 'min',
    direction: 'lower_is_better',
    hint: 'Tiempo medio de desplazamiento al trabajo.',
  },
  {
    id: 'transit',
    label: 'Transporte público',
    unit: '%',
    direction: 'higher_is_better',
    hint: 'Cobertura del transporte público regular.',
  },
];

/** Recupera el valor numérico del indicador `id` para un municipio. */
export function getIndicator(entry: NationalMunicipality, id: string): number | null {
  const found = entry.indicators.find((indicator) => indicator.id === id);
  return found ? found.value : null;
}

/**
 * Devuelve la mejor cantidad de la fila según el sentido del indicador.
 * Cuando todos los valores son nulos devuelve `null`.
 */
export function bestValue(
  values: ReadonlyArray<number | null>,
  direction: IndicatorDirection
): number | null {
  const finite = values.filter(
    (value): value is number => value !== null && Number.isFinite(value)
  );
  if (finite.length === 0) return null;
  return direction === 'higher_is_better' ? Math.max(...finite) : Math.min(...finite);
}

/**
 * Calcula la posición [0, 1] de un valor dentro del rango de la fila.
 * Si la diferencia entre máximo y mínimo es 0, devuelve 1 para todas las
 * columnas (todas iguales), evitando barras de longitud 0.
 */
export function ratio(value: number | null, values: ReadonlyArray<number | null>): number {
  if (value === null) return 0;
  const finite = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (finite.length === 0) return 0;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (max === min) return 1;
  return (value - min) / (max - min);
}

export interface CompareTableProps {
  readonly municipalities: readonly NationalMunicipality[];
  readonly onRemove?: (id: string) => void;
  readonly indicators?: readonly CompareIndicatorRow[];
  readonly className?: string;
}

const NUMBER_FORMATTER = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

export function CompareTable({
  municipalities,
  onRemove,
  indicators = COMPARE_INDICATORS,
  className,
}: CompareTableProps) {
  if (municipalities.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'overflow-x-auto rounded-3xl border border-[color:var(--color-line-soft)] bg-white shadow-[var(--shadow-card)]',
        className
      )}
      data-testid="compare-table"
    >
      <table className="w-full min-w-[640px] table-fixed">
        <caption className="sr-only">
          Comparativa de indicadores entre los municipios seleccionados.
        </caption>
        <thead>
          <tr className="bg-surface-soft text-ink-700 text-left text-xs">
            <th scope="col" className="w-44 px-4 py-3 font-semibold tracking-tight">
              Indicador
            </th>
            {municipalities.map((entry) => (
              <th
                key={entry.id}
                scope="col"
                className="px-4 py-3 align-bottom font-semibold tracking-tight"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-ink-900 truncate text-sm">{entry.name}</p>
                    <p className="text-ink-500 truncate text-[11px] font-normal">
                      {entry.province}
                    </p>
                  </div>
                  {onRemove ? (
                    <button
                      type="button"
                      onClick={() => onRemove(entry.id)}
                      aria-label={`Quitar ${entry.name} de la comparación`}
                      data-testid={`compare-remove-${entry.id}`}
                      className="text-ink-500 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-rose-50 hover:text-rose-600"
                    >
                      <span aria-hidden="true">×</span>
                    </button>
                  ) : null}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {indicators.map((row) => {
            const values = municipalities.map((entry) => getIndicator(entry, row.id));
            const best = bestValue(values, row.direction);
            return (
              <tr
                key={row.id}
                className="border-t border-[color:var(--color-line-soft)] align-middle"
              >
                <th scope="row" className="px-4 py-3 text-left">
                  <div className="flex flex-col gap-1">
                    <Tooltip content={row.hint ?? row.label} side="right">
                      <span className="text-ink-900 cursor-help text-sm font-medium">
                        {row.label}
                      </span>
                    </Tooltip>
                    <span className="text-ink-500 text-[11px]">
                      {row.direction === 'higher_is_better' ? 'Más es mejor' : 'Menos es mejor'} ·{' '}
                      {row.unit}
                    </span>
                  </div>
                </th>
                {values.map((value, index) => {
                  const entry = municipalities[index]!;
                  const isBest = value !== null && best !== null && value === best;
                  const fill = ratio(value, values);
                  const direction = row.direction === 'higher_is_better' ? fill : 1 - fill;
                  return (
                    <td
                      key={`${row.id}-${entry.id}`}
                      className="px-4 py-3"
                      data-testid={`compare-cell-${row.id}-${entry.id}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span
                          className={cn(
                            'text-sm tabular-nums',
                            isBest ? 'text-brand-700 font-semibold' : 'text-ink-700'
                          )}
                        >
                          {value === null ? '—' : NUMBER_FORMATTER.format(value)}
                        </span>
                        {isBest ? (
                          <span
                            className="bg-brand-100 text-brand-700 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase"
                            aria-label="Mejor de la fila"
                          >
                            Mejor
                          </span>
                        ) : null}
                      </div>
                      <div className="bg-surface-muted mt-1 h-1.5 rounded-full" role="presentation">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            isBest ? 'bg-brand-500' : 'bg-ink-300'
                          )}
                          style={{ width: `${Math.max(4, Math.round(direction * 100))}%` }}
                        />
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="bg-surface-soft border-t border-[color:var(--color-line-soft)]">
            <th scope="row" className="px-4 py-3 text-left text-xs font-semibold">
              <Tooltip content="Score AtlasHabita compuesto sobre 100." side="right">
                <span className="text-ink-900 cursor-help">Score</span>
              </Tooltip>
            </th>
            {municipalities.map((entry) => (
              <td
                key={`score-${entry.id}`}
                className="px-4 py-3 text-sm font-semibold tabular-nums"
              >
                {entry.score}
                <span className="text-ink-500 ml-1 text-[11px] font-normal">
                  / 100 <HelpKey>conf {Math.round(entry.confidence * 100)}%</HelpKey>
                </span>
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
