import { useMemo } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import type { TrendPoint } from '@/data/mock';

export type TrendsChartProps = {
  /** Serie temporal de 12 meses (mes, score y rentIndex). */
  data: TrendPoint[];
  /** Título visible. */
  title?: string;
  /** Explicación breve para acompañar al gráfico. */
  subtitle?: string;
  className?: string;
};

/**
 * Gráfico de tendencia con gradiente verde inspirado en la captura.
 * Usa AreaChart para transmitir progreso en lugar de lecturas puntuales.
 */
export function TrendsChart({
  data,
  title = 'Tendencia de calidad de vida',
  subtitle = 'Score medio de los últimos 12 meses en los territorios seleccionados.',
  className,
}: TrendsChartProps) {
  const domain = useMemo<[number, number]>(() => {
    if (data.length === 0) return [0, 100];
    const values = data.map((point) => point.score);
    const min = Math.floor(Math.min(...values) / 5) * 5 - 5;
    const max = Math.ceil(Math.max(...values) / 5) * 5 + 5;
    return [Math.max(0, min), Math.min(100, max)];
  }, [data]);

  return (
    <section
      className={['rounded-2xl bg-white p-6 shadow-[var(--shadow-card)]', className ?? '']
        .filter(Boolean)
        .join(' ')}
      aria-label={title}
    >
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-ink-900 text-lg font-semibold">{title}</h3>
          <p className="text-ink-500 mt-1 text-sm">{subtitle}</p>
        </div>
        <span className="text-brand-700 rounded-full bg-[var(--color-brand-50)] px-3 py-1 text-xs font-semibold">
          +12 pts
        </span>
      </header>

      <div className="h-56 w-full" role="img" aria-label={`Gráfico de líneas: ${title}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <defs>
              <linearGradient id="atlashabita-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 4" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              domain={domain}
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickLine={false}
              axisLine={false}
              width={40}
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
              formatter={(value: number, name) => [
                `${value}`,
                name === 'score' ? 'Score' : 'Índice alquiler',
              ]}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#047857"
              strokeWidth={2.5}
              fill="url(#atlashabita-trend-fill)"
              activeDot={{ r: 5, stroke: '#047857', strokeWidth: 2, fill: '#ffffff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
