import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from './cn';

export interface ErrorStateProps extends ComponentPropsWithoutRef<'div'> {
  title: string;
  description?: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}

export function ErrorState({
  title,
  description,
  icon,
  action,
  className,
  ...rest
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-3xl bg-rose-50 p-10 text-center',
        'border border-rose-100',
        className
      )}
      {...rest}
    >
      {icon ? (
        <span aria-hidden="true" className="rounded-full bg-rose-100 p-3 text-rose-600">
          {icon}
        </span>
      ) : null}
      <h3 className="font-display text-lg font-semibold text-rose-700">{title}</h3>
      {description ? <p className="max-w-sm text-sm text-rose-700/80">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
