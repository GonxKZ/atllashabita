import type { ReactNode } from 'react';
import { cn } from '../ui/cn';

export interface ChipFilterOption {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface ChipFiltersProps {
  options: ChipFilterOption[];
  /** Ids actualmente activos. */
  value: string[];
  onToggle?: (id: string) => void;
  /** Controla cuánto contrastan las chips respecto al fondo (claro sobre hero). */
  tone?: 'onLight' | 'onBrand';
  'aria-label'?: string;
  className?: string;
}

export function ChipFilters({
  options,
  value,
  onToggle,
  tone = 'onLight',
  'aria-label': ariaLabel = 'Filtros rápidos',
  className,
}: ChipFiltersProps) {
  return (
    <div role="group" aria-label={ariaLabel} className={cn('flex flex-wrap gap-2', className)}>
      {options.map((option) => {
        const isActive = value.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle?.(option.id)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors',
              'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:ring-offset-2',
              tone === 'onBrand'
                ? isActive
                  ? 'text-brand-700 bg-white shadow-[var(--shadow-card)]'
                  : 'bg-white/20 text-white hover:bg-white/30'
                : isActive
                  ? 'bg-brand-500 text-white shadow-[var(--shadow-card)]'
                  : 'text-ink-700 hover:text-brand-700 hover:border-brand-300 border border-[color:var(--color-line-soft)] bg-white'
            )}
          >
            {option.icon ? (
              <span aria-hidden="true" className="inline-flex">
                {option.icon}
              </span>
            ) : null}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
