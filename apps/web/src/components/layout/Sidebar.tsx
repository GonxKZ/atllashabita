/* eslint-disable no-undef -- MediaQueryListEvent es global del navegador. */
import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Compass,
  Home,
  LayoutGrid,
  Layers,
  Map as MapIcon,
  SlidersHorizontal,
} from 'lucide-react';
import { MotionStagger } from '../motion';
import { cn } from '../ui/cn';
import { LayersPanel, type LayerOption } from './LayersPanel';
import { UserCard } from './UserCard';

/**
 * AtlasHabita · Sidebar Atelier (M12, issue #116)
 *
 * Sidebar colapsable. En desktop ancho (>=1280px) muestra el modo
 * "expandido" (288px) con marca + nav + capas + usuario; al pasar a
 * tablet (<1280px) o cuando el usuario hace hover-out, se colapsa a
 * `72px` mostrando solo iconos. Cada item del nav lleva un tooltip
 * accesible (aria-label + atributo title) en español.
 *
 * Decisiones:
 *  - Estado controlado por `useState` interno con autodetección viewport
 *    para arrancar con el modo correcto. El layout padre puede forzar
 *    el modo vía `defaultCollapsed` o `collapsed`.
 *  - El item activo se deduce de `useLocation` (no requiere prop).
 *  - El componente expone un botón explícito para colapsar/expandir,
 *    pensado para usuarios que prefieren pin la navegación.
 *  - Tooltips: implementados como combinación nativa (title + aria-label)
 *    para no acoplar el shell a Radix/Tippy en este milestone (lo añade
 *    el TM-B junto con el command palette).
 */

export interface SidebarNavItem {
  id: string;
  label: string;
  icon: ReactNode;
  href?: string;
}

export interface SidebarProps {
  navItems?: SidebarNavItem[];
  layers?: LayerOption[];
  activeNavId?: string;
  userName?: string;
  userSubtitle?: string;
  userAvatarUrl?: string;
  /** Si se omite, se calcula a partir del viewport. */
  collapsed?: boolean;
  defaultCollapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  className?: string;
}

const DEFAULT_NAV: SidebarNavItem[] = [
  { id: 'home', label: 'Inicio', icon: <Home size={18} />, href: '/' },
  { id: 'map', label: 'Explorar mapa', icon: <MapIcon size={18} />, href: '/mapa' },
  { id: 'recommender', label: 'Recomendador', icon: <Compass size={18} />, href: '/ranking' },
  { id: 'comparator', label: 'Comparador', icon: <LayoutGrid size={18} />, href: '/comparador' },
  {
    id: 'scenarios',
    label: 'Escenarios',
    icon: <SlidersHorizontal size={18} />,
    href: '/sparql',
  },
];

const DEFAULT_LAYERS: LayerOption[] = [
  { id: 'housing', label: 'Vivienda asequible', checked: true },
  { id: 'jobs', label: 'Empleo', checked: true },
  { id: 'connectivity', label: 'Conectividad', checked: false },
  { id: 'transport', label: 'Transporte público', checked: false },
  { id: 'education', label: 'Educación', checked: false },
];

const COLLAPSE_BREAKPOINT_PX = 1280;

/** Mapea rutas activas a navItem id para subrayar el item correcto. */
function detectActiveId(pathname: string): string | null {
  if (pathname === '/' || pathname === '') return 'home';
  if (pathname.startsWith('/mapa')) return 'map';
  if (pathname.startsWith('/ranking') || pathname.startsWith('/recomendador')) return 'recommender';
  if (pathname.startsWith('/comparador')) return 'comparator';
  if (pathname.startsWith('/sparql') || pathname.startsWith('/escenarios')) return 'scenarios';
  if (pathname.startsWith('/territorio')) return 'recommender';
  return null;
}

function useResponsiveCollapse(initial: boolean | undefined): boolean {
  // Si el llamador fija un valor inicial explícito, respétalo. En otro
  // caso, autodetecta el viewport y reacciona al resize.
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof initial === 'boolean') return initial;
    if (typeof window === 'undefined') return false;
    return window.innerWidth < COLLAPSE_BREAKPOINT_PX;
  });

  useEffect(() => {
    if (typeof initial === 'boolean') return; // controlado externamente
    if (typeof window === 'undefined') return;
    // jsdom puede omitir `matchMedia`; degradamos a la lectura inicial
    // sin suscripción cuando no está disponible.
    if (typeof window.matchMedia !== 'function') {
      setCollapsed(window.innerWidth < COLLAPSE_BREAKPOINT_PX);
      return;
    }

    const mq = window.matchMedia(`(max-width: ${COLLAPSE_BREAKPOINT_PX - 1}px)`);
    const handler = (event: MediaQueryListEvent) => setCollapsed(event.matches);
    setCollapsed(mq.matches);
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', handler);
      return () => mq.removeEventListener('change', handler);
    }
    return undefined;
  }, [initial]);

  return collapsed;
}

export function Sidebar({
  navItems = DEFAULT_NAV,
  layers = DEFAULT_LAYERS,
  activeNavId,
  userName = 'Alex Romero',
  userSubtitle = 'Cuenta personal',
  userAvatarUrl,
  collapsed: collapsedProp,
  defaultCollapsed,
  onCollapsedChange,
  className,
}: SidebarProps) {
  const responsiveCollapsed = useResponsiveCollapse(defaultCollapsed);
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(responsiveCollapsed);

  // Sincroniza el estado interno con el detectado por viewport. Se ejecuta
  // sólo cuando el viewport cambia y el usuario no ha pulsado el toggle.
  useEffect(() => {
    if (typeof collapsedProp === 'boolean') return;
    setInternalCollapsed(responsiveCollapsed);
  }, [collapsedProp, responsiveCollapsed]);

  const collapsed = typeof collapsedProp === 'boolean' ? collapsedProp : internalCollapsed;

  const toggleCollapsed = () => {
    const next = !collapsed;
    if (typeof collapsedProp !== 'boolean') {
      setInternalCollapsed(next);
    }
    onCollapsedChange?.(next);
  };

  const [layerState, setLayerState] = useState<LayerOption[]>(layers);
  const location = useLocation();
  // Si el llamador no fija `activeNavId`, el item activo se deduce de la ruta
  // actual: así el subrayado moss sigue al usuario al navegar.
  const resolvedActive = activeNavId ?? detectActiveId(location.pathname) ?? 'home';

  return (
    <aside
      aria-label="Barra lateral"
      data-collapsed={collapsed ? 'true' : 'false'}
      // Atelier: linen-0 con borde derecho cálido, ancho responsivo.
      // 18rem (288px) en expandido, 4.5rem (72px) en colapsado.
      className={cn(
        'scroll-soft flex h-full shrink-0 flex-col gap-7 border-r',
        'border-[color:var(--color-line-soft)] bg-[color:var(--color-linen-0)]',
        'pt-6 pb-5 transition-[width] duration-300 ease-out',
        collapsed ? 'w-[72px] px-3' : 'w-72 px-5',
        className
      )}
    >
      <div className="flex items-center gap-2.5">
        <Link
          to="/"
          className="flex items-center gap-2.5 focus-visible:rounded-xl focus-visible:outline-none"
          aria-label="AtlasHabita, ir a inicio"
          title="AtlasHabita"
        >
          <span
            aria-hidden="true"
            className={cn(
              'inline-flex h-9 w-9 items-center justify-center rounded-xl text-white',
              'bg-[color:var(--color-moss-500)] shadow-[0_8px_18px_-12px_color-mix(in_srgb,var(--color-moss-500)_65%,transparent)]'
            )}
          >
            <Layers size={18} strokeWidth={2.25} />
          </span>
          {!collapsed ? (
            <span className="font-display text-[17px] leading-none font-semibold tracking-[-0.02em] text-[color:var(--color-linen-900)]">
              AtlasHabita
            </span>
          ) : null}
        </Link>
        {!collapsed ? (
          <button
            type="button"
            onClick={toggleCollapsed}
            aria-label="Contraer barra lateral"
            title="Contraer barra lateral"
            className={cn(
              'ml-auto inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors',
              'bg-[color:var(--color-linen-100)] text-[color:var(--color-linen-700)]',
              'hover:bg-[color:var(--color-moss-100)] hover:text-[color:var(--color-moss-700)]',
              'focus-visible:ring-2 focus-visible:ring-[color:var(--color-moss-300)] focus-visible:outline-none'
            )}
          >
            <ChevronLeft size={14} aria-hidden="true" />
          </button>
        ) : null}
      </div>

      {collapsed ? (
        <button
          type="button"
          onClick={toggleCollapsed}
          aria-label="Expandir barra lateral"
          title="Expandir barra lateral"
          className={cn(
            'mx-auto inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors',
            'bg-[color:var(--color-linen-100)] text-[color:var(--color-linen-700)]',
            'hover:bg-[color:var(--color-moss-100)] hover:text-[color:var(--color-moss-700)]',
            'focus-visible:ring-2 focus-visible:ring-[color:var(--color-moss-300)] focus-visible:outline-none'
          )}
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      ) : null}

      <nav aria-label="Navegación principal">
        <MotionStagger
          as="ul"
          className="flex flex-col gap-1"
          duration={0.45}
          stagger={0.05}
          y={12}
        >
          {navItems.map((item) => {
            const isActive = item.id === resolvedActive;
            return (
              <li key={item.id}>
                <Link
                  to={item.href ?? '/'}
                  aria-current={isActive ? 'page' : undefined}
                  aria-label={item.label}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    'group flex items-center rounded-2xl text-sm font-medium transition-colors',
                    'focus-visible:ring-2 focus-visible:ring-[color:var(--color-moss-300)] focus-visible:outline-none',
                    collapsed ? 'justify-center p-1.5' : 'gap-3 px-2.5 py-2',
                    isActive
                      ? 'bg-[color:var(--color-moss-50)] text-[color:var(--color-moss-700)]'
                      : 'text-[color:var(--color-linen-700)] hover:bg-[color:var(--color-linen-100)] hover:text-[color:var(--color-linen-900)]'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-xl transition-colors',
                      isActive
                        ? 'bg-[color:var(--color-moss-500)] text-white shadow-[0_6px_12px_-8px_color-mix(in_srgb,var(--color-moss-500)_65%,transparent)]'
                        : 'bg-[color:var(--color-linen-100)] text-[color:var(--color-linen-600)] group-hover:text-[color:var(--color-linen-900)]'
                    )}
                  >
                    {item.icon}
                  </span>
                  {!collapsed ? (
                    <span className="tracking-[-0.005em]">{item.label}</span>
                  ) : (
                    <span className="sr-only">{item.label}</span>
                  )}
                </Link>
              </li>
            );
          })}
        </MotionStagger>
      </nav>

      {!collapsed ? (
        <LayersPanel
          title="Capas activas"
          layers={layerState}
          onChange={(id, checked) =>
            setLayerState((prev) =>
              prev.map((layer) => (layer.id === id ? { ...layer, checked } : layer))
            )
          }
        />
      ) : null}

      <div className="mt-auto">
        {collapsed ? (
          <div
            aria-label={`Sesión de ${userName}`}
            title={userName}
            className={cn(
              'mx-auto inline-flex h-9 w-9 items-center justify-center rounded-full',
              'bg-[color:var(--color-moss-100)] text-sm font-semibold text-[color:var(--color-moss-700)]'
            )}
          >
            {userName
              .split(' ')
              .map((part) => part[0])
              .join('')
              .slice(0, 2)
              .toUpperCase()}
          </div>
        ) : (
          <UserCard
            name={userName}
            subtitle={userSubtitle}
            avatarUrl={userAvatarUrl}
            indicator={{ label: 'Índice actual', value: 74 }}
            action={{ label: 'Explorar Premium', icon: <BarChart3 size={14} /> }}
          />
        )}
      </div>
    </aside>
  );
}
