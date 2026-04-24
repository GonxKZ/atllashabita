import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from './cn';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'subtle';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ComponentPropsWithoutRef<'button'> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-500 text-white shadow-[0_10px_24px_-14px_rgba(16,185,129,0.65)] hover:bg-brand-600 active:bg-brand-700 disabled:bg-brand-300 disabled:text-white/80',
  secondary:
    'bg-white text-ink-700 border border-[color:var(--color-line-soft)] hover:border-brand-300 hover:text-brand-700 active:bg-surface-muted disabled:text-ink-300 disabled:border-[color:var(--color-line-soft)]',
  ghost:
    'bg-transparent text-ink-700 hover:bg-surface-muted active:bg-surface-muted/80 disabled:text-ink-300',
  subtle:
    'bg-brand-50 text-brand-700 hover:bg-brand-100 active:bg-brand-200 disabled:text-brand-300',
};

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2.5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  fullWidth = false,
  className,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center rounded-full font-medium transition-colors',
        'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        fullWidth && 'w-full',
        className
      )}
      {...rest}
    >
      {leadingIcon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {leadingIcon}
        </span>
      ) : null}
      <span>{children}</span>
      {trailingIcon ? (
        <span aria-hidden="true" className="inline-flex shrink-0">
          {trailingIcon}
        </span>
      ) : null}
    </button>
  );
}
