/**
 * Paginador accesible y sin dependencias.
 *
 * Expone botones "anterior / siguiente" y un selector de página (con rango
 * abreviado cuando hay más de 7 páginas) para alimentar listas virtualizadas o
 * tablas. Se mantiene tonto: recibe `page` + `totalPages` y avisa con
 * `onPageChange`. La página base es 1 (1-indexed) porque es la representación
 * natural en UI.
 */

import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ComponentPropsWithoutRef } from 'react';
import { cn } from './cn';

export interface PaginationProps extends Omit<ComponentPropsWithoutRef<'nav'>, 'onChange'> {
  readonly page: number;
  readonly totalPages: number;
  readonly onPageChange: (page: number) => void;
  /** Texto accesible para el `<nav>`. */
  readonly label?: string;
  /** Número máximo de botones numéricos visibles (min. 3). */
  readonly siblings?: number;
}

/**
 * Devuelve el rango de páginas a renderizar como botones numéricos.
 * Aplica elipsis `…` cuando hay huecos para no saturar la UI.
 */
export function buildPageRange(
  page: number,
  totalPages: number,
  siblings: number
): ReadonlyArray<number | 'dots'> {
  const window = Math.max(3, siblings);
  if (totalPages <= window + 4) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }
  const start = Math.max(2, page - Math.floor(window / 2));
  const end = Math.min(totalPages - 1, start + window - 1);
  const pages: Array<number | 'dots'> = [1];
  if (start > 2) pages.push('dots');
  for (let i = start; i <= end; i += 1) pages.push(i);
  if (end < totalPages - 1) pages.push('dots');
  pages.push(totalPages);
  return pages;
}

export function Pagination({
  page,
  totalPages,
  onPageChange,
  label = 'Paginación',
  siblings = 3,
  className,
  ...rest
}: PaginationProps) {
  if (totalPages <= 1) {
    return null;
  }
  const range = buildPageRange(page, totalPages, siblings);
  const canGoPrev = page > 1;
  const canGoNext = page < totalPages;

  return (
    <nav
      aria-label={label}
      className={cn('flex flex-wrap items-center gap-1.5', className)}
      {...rest}
    >
      <button
        type="button"
        onClick={() => onPageChange(Math.max(1, page - 1))}
        disabled={!canGoPrev}
        aria-label="Página anterior"
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-full border',
          'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:ring-offset-2',
          canGoPrev
            ? 'text-ink-700 hover:border-brand-300 border-[color:var(--color-line-soft)]'
            : 'text-ink-300 cursor-not-allowed border-[color:var(--color-line-soft)]'
        )}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <ul className="flex items-center gap-1.5">
        {range.map((entry, index) =>
          entry === 'dots' ? (
            // Clave estable: el siguiente elemento numérico determina si
            // estos dots son los "before-N" o los "after-N" del rango.
            <li
              key={`dots-before-${range.slice(index + 1).find((e) => e !== 'dots') ?? 'end'}`}
              aria-hidden="true"
              className="text-ink-500 px-1 text-sm"
            >
              …
            </li>
          ) : (
            <li key={entry}>
              <button
                type="button"
                onClick={() => onPageChange(entry)}
                aria-current={entry === page ? 'page' : undefined}
                className={cn(
                  'inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm font-medium',
                  'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:ring-offset-2',
                  entry === page
                    ? 'border-brand-500 bg-brand-500 text-white'
                    : 'text-ink-700 hover:border-brand-300 border-[color:var(--color-line-soft)]'
                )}
              >
                {entry}
              </button>
            </li>
          )
        )}
      </ul>
      <button
        type="button"
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        disabled={!canGoNext}
        aria-label="Página siguiente"
        className={cn(
          'inline-flex h-9 w-9 items-center justify-center rounded-full border',
          'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:ring-offset-2',
          canGoNext
            ? 'text-ink-700 hover:border-brand-300 border-[color:var(--color-line-soft)]'
            : 'text-ink-300 cursor-not-allowed border-[color:var(--color-line-soft)]'
        )}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </nav>
  );
}
