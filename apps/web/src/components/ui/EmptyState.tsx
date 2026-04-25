/**
 * Estado vacío reutilizable con microcopy orientativo en español.
 *
 * Acepta tres bloques opcionales (icono, descripción, acción) y un quinto
 * elemento `hint`: un detalle accesorio en gris claro útil para sugerir
 * atajos de teclado o explicar por qué la lista está vacía sin abultar la
 * descripción principal. Pensado como un único punto de entrada para
 * homogeneizar tono y composición en la app.
 */
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from './cn';

export interface EmptyStateProps extends ComponentPropsWithoutRef<'div'> {
  readonly title: string;
  readonly description?: ReactNode;
  readonly icon?: ReactNode;
  readonly action?: ReactNode;
  /** Texto secundario en gris claro (atajos, ayudas, recordatorios). */
  readonly hint?: ReactNode;
  /** Variante compacta para zonas con poco espacio (sidebar, drawer). */
  readonly compact?: boolean;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  hint,
  compact = false,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-3xl bg-white text-center',
        'border border-dashed border-[color:var(--color-line-soft)]',
        compact ? 'p-6' : 'p-10',
        className
      )}
      {...rest}
    >
      {icon ? (
        <span aria-hidden="true" className="bg-brand-50 text-brand-600 rounded-full p-3">
          {icon}
        </span>
      ) : null}
      <h3 className="font-display text-ink-900 text-lg font-semibold">{title}</h3>
      {description ? <p className="text-ink-500 max-w-sm text-sm">{description}</p> : null}
      {action ? <div className="mt-1">{action}</div> : null}
      {hint ? <p className="text-ink-400 mt-1 max-w-sm text-xs leading-relaxed">{hint}</p> : null}
    </div>
  );
}
