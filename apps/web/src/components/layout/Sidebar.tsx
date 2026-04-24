import { useState, type ReactNode } from 'react';
import {
  BarChart3,
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
  className?: string;
}

const DEFAULT_NAV: SidebarNavItem[] = [
  { id: 'home', label: 'Inicio', icon: <Home size={18} />, href: '#inicio' },
  { id: 'map', label: 'Explorar mapa', icon: <MapIcon size={18} />, href: '#mapa' },
  { id: 'recommender', label: 'Recomendador', icon: <Compass size={18} />, href: '#recomendador' },
  { id: 'comparator', label: 'Comparador', icon: <LayoutGrid size={18} />, href: '#comparador' },
  {
    id: 'scenarios',
    label: 'Escenarios',
    icon: <SlidersHorizontal size={18} />,
    href: '#escenarios',
  },
];

const DEFAULT_LAYERS: LayerOption[] = [
  { id: 'housing', label: 'Vivienda asequible', checked: true },
  { id: 'jobs', label: 'Empleo', checked: true },
  { id: 'connectivity', label: 'Conectividad', checked: false },
  { id: 'transport', label: 'Transporte público', checked: false },
  { id: 'education', label: 'Educación', checked: false },
];

export function Sidebar({
  navItems = DEFAULT_NAV,
  layers = DEFAULT_LAYERS,
  activeNavId = 'home',
  userName = 'Alex Romero',
  userSubtitle = 'Cuenta personal',
  userAvatarUrl,
  className,
}: SidebarProps) {
  const [layerState, setLayerState] = useState<LayerOption[]>(layers);

  return (
    <aside
      aria-label="Barra lateral"
      className={cn(
        'flex h-full w-72 shrink-0 flex-col gap-8 border-r border-[color:var(--color-line-soft)]',
        'bg-white px-5 py-6',
        className
      )}
    >
      <a href="#inicio" className="flex items-center gap-2.5" aria-label="AtlasHabita, ir a inicio">
        <span
          aria-hidden="true"
          className="bg-brand-500 inline-flex h-9 w-9 items-center justify-center rounded-xl text-white"
        >
          <Layers size={18} />
        </span>
        <span className="font-display text-ink-900 text-lg font-bold tracking-tight">
          AtlasHabita
        </span>
      </a>

      <nav aria-label="Navegación principal">
        <MotionStagger
          as="ul"
          className="flex flex-col gap-1"
          duration={0.45}
          stagger={0.05}
          y={12}
        >
          {navItems.map((item) => {
            const isActive = item.id === activeNavId;
            return (
              <li key={item.id}>
                <a
                  href={item.href ?? '#'}
                  aria-current={isActive ? 'page' : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-brand-50 text-brand-700'
                      : 'text-ink-500 hover:bg-surface-muted hover:text-ink-900'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-xl',
                      isActive ? 'bg-brand-500 text-white' : 'bg-surface-muted text-ink-500'
                    )}
                  >
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </a>
              </li>
            );
          })}
        </MotionStagger>
      </nav>

      <LayersPanel
        title="Capas activas"
        layers={layerState}
        onChange={(id, checked) =>
          setLayerState((prev) =>
            prev.map((layer) => (layer.id === id ? { ...layer, checked } : layer))
          )
        }
      />

      <div className="mt-auto space-y-4">
        <UserCard
          name={userName}
          subtitle={userSubtitle}
          avatarUrl={userAvatarUrl}
          indicator={{ label: 'Índice actual', value: 74 }}
          action={{ label: 'Explorar Premium', icon: <BarChart3 size={14} /> }}
        />
      </div>
    </aside>
  );
}
