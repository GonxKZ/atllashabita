import type { ReactNode } from 'react';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { cn } from '../ui/cn';

export interface UserCardProps {
  name: string;
  subtitle?: string;
  avatarUrl?: string;
  indicator?: {
    label: string;
    /** Valor 0-100 mostrado como chip. */
    value: number;
  };
  action?: {
    label: string;
    icon?: ReactNode;
    onClick?: () => void;
  };
  className?: string;
}

export function UserCard({
  name,
  subtitle,
  avatarUrl,
  indicator,
  action,
  className,
}: UserCardProps) {
  return (
    <div
      className={cn(
        'bg-surface-soft flex flex-col gap-3 rounded-2xl p-3',
        'border border-[color:var(--color-line-soft)]',
        className
      )}
    >
      <div className="flex items-center gap-3">
        <Avatar name={name} src={avatarUrl} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-ink-900 truncate text-sm font-semibold">Hola, {name.split(' ')[0]}</p>
          {subtitle ? <p className="text-ink-500 truncate text-xs">{subtitle}</p> : null}
        </div>
        {indicator ? (
          <span className="bg-brand-50 text-brand-700 rounded-full px-2 py-0.5 text-xs font-semibold">
            {indicator.value}
          </span>
        ) : null}
      </div>
      {action ? (
        <Button
          variant="subtle"
          size="sm"
          fullWidth
          leadingIcon={action.icon}
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      ) : null}
    </div>
  );
}
