import { useId, useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { resolveDuration } from '@/animations';
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
  const rootRef = useRef<HTMLElement | null>(null);

  /*
   * Animamos la entrada del indicador desplegándolo desde escala 0.98 y
   * un fade muy corto. No tocamos la barra de progreso directamente para
   * no pisar estilos que controla el sistema de diseño.
   */
  useGSAP(
    () => {
      const node = rootRef.current;
      if (!node) return;
      gsap.from(node, {
        opacity: 0,
        scale: 0.98,
        y: 8,
        duration: resolveDuration(0.4),
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      });
    },
    { scope: rootRef, dependencies: [value] }
  );

  return (
    <section
      ref={(node) => {
        rootRef.current = node;
      }}
      aria-labelledby={titleId}
      className={cn(
        'flex flex-col gap-2 rounded-2xl bg-white p-4',
        'border border-[color:var(--color-line-soft)]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 id={titleId} className="text-ink-500 text-xs font-semibold tracking-wide uppercase">
            {title}
          </h3>
          {description ? <p className="text-ink-900 mt-1 text-sm">{description}</p> : null}
        </div>
        <span className="font-display text-brand-700 text-2xl font-bold">{value}</span>
      </div>
      <Progress label={title} value={value} hideLabel tone="brand" size="md" />
      <div className="text-ink-500 flex justify-between text-[11px] uppercase">
        <span>0</span>
        <span>50</span>
        <span>100</span>
      </div>
    </section>
  );
}
