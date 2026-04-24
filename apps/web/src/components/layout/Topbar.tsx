import { useId, type ReactNode } from 'react';
import { Bell, MessageCircle, Plus, Search } from 'lucide-react';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { cn } from '../ui/cn';

export interface TopbarProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
  onFeedback?: () => void;
  onNewAnalysis?: () => void;
  extra?: ReactNode;
  className?: string;
}

export function Topbar({
  placeholder = 'Busca un municipio, provincia o punto de interés…',
  onSearch,
  onFeedback,
  onNewAnalysis,
  extra,
  className,
}: TopbarProps) {
  const inputId = useId();

  return (
    <header
      className={cn(
        'flex h-16 items-center gap-4 border-b border-[color:var(--color-line-soft)] bg-white px-6',
        className
      )}
    >
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          const input = event.currentTarget.elements.namedItem('query') as {
            value?: string;
          } | null;
          onSearch?.(input?.value ?? '');
        }}
        className="relative flex-1"
      >
        <label htmlFor={inputId} className="sr-only">
          Buscar en AtlasHabita
        </label>
        <Search
          aria-hidden="true"
          size={18}
          className="text-ink-500 pointer-events-none absolute top-1/2 left-4 -translate-y-1/2"
        />
        <input
          id={inputId}
          name="query"
          type="search"
          placeholder={placeholder}
          className={cn(
            'bg-surface-soft h-11 w-full rounded-full pr-4 pl-11 text-sm',
            'placeholder:text-ink-300 text-ink-900',
            'border border-transparent transition-colors',
            'hover:border-[color:var(--color-line-soft)]',
            'focus:border-brand-300 focus:bg-white focus:outline-none'
          )}
        />
      </form>

      <nav aria-label="Acciones" className="flex items-center gap-2">
        {extra}
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<MessageCircle size={16} />}
          onClick={onFeedback}
        >
          Feedback
        </Button>
        <IconButton
          label="Notificaciones"
          icon={<Bell size={18} />}
          variant="secondary"
          size="md"
        />
        <Button
          variant="primary"
          size="md"
          leadingIcon={<Plus size={16} />}
          onClick={onNewAnalysis}
        >
          Nuevo análisis
        </Button>
      </nav>
    </header>
  );
}
