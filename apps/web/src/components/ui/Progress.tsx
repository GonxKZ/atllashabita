import type { ComponentPropsWithoutRef } from 'react';
import { cn } from './cn';

export type ProgressTone = 'brand' | 'success' | 'warning' | 'danger';
export type ProgressSize = 'sm' | 'md';

export interface ProgressProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  value: number;
  max?: number;
  min?: number;
  tone?: ProgressTone;
  size?: ProgressSize;
  label: string;
  /** Si `true`, esconde la etiqueta del nombre (sólo accesible). */
  hideLabel?: boolean;
  /** Texto mostrado a la derecha (por defecto `${value}%`). */
  valueText?: string;
}

const TONE_STYLES: Record<ProgressTone, string> = {
  brand: 'bg-gradient-to-r from-brand-400 to-brand-600',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
};

const SIZE_STYLES: Record<ProgressSize, string> = {
  sm: 'h-1.5',
  md: 'h-2.5',
};

function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

export function Progress({
  value,
  max = 100,
  min = 0,
  tone = 'brand',
  size = 'md',
  label,
  hideLabel = false,
  valueText,
  className,
  style,
  ...rest
}: ProgressProps) {
  const safeValue = clamp(value, min, max);
  // Evita divisiones por cero cuando max === min: en ese caso la barra queda
  // completa si value >= min y vacía en caso contrario.
  const range = max - min;
  const percent = range > 0 ? ((safeValue - min) / range) * 100 : safeValue >= min ? 100 : 0;
  const display = valueText ?? `${Math.round(percent)}%`;

  return (
    <div className={cn('flex flex-col gap-1.5', className)} {...rest}>
      {hideLabel ? null : (
        <div className="flex items-center justify-between text-xs">
          <span className="text-ink-500 font-medium">{label}</span>
          <span className="text-ink-900 font-semibold">{display}</span>
        </div>
      )}
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={safeValue}
        aria-valuetext={display}
        className={cn('bg-surface-muted w-full overflow-hidden rounded-full', SIZE_STYLES[size])}
        style={style}
      >
        <div
          className={cn('h-full rounded-full transition-[width] duration-500', TONE_STYLES[tone])}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
