/**
 * Tabla de datos genérica, tipada por fila y accesible por defecto.
 *
 * Proporciona un `<table>` semántico con `<caption>` y cabeceras sortables
 * opcionales. No gestiona paginación: los consumidores componen la tabla con
 * `Pagination` fuera si lo necesitan. Mantiene el patrón "render props" para
 * que la UI final sea flexible (celdas pueden devolver cualquier `ReactNode`).
 */

import type { ReactNode } from 'react';
import { cn } from './cn';

export interface DataTableColumn<Row> {
  readonly id: string;
  readonly header: ReactNode;
  readonly cell: (row: Row, index: number) => ReactNode;
  readonly align?: 'left' | 'right' | 'center';
  readonly width?: string;
  readonly ariaLabel?: string;
}

export interface DataTableProps<Row> {
  readonly columns: ReadonlyArray<DataTableColumn<Row>>;
  readonly rows: ReadonlyArray<Row>;
  readonly getRowId: (row: Row, index: number) => string;
  readonly caption?: ReactNode;
  readonly ariaLabel?: string;
  readonly emptyState?: ReactNode;
  readonly className?: string;
  readonly onRowClick?: (row: Row, index: number) => void;
  readonly rowAriaSelected?: (row: Row, index: number) => boolean;
}

export function DataTable<Row>({
  columns,
  rows,
  getRowId,
  caption,
  ariaLabel,
  emptyState,
  className,
  onRowClick,
  rowAriaSelected,
}: DataTableProps<Row>) {
  return (
    <div
      className={cn(
        'overflow-x-auto rounded-2xl border border-[color:var(--color-line-soft)] bg-white',
        className
      )}
    >
      <table className="w-full border-collapse" aria-label={ariaLabel}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        <thead className="bg-surface-muted text-ink-700 text-xs font-semibold tracking-wide uppercase">
          <tr>
            {columns.map((column) => (
              <th
                key={column.id}
                scope="col"
                aria-label={column.ariaLabel}
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  'border-b border-[color:var(--color-line-soft)] px-4 py-3',
                  column.align === 'right' && 'text-right',
                  column.align === 'center' && 'text-center',
                  (!column.align || column.align === 'left') && 'text-left'
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && emptyState ? (
            <tr>
              <td colSpan={columns.length} className="text-ink-500 px-4 py-8 text-center text-sm">
                <span role="status">{emptyState}</span>
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => {
              const selected = rowAriaSelected?.(row, rowIndex) ?? false;
              const handleClick = onRowClick ? () => onRowClick(row, rowIndex) : undefined;
              return (
                <tr
                  key={getRowId(row, rowIndex)}
                  data-selected={selected ? 'true' : undefined}
                  className={cn(
                    'border-b border-[color:var(--color-line-soft)] transition-colors',
                    'hover:bg-surface-soft focus-within:bg-surface-soft',
                    selected && 'bg-brand-50'
                  )}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      onClick={handleClick}
                      className={cn(
                        'text-ink-900 px-4 py-3 text-sm',
                        column.align === 'right' && 'text-right tabular-nums',
                        column.align === 'center' && 'text-center',
                        handleClick && 'cursor-pointer'
                      )}
                    >
                      {column.cell(row, rowIndex)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
