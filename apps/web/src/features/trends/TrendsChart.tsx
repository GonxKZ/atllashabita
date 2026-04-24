import { useMemo, useRef } from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { resolveDuration } from '@/animations';
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
  const containerRef = useRef<HTMLElement | null>(null);

  /*
   * Revelamos el chart de izquierda a derecha con un clip-path inset, en
   * lugar de depender del plugin DrawSVG (comercial). Como fallback barato
   * acompaña un fade del bloque contenedor. El efecto se cancela si el
   * usuario prefiere reducir el movimiento.
   */
  useGSAP(
    () => {
      const node = containerRef.current;
      if (!node) return;
      gsap.from(node, {
        opacity: 0,
        duration: resolveDuration(0.5),
        ease: 'power2.out',
      });
      gsap.fromTo(
        node,
        { clipPath: 'inset(0 100% 0 0)' },
        {
          clipPath: 'inset(0 0% 0 0)',
          duration: resolveDuration(1.2),
          ease: 'power3.out',
          clearProps: 'clipPath',
        }
      );
    },
    {
      scope: containerRef,
      dependencies: [data.length],
    }
  );

  const domain = useMemo<[number, number]>(() => {
    if (data.length === 0) return [0, 100];
    const values = data.map((point) => point.score);
    const min = Math.floor(Math.min(...values) / 5) * 5 - 5;
    const max = Math.ceil(Math.max(...values) / 5) * 5 + 5;
    return [Math.max(0, min), Math.min(100, max)];
  }, [data]);

  return (
    <section
      ref={(node) => {
        containerRef.current = node;
      }}
      className={[
        'rounded-3xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--color-line-soft)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
      aria-label={title}
    >
      {/*
       * Header denso: título, subtítulo en gris medio y badge de variación
       * mensual (+12 pts) alineado a la derecha. La variación va con `tabular-nums`
       * para que la cifra no salte cuando aumente o disminuya en tiempo real.
       */}
      <header className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-display text-ink-900 text-base font-semibold tracking-tight">
            {title}
          </h3>
          <p className="text-ink-500 mt-0.5 text-[12px] leading-snug">{subtitle}</p>
        </div>
        <span className="text-brand-700 ring-brand-100 inline-flex items-center gap-1 rounded-full bg-[var(--color-brand-50)] px-2 py-0.5 text-[11px] font-bold tabular-nums ring-1">
          +12 pts
        </span>
      </header>

      <div className="h-40 w-full" role="img" aria-label={`Gráfico de líneas: ${title}`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: -22 }}>
            <defs>
              <linearGradient id="atlashabita-trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10b981" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#10b981" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 4" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={{ stroke: '#e2e8f0' }}
            />
            <YAxis
              domain={domain}
              tick={{ fill: '#94a3b8', fontSize: 10 }}
              tickLine={false}
              axisLine={false}
              width={32}
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
