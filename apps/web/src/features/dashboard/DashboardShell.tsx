import { useMemo, useState } from 'react';
import {
  Activity,
  BarChart3,
  Building2,
  GitCompareArrows,
  Map as MapIcon,
  Sparkles,
  Wallet,
  Wifi,
  Wrench,
} from 'lucide-react';
import { ActionCards, type ActionCardItem } from '@/components/layout/ActionCards';
import { ChipFilters, type ChipFilterOption } from '@/components/layout/ChipFilters';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OpportunityIndex } from '@/components/layout/OpportunityIndex';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader } from '@/components/ui/Card';
import { Tag } from '@/components/ui/Tag';
import { Skeleton } from '@/components/ui/Skeleton';

const CHIP_OPTIONS: ChipFilterOption[] = [
  { id: 'quality', label: 'Calidad de vida', icon: <Sparkles size={14} /> },
  { id: 'housing', label: 'Vivienda asequible', icon: <Building2 size={14} /> },
  { id: 'jobs', label: 'Empleo', icon: <Wallet size={14} /> },
  { id: 'connectivity', label: 'Conectividad', icon: <Wifi size={14} /> },
  { id: 'more', label: 'Más filtros', icon: <Wrench size={14} /> },
];

const ACTION_ITEMS: ActionCardItem[] = [
  {
    id: 'explore',
    title: 'Explorar',
    description: 'Recorre el mapa y descubre municipios que encajan con tu perfil.',
    icon: <MapIcon size={18} />,
    accent: 'brand',
    href: '#mapa',
  },
  {
    id: 'recommend',
    title: 'Recomendar',
    description: 'Obtén sugerencias personalizadas con explicaciones claras.',
    icon: <Sparkles size={18} />,
    accent: 'emerald',
    href: '#recomendador',
  },
  {
    id: 'compare',
    title: 'Comparar',
    description: 'Pon dos o más territorios cara a cara con indicadores medibles.',
    icon: <GitCompareArrows size={18} />,
    accent: 'sky',
    href: '#comparador',
  },
  {
    id: 'analyze',
    title: 'Analizar',
    description: 'Entra al modo técnico para SPARQL, SHACL y reportes avanzados.',
    icon: <BarChart3 size={18} />,
    accent: 'amber',
    href: '#modo-tecnico',
  },
];

/**
 * Dashboard principal. Ensambla el layout con Sidebar + Topbar + hero + panel
 * lateral + cards de acción. Usa datos mock y expone slots para que otros
 * teammates introduzcan el mapa real, el ranking y los widgets de tendencias.
 */
export function DashboardShell() {
  const [activeChips, setActiveChips] = useState<string[]>(['quality']);

  const hero = useMemo(
    () => (
      <section
        aria-labelledby="dashboard-title"
        className="from-brand-500 via-brand-500 to-brand-600 relative overflow-hidden rounded-3xl bg-gradient-to-br p-8 text-white shadow-[var(--shadow-elevated)]"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 -right-20 h-64 w-64 rounded-full bg-white/20 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl"
        />
        <div className="relative flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-3">
            <Tag tone="brand" size="md" className="border-transparent bg-white/15 text-white">
              <Sparkles size={14} aria-hidden="true" />
              Demo con datos abiertos
            </Tag>
            <Badge tone="success" className="border border-white/20 bg-white/15 text-white">
              Modelo explicable
            </Badge>
          </div>
          <div className="flex flex-col gap-3">
            <h1
              id="dashboard-title"
              className="font-display max-w-3xl text-3xl leading-tight font-bold sm:text-4xl"
            >
              Descubre el <span className="text-emerald-100">mejor lugar</span> para vivir en España
            </h1>
            <p className="max-w-xl text-base text-white/80">
              Explora, compara y encuentra tu lugar ideal con datos abiertos y tecnología semántica.
              Todo con explicaciones claras, sin cajas negras.
            </p>
          </div>
          <ChipFilters
            options={CHIP_OPTIONS}
            value={activeChips}
            tone="onBrand"
            onToggle={(id) =>
              setActiveChips((prev) =>
                prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
              )
            }
          />
          <Card
            tone="base"
            padding="none"
            className="text-ink-500 mt-2 flex min-h-72 items-center justify-center overflow-hidden"
          >
            <div className="flex w-full flex-col items-center gap-2 p-10 text-center">
              <MapIcon aria-hidden="true" size={28} className="text-brand-500" />
              <p className="text-ink-700 text-sm font-medium">Mapa interactivo en preparación</p>
              <p className="text-ink-500 text-xs">
                El slot del mapa y el ranking se enchufa desde otros módulos. Esta vista renderiza
                el shell, los tokens y las primitivas.
              </p>
            </div>
          </Card>
        </div>
      </section>
    ),
    [activeChips]
  );

  const side = (
    <>
      <Card tone="base" padding="md" className="flex flex-col gap-4">
        <CardHeader
          title="Recomendación destacada"
          subtitle="Coincide con tu perfil actual"
          action={<Badge tone="brand">Top 3</Badge>}
        />
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="bg-brand-50 text-brand-600 inline-flex h-12 w-12 items-center justify-center rounded-2xl"
          >
            <Building2 size={22} />
          </span>
          <div>
            <p className="font-display text-ink-900 text-base font-semibold">
              San Sebastián, Guipúzcoa
            </p>
            <p className="text-ink-500 text-xs">
              Conectividad alta · Calidad de vida · Entorno natural
            </p>
          </div>
        </div>
        <OpportunityIndex value={86} description="Encaja con tus prioridades actuales." />
      </Card>

      <Card tone="base" padding="md" className="flex flex-col gap-3">
        <CardHeader title="Tendencias" subtitle="Últimos 12 meses" />
        <Skeleton className="h-36 w-full" />
        <div className="text-ink-500 flex items-center justify-between text-xs">
          <span>Índice medio</span>
          <span className="font-semibold text-emerald-600">+4.2%</span>
        </div>
      </Card>

      <Card tone="soft" padding="md" className="flex flex-col gap-3">
        <CardHeader title="Actividad reciente" subtitle="Sincronización ETL" />
        <ul className="text-ink-700 flex flex-col gap-2 text-sm">
          <li className="flex items-center gap-2">
            <Activity size={14} aria-hidden="true" className="text-brand-500" />
            Dataset INE actualizado hace 2 h
          </li>
          <li className="flex items-center gap-2">
            <Activity size={14} aria-hidden="true" className="text-brand-500" />
            Nueva validación SHACL completada
          </li>
        </ul>
      </Card>
    </>
  );

  return <DashboardLayout hero={hero} side={side} footer={<ActionCards items={ACTION_ITEMS} />} />;
}
