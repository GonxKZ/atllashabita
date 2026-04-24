import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from './cn';

export type TagTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger' | 'info';
export type TagSize = 'sm' | 'md';

export interface TagProps extends ComponentPropsWithoutRef<'span'> {
  tone?: TagTone;
  size?: TagSize;
  icon?: ReactNode;
}

const TONE_STYLES: Record<TagTone, string> = {
  neutral: 'bg-surface-muted text-ink-700 border-[color:var(--color-line-soft)]',
  brand: 'bg-brand-50 text-brand-700 border-brand-100',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  warning: 'bg-amber-50 text-amber-700 border-amber-100',
  danger: 'bg-rose-50 text-rose-700 border-rose-100',
  info: 'bg-sky-50 text-sky-700 border-sky-100',
};

const SIZE_STYLES: Record<TagSize, string> = {
  sm: 'h-6 px-2.5 text-xs gap-1',
  md: 'h-7 px-3 text-sm gap-1.5',
};

export function Tag({
  tone = 'neutral',
  size = 'sm',
  icon,
  className,
  children,
  ...rest
}: TagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-medium whitespace-nowrap',
        TONE_STYLES[tone],
        SIZE_STYLES[size],
        className
      )}
      {...rest}
    >
      {icon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {icon}
        </span>
      ) : null}
      {children}
    </span>
  );
}
