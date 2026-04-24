import type { ComponentPropsWithoutRef } from 'react';
import { cn } from './cn';

export type BadgeTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

export interface BadgeProps extends ComponentPropsWithoutRef<'span'> {
  tone?: BadgeTone;
  /** Si se habilita, muestra un punto a la izquierda indicando estado. */
  dot?: boolean;
}

const TONE_STYLES: Record<BadgeTone, { bg: string; text: string; dot: string }> = {
  neutral: { bg: 'bg-surface-muted', text: 'text-ink-700', dot: 'bg-ink-500' },
  brand: { bg: 'bg-brand-100', text: 'text-brand-700', dot: 'bg-brand-500' },
  success: { bg: 'bg-emerald-100', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-800', dot: 'bg-amber-500' },
  danger: { bg: 'bg-rose-100', text: 'text-rose-700', dot: 'bg-rose-500' },
};

export function Badge({ tone = 'neutral', dot = false, className, children, ...rest }: BadgeProps) {
  const palette = TONE_STYLES[tone];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold',
        palette.bg,
        palette.text,
        className
      )}
      {...rest}
    >
      {dot ? (
        <span aria-hidden="true" className={cn('h-1.5 w-1.5 rounded-full', palette.dot)} />
      ) : null}
      {children}
    </span>
  );
}
