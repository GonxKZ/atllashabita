import type { ComponentPropsWithoutRef } from 'react';
import { cn } from './cn';

export type AvatarSize = 'sm' | 'md' | 'lg';

export interface AvatarProps extends ComponentPropsWithoutRef<'span'> {
  /** URL de la imagen. Si falta, se muestran las iniciales de `name`. */
  src?: string;
  /** Nombre completo usado para `alt` y fallback con iniciales. */
  name: string;
  size?: AvatarSize;
}

const SIZE_STYLES: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

export function Avatar({ src, name, size = 'md', className, ...rest }: AvatarProps) {
  const hasImage = Boolean(src);
  return (
    <span
      role="img"
      aria-label={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full',
        'bg-brand-100 text-brand-700 font-semibold',
        SIZE_STYLES[size],
        className
      )}
      {...rest}
    >
      {hasImage ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        <span aria-hidden="true">{getInitials(name)}</span>
      )}
    </span>
  );
}
