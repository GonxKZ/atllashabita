import type { ComponentPropsWithoutRef, ElementType, ReactNode } from 'react';
import { cn } from './cn';

export type CardTone = 'base' | 'soft' | 'brand' | 'outline';
export type CardPadding = 'none' | 'sm' | 'md' | 'lg';

export interface CardProps extends ComponentPropsWithoutRef<'div'> {
  tone?: CardTone;
  padding?: CardPadding;
  interactive?: boolean;
  as?: 'div' | 'section' | 'article' | 'aside';
}

const TONE_STYLES: Record<CardTone, string> = {
  base: 'bg-white border border-[color:var(--color-line-soft)] shadow-[var(--shadow-card)]',
  soft: 'bg-surface-raised border border-[color:var(--color-line-soft)]',
  brand: 'bg-brand-500 text-white border border-brand-600',
  outline: 'bg-transparent border border-[color:var(--color-line-soft)]',
};

const PADDING_STYLES: Record<CardPadding, string> = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

export function Card({
  tone = 'base',
  padding = 'md',
  interactive = false,
  as,
  className,
  children,
  ...rest
}: CardProps) {
  const Component: ElementType = as ?? 'div';
  return (
    <Component
      className={cn(
        'rounded-3xl transition-shadow',
        TONE_STYLES[tone],
        PADDING_STYLES[padding],
        interactive &&
          'cursor-pointer focus-within:shadow-[var(--shadow-elevated)] hover:shadow-[var(--shadow-elevated)]',
        className
      )}
      {...rest}
    >
      {children}
    </Component>
  );
}

export interface CardHeaderProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({ title, subtitle, action, className, ...rest }: CardHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)} {...rest}>
      <div>
        <h3 className="font-display text-ink-900 text-base font-semibold">{title}</h3>
        {subtitle ? <p className="text-ink-500 mt-1 text-sm">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
