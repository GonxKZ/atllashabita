/**
 * Toggle accesible basado en `role="switch"`.
 *
 * Se usa para activar/desactivar capas del mapa y opciones booleanas en el
 * panel técnico. Respeta las reglas WAI-ARIA: expone `aria-checked` y admite
 * navegación por teclado (Space/Enter) reaprovechando el tratamiento nativo
 * del `<button>`.
 */

import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { useId } from 'react';
import { cn } from './cn';

export interface ToggleProps extends Omit<ComponentPropsWithoutRef<'button'>, 'onChange'> {
  readonly label: ReactNode;
  readonly helper?: ReactNode;
  readonly checked: boolean;
  readonly onCheckedChange: (value: boolean) => void;
  readonly disabled?: boolean;
}

export function Toggle({
  label,
  helper,
  checked,
  onCheckedChange,
  disabled = false,
  className,
  id,
  ...rest
}: ToggleProps) {
  const autoId = useId();
  const inputId = id ?? `toggle-${autoId}`;
  const helperId = helper ? `${inputId}-helper` : undefined;

  return (
    <div className={cn('flex items-start justify-between gap-3', className)}>
      <label htmlFor={inputId} className="flex flex-col gap-0.5">
        <span className="text-ink-900 text-sm font-medium">{label}</span>
        {helper ? (
          <span id={helperId} className="text-ink-500 text-xs">
            {helper}
          </span>
        ) : null}
      </label>
      <button
        id={inputId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={helperId}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors',
          'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:ring-offset-2',
          checked
            ? 'bg-brand-500 border-brand-600'
            : 'border-[color:var(--color-line-strong)] bg-slate-200',
          disabled && 'cursor-not-allowed opacity-60'
        )}
        {...rest}
      >
        <span
          aria-hidden="true"
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1'
          )}
        />
      </button>
    </div>
  );
}
