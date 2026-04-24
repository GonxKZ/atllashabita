import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from './cn';

export interface StatProps extends ComponentPropsWithoutRef<'div'> {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    label: string;
  };
}

const TREND_COLOR: Record<'up' | 'down' | 'flat', string> = {
  up: 'text-emerald-600',
  down: 'text-rose-600',
  flat: 'text-ink-500',
};

export function Stat({ label, value, hint, trend, className, ...rest }: StatProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 rounded-2xl bg-white p-4',
        'border border-[color:var(--color-line-soft)]',
        className
      )}
      {...rest}
    >
      <span className="text-ink-500 text-xs font-medium tracking-wide uppercase">{label}</span>
      <span className="font-display text-ink-900 text-2xl font-bold">{value}</span>
      <div className="flex items-center gap-2 text-xs">
        {trend ? (
          <span className={cn('font-semibold', TREND_COLOR[trend.direction])}>{trend.label}</span>
        ) : null}
        {hint ? <span className="text-ink-500">{hint}</span> : null}
      </div>
    </div>
  );
}
