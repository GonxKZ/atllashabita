import { useId, type ReactNode } from 'react';
import { ArrowRight, Bell, MessageCircle, Search } from 'lucide-react';
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
      // h-16 + borde inferior coincide con la franja "topbar" del comp.
      // El contenedor es horizontal, con buscador a la izquierda y CTAs a
      // la derecha (Feedback + notificaciones + "Nuevo análisis").
      className={cn(
        'sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-[color:var(--color-line-soft)] bg-white/90 px-6 backdrop-blur',
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
        className="relative max-w-xl flex-1"
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
            'placeholder:text-ink-500 text-ink-900',
            'border border-[color:var(--color-line-soft)] transition-colors',
            'hover:border-brand-200',
            'focus:border-brand-400 focus:bg-white focus:outline-none',
            'focus:ring-brand-100 focus:ring-4'
          )}
        />
      </form>

      <nav aria-label="Acciones" className="ml-auto flex items-center gap-2">
        {extra}
        <Button
          variant="ghost"
          size="sm"
          leadingIcon={<MessageCircle size={16} />}
          onClick={onFeedback}
          // El comp muestra "Feedback" como texto ligero en gris medio,
          // alineado con la altura del input y separado del CTA primario.
          className="text-ink-700 hover:text-brand-700"
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
          trailingIcon={<ArrowRight size={16} strokeWidth={2.25} />}
          onClick={onNewAnalysis}
          // CTA pixel-perfect: el botón de la captura tiene una flecha al
          // final ("Nuevo análisis →"). Mantengo el `Plus` fuera y uso un
          // `ArrowRight` compacto como `trailingIcon` para igualar el comp.
        >
          Nuevo análisis
        </Button>
      </nav>
    </header>
  );
}
