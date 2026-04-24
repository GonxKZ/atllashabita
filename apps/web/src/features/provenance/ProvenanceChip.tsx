/**
 * Chip + tooltip de procedencia (PROV-O) para cualquier indicador.
 *
 * Muestra dataset, licencia, periodo y enlace al origen. Utiliza el patrón
 * "disclosure": el chip es un `<button>` accesible que despliega un panel con
 * la información completa al foco o al clic.
 *
 * Cumple con los requisitos del task:
 *   - El chip siempre muestra el dataset de origen.
 *   - El tooltip (disclosure) muestra licencia, periodo y link oficial.
 *   - Se puede navegar por teclado y es compatible con lectores de pantalla.
 */

import { ExternalLink, ShieldCheck } from 'lucide-react';
import { useId, useState } from 'react';
import { cn } from '../../components/ui/cn';

export interface ProvenanceChipProps {
  readonly sourceName: string;
  readonly licence: string;
  readonly period: string;
  readonly url?: string;
  readonly description?: string;
  readonly className?: string;
}

export function ProvenanceChip({
  sourceName,
  licence,
  period,
  url,
  description,
  className,
}: ProvenanceChipProps) {
  const panelId = useId();
  const [open, setOpen] = useState(false);

  return (
    <span className={cn('relative inline-flex', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((prev) => !prev)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        data-prov-chip
        className={cn(
          'inline-flex items-center gap-1.5 rounded-full border border-sky-100 bg-sky-50 px-2.5 py-0.5',
          'text-xs font-medium text-sky-700 transition-colors',
          'hover:border-sky-200 hover:bg-sky-100',
          'focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:outline-none'
        )}
      >
        <ShieldCheck size={12} aria-hidden="true" />
        {sourceName}
      </button>
      {open ? (
        <span
          id={panelId}
          role="tooltip"
          className={cn(
            'absolute top-full left-0 z-20 mt-2 w-72 rounded-xl border border-[color:var(--color-line-soft)] bg-white p-3 text-left shadow-[var(--shadow-elevated)]'
          )}
        >
          <span className="text-ink-900 block text-xs font-semibold">{sourceName}</span>
          {description ? (
            <span className="text-ink-500 mt-1 block text-xs leading-relaxed">{description}</span>
          ) : null}
          <dl className="text-ink-700 mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 text-xs">
            <dt className="text-ink-500">Licencia</dt>
            <dd className="font-medium">{licence}</dd>
            <dt className="text-ink-500">Periodo</dt>
            <dd className="font-medium">{period}</dd>
          </dl>
          {url ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-sky-700 hover:text-sky-900"
            >
              Fuente oficial
              <ExternalLink size={12} aria-hidden="true" />
            </a>
          ) : null}
        </span>
      ) : null}
    </span>
  );
}
