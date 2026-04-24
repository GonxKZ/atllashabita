import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from './cn';

export interface EmptyStateProps extends ComponentPropsWithoutRef<'div'> {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  ...rest
}: EmptyStateProps) {
  return (
    <div
      role="status"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-3xl bg-white p-10 text-center',
        'border border-dashed border-[color:var(--color-line-soft)]',
        className
      )}
      {...rest}
    >
      {icon ? (
        <span aria-hidden="true" className="bg-brand-50 text-brand-600 rounded-full p-3">
          {icon}
        </span>
      ) : null}
      <h3 className="font-display text-ink-900 text-lg font-semibold">{title}</h3>
      {description ? <p className="text-ink-500 max-w-sm text-sm">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
