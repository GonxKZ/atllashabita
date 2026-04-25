/**
 * Gráfico radial (radar) del comparador.
 *
 * Cada eje representa un indicador normalizado a [0, 100] dentro del propio
 * comparador (no a nivel nacional) para que el usuario vea de un vistazo
 * cuál municipio sobresale en cada dimensión. Se admiten hasta cuatro
 * polígonos superpuestos, cada uno con su color de paleta.
 *
 * El componente es puramente presentacional: la página alimenta los datos y
 * la lista de indicadores. Si no hay datos suficientes muestra un placeholder
 * accesible.
 */
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { NationalMunicipality } from '../../data/national_mock';
import type { CompareIndicatorRow } from './CompareTable';
import { cn } from '../../components/ui/cn';
import { COMPARE_INDICATORS, getIndicator } from './CompareTable';

/** Paleta determinista por orden de añadido al comparador. */
export const COMPARE_PALETTE = [
  '#10b981', // brand emerald
  '#0ea5e9', // sky
  '#f59e0b', // amber
  '#a855f7', // purple
] as const;

export interface CompareSpiderProps {
  readonly municipalities: readonly NationalMunicipality[];
  readonly indicators?: readonly CompareIndicatorRow[];
  readonly className?: string;
}

interface RadarRow {
  readonly indicator: string;
  readonly axisLabel: string;
  readonly [key: string]: number | string;
}

/**
 * Normaliza un valor al rango [0, 100] dentro del comparador en función del
 * sentido del indicador (mayor mejor / menor mejor).
 *
 * El ancla son los valores mostrados en la propia tabla, no los del país,
 * para que la lectura sea relativa al subset comparado (la métrica útil al
 * elegir un destino entre las opciones del usuario).
 */
export function normalizeValue(
  value: number | null,
  values: ReadonlyArray<number | null>,
  direction: 'higher_is_better' | 'lower_is_better'
): number {
  if (value === null) return 0;
  const finite = values.filter((v): v is number => v !== null && Number.isFinite(v));
  if (finite.length === 0) return 0;
  const min = Math.min(...finite);
  const max = Math.max(...finite);
  if (max === min) return 100;
  const ratio = (value - min) / (max - min);
  return Math.round((direction === 'higher_is_better' ? ratio : 1 - ratio) * 100);
}

/**
 * Construye los datos del radar. Cada fila es un indicador y cada columna
 * adicional el valor normalizado para un municipio (clave = id).
 */
export function buildRadarData(
  municipalities: readonly NationalMunicipality[],
  indicators: readonly CompareIndicatorRow[] = COMPARE_INDICATORS
): readonly RadarRow[] {
  return indicators.map((row) => {
    const values = municipalities.map((entry) => getIndicator(entry, row.id));
    const cells: Record<string, number | string> = {
      indicator: row.id,
      axisLabel: row.label,
    };
    municipalities.forEach((entry, index) => {
      cells[entry.id] = normalizeValue(values[index] ?? null, values, row.direction);
    });
    return cells as RadarRow;
  });
}

export function CompareSpider({
  municipalities,
  indicators = COMPARE_INDICATORS,
  className,
}: CompareSpiderProps) {
  if (municipalities.length === 0) {
    return null;
  }

  const data = buildRadarData(municipalities, indicators);

  return (
    <section
      aria-label="Comparativa radial de indicadores"
      data-testid="compare-spider"
      className={cn(
        'rounded-3xl border border-[color:var(--color-line-soft)] bg-white p-5 shadow-[var(--shadow-card)]',
        className
      )}
    >
      <header className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-ink-900 text-base font-semibold tracking-tight">
            Mapa de fortalezas
          </h3>
          <p className="text-ink-500 mt-0.5 text-xs">
            Cada eje normaliza el indicador a 0–100 dentro de tu comparación. Cuanto más grande sea
            el polígono, mejor balance global.
          </p>
        </div>
        <ul
          aria-label="Leyenda"
          className="text-ink-700 flex flex-wrap items-center gap-2 text-[11px]"
        >
          {municipalities.map((entry, index) => (
            <li key={entry.id} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: COMPARE_PALETTE[index % COMPARE_PALETTE.length] }}
              />
              <span>{entry.name}</span>
            </li>
          ))}
        </ul>
      </header>
      <div className="h-72 w-full" role="img" aria-label="Gráfico radial de indicadores">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data as RadarRow[]} outerRadius="80%">
            <PolarGrid stroke="#e2e8f0" />
            <PolarAngleAxis dataKey="axisLabel" tick={{ fill: '#475569', fontSize: 11 }} />
            <PolarRadiusAxis
              angle={30}
              domain={[0, 100]}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              stroke="#cbd5f5"
            />
            <Tooltip
              cursor={{ stroke: '#10b981', strokeDasharray: '4 4' }}
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #e2e8f0',
                boxShadow: '0 12px 28px -18px rgba(15,23,42,0.22)',
                fontSize: 12,
              }}
              labelStyle={{ color: '#0f172a', fontWeight: 600 }}
            />
            {municipalities.map((entry, index) => {
              const colour = COMPARE_PALETTE[index % COMPARE_PALETTE.length] ?? '#10b981';
              return (
                <Radar
                  key={entry.id}
                  name={entry.name}
                  dataKey={entry.id}
                  stroke={colour}
                  strokeWidth={2}
                  fill={colour}
                  fillOpacity={0.18}
                />
              );
            })}
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
