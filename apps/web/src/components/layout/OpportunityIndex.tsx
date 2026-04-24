import { useId } from 'react';

import { Progress } from '../ui/Progress';
import { cn } from '../ui/cn';

export interface OpportunityIndexProps {
  title?: string;
  value: number;
  description?: string;
  className?: string;
}

export function OpportunityIndex({
  title = 'Índice de oportunidad',
  value,
  description,
  className,
}: OpportunityIndexProps) {
  // `useId` garantiza que dos indicadores en la misma pantalla no compartan
  // ``id``: antes se usaba un literal fijo que fallaba si el componente se
  // montaba varias veces (panel lateral + vista comparativa, por ejemplo).
  const titleId = useId();
  return (
    <section
      aria-labelledby={titleId}
      // Card del índice con tipografía display para la cifra: el comp
      // sitúa el valor en grande a la derecha y la etiqueta a la izquierda.
      className={cn(
        'flex flex-col gap-3 rounded-2xl bg-white p-5',
        'border border-[color:var(--color-line-soft)] shadow-[var(--shadow-card)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3
            id={titleId}
            className="text-ink-500 text-[11px] font-semibold tracking-[0.16em] uppercase"
          >
            {title}
          </h3>
          {description ? (
            <p className="text-ink-700 mt-1 text-sm leading-snug">{description}</p>
          ) : null}
        </div>
        <span className="font-display text-brand-700 text-3xl leading-none font-bold tabular-nums">
          {value}
        </span>
      </div>
      <Progress label={title} value={value} hideLabel tone="brand" size="md" />
      <div className="text-ink-300 flex justify-between text-[11px] tracking-wide tabular-nums">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </section>
  );
}
