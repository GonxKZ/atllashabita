/* eslint-disable no-undef -- KeyboardEvent y HTMLInputElement son globales del navegador. */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bell, Command, LogOut, MessageCircle, Search, UserRound } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

import { resolveDuration } from '@/animations';
import { useAuthStore } from '../../state/auth';
import { Avatar } from '../ui/Avatar';
import { Button } from '../ui/Button';
import { IconButton } from '../ui/IconButton';
import { cn } from '../ui/cn';
import { Breadcrumbs, type BreadcrumbItem } from './Breadcrumbs';

/**
 * AtlasHabita · Topbar Atelier (M12, issue #116)
 *
 * Topbar flotante con glass cálido. Combina migas de pan a la izquierda,
 * búsqueda inline con hint de comando ⌘K, acciones rápidas a la derecha y
 * un CTA primario "Nuevo análisis". El propio elemento <header> usa
 * `position: sticky` y un margen exterior para flotar sobre el contenido.
 *
 * Decisiones:
 *  - El glass se aplica vía la clase utilitaria `.surface-glass` para que
 *    `prefers-reduced-transparency` la convierta en sólida.
 *  - El comando ⌘K aún no abre nada (lo monta el TM-B). Aquí dejamos el
 *    hint visual + el handler de teclado preparado para escuchar `mod+k`.
 *  - Breadcrumbs se mostrará sólo cuando el usuario abandone la home;
 *    en `/`, el componente Breadcrumbs decide retornar null por sí mismo.
 */

export interface TopbarProps {
  placeholder?: string;
  onSearch?: (value: string) => void;
  onFeedback?: () => void;
  onNotifications?: () => void;
  onNewAnalysis?: () => void;
  /** Migas explícitas; en su ausencia se infiere desde la URL. */
  breadcrumbs?: BreadcrumbItem[];
  /**
   * Callback opcional para abrir el command palette desde el topbar.
   * Si se proporciona, el botón ⌘K se vuelve interactivo.
   */
  onOpenCommandPalette?: () => void;
  extra?: ReactNode;
  className?: string;
}

const SHORTCUT_LABEL = 'Ver atajos rápidos…';

export function Topbar({
  placeholder = 'Buscar municipio o territorio…',
  onSearch,
  onFeedback,
  onNotifications,
  onNewAnalysis,
  breadcrumbs,
  onOpenCommandPalette,
  extra,
  className,
}: TopbarProps) {
  const inputId = useId();
  const headerRef = useRef<HTMLElement | null>(null);
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);

  // Detección Mac vs PC para el indicador del modificador.
  const [isMac, setIsMac] = useState<boolean>(false);
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsMac(/Mac|iPhone|iPod|iPad/i.test(navigator.platform));
  }, []);

  // Atajo global ⌘K / Ctrl+K — sólo se conecta si hay handler.
  useEffect(() => {
    if (!onOpenCommandPalette) return;
    const handler = (event: KeyboardEvent) => {
      const isModK = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isModK) {
        event.preventDefault();
        onOpenCommandPalette();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpenCommandPalette]);

  // Entrada suave del topbar desde arriba. Se cancela solo cuando el
  // usuario solicita reducir el movimiento (ver `resolveDuration`).
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
      data-testid="atelier-topbar"
      className={cn(
        // Topbar flotante: el wrapper externo aporta el padding y el
        // interno la pieza glass. La altura efectiva ronda los 64-72px.
        'sticky top-0 z-30 w-full px-3 pt-3 sm:px-4 md:px-5',
        className
      )}
    >
      <div
        className={cn(
          'mx-auto flex min-h-14 w-full max-w-[1120px] items-center gap-2 rounded-[28px] border px-2.5 py-2 sm:gap-3 md:px-3',
          'border-[color:color-mix(in_srgb,var(--color-line-soft)_95%,var(--color-linen-700)_5%)]',
          'bg-[color:color-mix(in_srgb,var(--color-linen-0)_94%,var(--color-brand-50)_6%)]/95 shadow-[0_18px_46px_-30px_rgba(15,23,42,0.55)] backdrop-blur-xl supports-[backdrop-filter]:bg-[color:color-mix(in_srgb,var(--color-linen-0)_88%,var(--color-brand-50)_12%)]/90'
        )}
      >
        <div className="hidden max-w-[24%] min-w-0 shrink-0 items-center xl:flex">
          <Breadcrumbs items={breadcrumbs} />
        </div>

        <form
          role="search"
          /*
           * `action` (React 19) recibe el `FormData` y previene el submit
           * por defecto sin requerir `event.preventDefault()`. Mejora la
           * accesibilidad porque el formulario sigue siendo válido y el
           * navegador puede aplicar autofill/keyboard hints
           * (`react-doctor/no-prevent-default`). El narrowing del valor
           * se hace en el propio `FormData.get`, sin asumir que el input
           * existe ni el tipo del candidato.
           */
          action={(formData: FormData) => {
            const value = formData.get('query');
            onSearch?.(typeof value === 'string' ? value : '');
          }}
          className="relative min-w-0 flex-1"
        >
          <label htmlFor={inputId} className="sr-only">
            Buscar en AtlasHabita
          </label>
          <Search
            aria-hidden="true"
            size={16}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-[color:var(--color-linen-500)]"
          />
          <input
            id={inputId}
            name="query"
            type="search"
            placeholder={placeholder}
            aria-label="Buscar en AtlasHabita"
            className={cn(
              'h-10 w-full rounded-full pr-12 pl-9 text-[13px] sm:pr-20',
              'bg-[color:var(--color-linen-0)]',
              'text-[color:var(--color-linen-900)] placeholder:text-[color:var(--color-linen-500)]',
              'border border-[color:color-mix(in_srgb,var(--color-linen-700)_10%,transparent)] transition-colors',
              'hover:border-[color:var(--color-moss-300)]',
              'focus:border-[color:var(--color-moss-500)] focus:bg-[color:var(--color-linen-0)] focus:outline-none',
              'focus:ring-4 focus:ring-[color:color-mix(in_srgb,var(--color-moss-300)_30%,transparent)]'
            )}
          />
          <button
            type="button"
            onClick={onOpenCommandPalette}
            aria-label={SHORTCUT_LABEL}
            title={SHORTCUT_LABEL}
            className={cn(
              'absolute top-1/2 right-2 -translate-y-1/2',
              'hidden items-center gap-1 rounded-full px-2 py-0.5 sm:inline-flex',
              'bg-[color:color-mix(in_srgb,var(--color-linen-100)_70%,transparent)]',
              'text-[11px] font-medium text-[color:var(--color-linen-700)]',
              'border border-[color:color-mix(in_srgb,var(--color-linen-700)_10%,transparent)]',
              'transition-colors hover:bg-[color:var(--color-moss-100)] hover:text-[color:var(--color-moss-700)]',
              'focus-visible:ring-2 focus-visible:ring-[color:var(--color-moss-300)] focus-visible:outline-none'
            )}
          >
            <Command aria-hidden="true" size={11} />
            <span aria-hidden="true">{isMac ? '⌘' : 'Ctrl'}</span>
            <span aria-hidden="true">K</span>
            <span className="sr-only">{SHORTCUT_LABEL}</span>
          </button>
        </form>

        <nav aria-label="Acciones" className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
          <span className="hidden min-w-0 lg:inline-flex">{extra}</span>
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<MessageCircle size={16} />}
            onClick={onFeedback}
            className="hidden text-[color:var(--color-linen-700)] hover:text-[color:var(--color-moss-700)] lg:inline-flex"
          >
            Feedback
          </Button>
          <IconButton
            label="Notificaciones"
            icon={<Bell size={18} />}
            variant="secondary"
            size="md"
            onClick={onNotifications}
          />
          {user ? (
            <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
              <Link
                to="/cuenta"
                aria-label={`Ir a mi cuenta de ${user.name}`}
                className={cn(
                  'inline-flex items-center gap-2 rounded-full border bg-[color:var(--color-linen-0)] px-2 py-1 pr-3',
                  'border-[color:var(--color-line-soft)] text-[color:var(--color-linen-700)]',
                  'transition-colors hover:border-[color:var(--color-moss-300)] hover:text-[color:var(--color-moss-700)]',
                  'focus-visible:ring-2 focus-visible:ring-[color:var(--color-moss-300)] focus-visible:outline-none'
                )}
              >
                <Avatar name={user.name} src={user.avatarUrl} size="sm" />
                <span className="hidden max-w-[5.5rem] truncate text-sm font-medium xl:inline">
                  {user.name.split(' ')[0]}
                </span>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                leadingIcon={<LogOut size={16} />}
                onClick={() => signOut()}
                className="hidden xl:inline-flex"
              >
                Cerrar sesión
              </Button>
            </div>
          ) : (
            <Link
              to="/cuenta"
              aria-label="Abrir cuenta"
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full px-2.5 text-sm font-medium transition-colors sm:px-3',
                'border border-[color:var(--color-line-soft)] bg-[color:var(--color-linen-0)] text-[color:var(--color-linen-700)]',
                'hover:border-[color:var(--color-moss-300)] hover:text-[color:var(--color-moss-700)]',
                'focus-visible:ring-2 focus-visible:ring-[color:var(--color-moss-300)] focus-visible:ring-offset-2 focus-visible:outline-none'
              )}
            >
              <UserRound aria-hidden="true" size={16} />
              <span className="hidden xl:inline">Cuenta</span>
            </Link>
          )}
          <Button
            variant="primary"
            size="md"
            trailingIcon={<ArrowRight size={16} strokeWidth={2.25} />}
            onClick={onNewAnalysis}
            className="shrink-0 px-3 sm:px-4 max-[640px]:h-10 max-[640px]:w-10 max-[640px]:px-0"
          >
            <span className="hidden sm:inline">Nuevo análisis</span>
            <span className="sr-only sm:hidden">Nuevo análisis</span>
          </Button>
        </nav>
      </div>
    </header>
  );
}
