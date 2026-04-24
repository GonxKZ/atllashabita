import { useRef, type ReactNode } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { resolveDuration } from '@/animations';
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
  const groupRef = useRef<HTMLElement | null>(null);

  /*
   * Animación de entrada en cascada para los chips al montar el grupo.
   * Usamos `node.children` para evitar combinators `>` que algunos
   * entornos (JSDOM) no toleran en querySelectorAll.
   */
  useGSAP(
    () => {
      const node = groupRef.current;
      if (!node) return;
      const targets = Array.from(node.children);
      if (targets.length === 0) return;
      gsap.from(targets, {
        opacity: 0,
        y: 10,
        duration: resolveDuration(0.35),
        stagger: 0.05,
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      });
    },
    { scope: groupRef }
  );

  return (
    <div
      ref={(node) => {
        groupRef.current = node;
      }}
      role="group"
      aria-label={ariaLabel}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {options.map((option) => {
        const isActive = value.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            aria-pressed={isActive}
            onClick={() => onToggle?.(option.id)}
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-all',
              'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:ring-offset-2',
              tone === 'onBrand'
                ? // Variante sobre el hero verde: chip activa en blanco con
                  // texto brand-700, inactivas semitransparentes.
                  isActive
                  ? 'text-brand-700 bg-white shadow-[0_8px_16px_-10px_rgba(15,23,42,0.32)]'
                  : 'bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-sm hover:bg-white/25'
                : // Variante sobre fondo claro: el comp usa borde sutil
                  // y, al activarse, fondo verde sólido con texto blanco.
                  isActive
                  ? 'bg-brand-500 ring-brand-600 text-white shadow-[0_8px_16px_-10px_rgba(16,185,129,0.55)] ring-1'
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
