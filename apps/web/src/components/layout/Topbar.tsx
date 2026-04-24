import { useId, useRef, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, LogIn, LogOut, MessageCircle, Search, UserCircle } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { resolveDuration } from '@/animations';
import { useAuthStore } from '../../state/auth';
import { Avatar } from '../ui/Avatar';
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
  const headerRef = useRef<HTMLElement | null>(null);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  // Entrada suave del topbar desde arriba. Se cancela solo cuando el
  // usuario solicita reducir el movimiento.
  useGSAP(
    () => {
      const node = headerRef.current;
      if (!node) return;
      gsap.from(node, {
        y: -18,
        opacity: 0,
        duration: resolveDuration(0.5),
        ease: 'power2.out',
        clearProps: 'transform,opacity',
      });
    },
    { scope: headerRef }
  );

  return (
    <header
      ref={(node) => {
        headerRef.current = node;
      }}
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
        {user ? (
          <div className="flex items-center gap-2">
            <Link
              to="/cuenta"
              aria-label={`Ir a mi cuenta de ${user.name}`}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border border-[color:var(--color-line-soft)] bg-white px-2 py-1 pr-3',
                'text-ink-700 hover:text-brand-700 hover:border-brand-300 transition-colors',
                'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:outline-none'
              )}
            >
              <Avatar name={user.name} src={user.avatarUrl} size="sm" />
              <span className="max-w-[8rem] truncate text-sm font-medium">
                {user.name.split(' ')[0]}
              </span>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={<LogOut size={16} />}
              onClick={() => signOut()}
            >
              Cerrar sesión
            </Button>
          </div>
        ) : (
          <Link
            to="/login"
            aria-label="Iniciar sesión"
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors',
              'text-ink-700 hover:border-brand-300 hover:text-brand-700 border border-[color:var(--color-line-soft)] bg-white',
              'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:ring-offset-2'
            )}
          >
            <LogIn aria-hidden="true" size={16} />
            <span>Iniciar sesión</span>
          </Link>
        )}
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

// Mantengo `UserCircle` re-exportado en caso de futuras vistas que reutilicen
// el icono. Sirve también para que tree-shaking no descarte el lucide cuando
// otras vistas lo necesiten.
export const TopbarUserIcon = UserCircle;
