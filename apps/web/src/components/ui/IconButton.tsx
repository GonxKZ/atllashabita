import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from './cn';

export type IconButtonVariant = 'primary' | 'secondary' | 'ghost';
export type IconButtonSize = 'sm' | 'md' | 'lg';

export interface IconButtonProps extends ComponentPropsWithoutRef<'button'> {
  /** Etiqueta accesible obligatoria: el botón sólo contiene un icono. */
  label: string;
  icon: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const VARIANT_STYLES: Record<IconButtonVariant, string> = {
  primary: 'bg-brand-500 text-white hover:bg-brand-600 active:bg-brand-700',
  secondary:
    'bg-white text-ink-700 border border-[color:var(--color-line-soft)] hover:border-brand-300 hover:text-brand-700',
  ghost: 'bg-transparent text-ink-500 hover:bg-surface-muted hover:text-ink-900',
};

const SIZE_STYLES: Record<IconButtonSize, string> = {
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
};

export function IconButton({
  label,
  icon,
  variant = 'ghost',
  size = 'md',
  className,
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full transition-colors',
        'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:ring-offset-2',
        'disabled:cursor-not-allowed disabled:opacity-60',
        VARIANT_STYLES[variant],
        SIZE_STYLES[size],
        className
      )}
      {...rest}
    >
      <span aria-hidden="true" className="inline-flex">
        {icon}
      </span>
    </button>
  );
}
