/* eslint-disable no-undef -- HTMLInputElement es tipo DOM global resuelto por TypeScript. */
/**
 * Slider controlado sobre `<input type="range">` con etiqueta accesible.
 *
 * Mantiene la coherencia visual con el resto del sistema de diseño (colores
 * `brand` y tokens CSS) y respeta el contrato de `ComponentPropsWithoutRef` de
 * HTMLInput para permitir `min`, `max`, `step`, `disabled` y eventos nativos.
 */

import type { ChangeEvent, ComponentPropsWithoutRef } from 'react';
import { useId } from 'react';
import { cn } from './cn';

export interface SliderProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'value' | 'onChange'
> {
  readonly label: string;
  readonly value: number;
  readonly onValueChange: (value: number) => void;
  readonly unit?: string;
  readonly helper?: string;
  readonly format?: (value: number) => string;
}

function defaultFormat(value: number): string {
  return new Intl.NumberFormat('es-ES').format(value);
}

export function Slider({
  label,
  value,
  onValueChange,
  unit = '',
  helper,
  format = defaultFormat,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  id,
  className,
  ...rest
}: SliderProps) {
  const autoId = useId();
  const inputId = id ?? `slider-${autoId}`;
  const helperId = helper ? `${inputId}-helper` : undefined;
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Number(event.target.value);
    onValueChange(Number.isFinite(next) ? next : Number(min));
  };

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={inputId} className="text-ink-700 text-sm font-medium">
          {label}
        </label>
        <span
          aria-live="polite"
          className="bg-surface-muted text-ink-700 rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums"
        >
          {format(value)}
          {unit}
        </span>
      </div>
      <input
        id={inputId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-describedby={helperId}
        onChange={handleChange}
        className={cn(
          'accent-brand-500 focus-visible:ring-brand-300 h-2 w-full cursor-pointer rounded-full',
          'bg-[color:var(--color-line-soft)]',
          'focus-visible:ring-2 focus-visible:ring-offset-2',
          disabled && 'cursor-not-allowed opacity-60'
        )}
        {...rest}
      />
      {helper ? (
        <p id={helperId} className="text-ink-500 text-xs">
          {helper}
        </p>
      ) : null}
    </div>
  );
}
