import type { ComponentPropsWithoutRef } from 'react';
import { cn } from './cn';

export type SkeletonShape = 'rect' | 'circle' | 'text';

export interface SkeletonProps extends ComponentPropsWithoutRef<'div'> {
  shape?: SkeletonShape;
}

const SHAPE_STYLES: Record<SkeletonShape, string> = {
  rect: 'rounded-2xl',
  circle: 'rounded-full',
  text: 'rounded-md',
};

export function Skeleton({ shape = 'rect', className, ...rest }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      data-testid="skeleton"
      className={cn(
        'bg-surface-muted relative overflow-hidden',
        'before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.6s_infinite]',
        'before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent',
        SHAPE_STYLES[shape],
        className
      )}
      {...rest}
    />
  );
}
