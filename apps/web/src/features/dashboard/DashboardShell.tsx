import { useMemo, useState } from 'react';
import {
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
import { ActivityFeed } from '@/features/activity';
import { HighlightCard } from '@/features/recommendations';
import { TrendsChart } from '@/features/trends';
import { mockActivity, mockHighlight, mockPoints, mockTrends } from '@/data/mock';

/**
 * Rampa cromática y umbrales del score territorial. Replica la lógica
 * declarada en `features/map/SpainMap.tsx` para que la previsualización
 * estática de la home y el mapa interactivo de `/mapa` compartan paleta
 * sin que la home tenga que importar maplibre-gl (cuya carga rompe
 * jsdom porque depende de `window.URL.createObjectURL`).
 */
const SCORE_RAMP = ['#065f46', '#047857', '#059669', '#10b981', '#34d399'] as const;
const SCORE_BREAKS = [80, 65, 50, 35, 0] as const;

function scoreToColor(score: number): string {
  for (let index = 0; index < SCORE_BREAKS.length; index += 1) {
    if (score >= SCORE_BREAKS[index]) {
      return SCORE_RAMP[index];
    }
  }
  return SCORE_RAMP[SCORE_RAMP.length - 1];
}

/**
 * Filtros rápidos del hero. Igualan los chips visibles en la captura
 * `atlashabita-main.png`: Calidad de vida, Vivienda asequible, Empleo,
 * Conectividad y "Más filtros" como afordancia para abrir el panel
 * detallado de scoring.
 */
const CHIP_OPTIONS: ChipFilterOption[] = [
  { id: 'quality', label: 'Calidad de vida', icon: <Sparkles size={14} strokeWidth={2.25} /> },
  { id: 'housing', label: 'Vivienda asequible', icon: <Building2 size={14} strokeWidth={2.25} /> },
  { id: 'jobs', label: 'Empleo', icon: <Wallet size={14} strokeWidth={2.25} /> },
  { id: 'connectivity', label: 'Conectividad', icon: <Wifi size={14} strokeWidth={2.25} /> },
  { id: 'more', label: 'Más filtros', icon: <Wrench size={14} strokeWidth={2.25} /> },
];

/**
 * Cuatro acciones inferiores: igualan la fila final de la captura
 * (Explorar / Recomendar / Comparar / Analizar).
 */
const ACTION_ITEMS: ActionCardItem[] = [
  {
    id: 'explore',
    title: 'Explorar',
    description: 'Recorre el mapa y descubre municipios que encajan con tu perfil.',
    icon: <MapIcon size={20} strokeWidth={2.25} />,
    accent: 'brand',
    href: '#mapa',
  },
  {
    id: 'recommend',
    title: 'Recomendar',
    description: 'Obtén sugerencias personalizadas con explicaciones claras.',
    icon: <Sparkles size={20} strokeWidth={2.25} />,
    accent: 'emerald',
    href: '#recomendador',
  },
  {
    id: 'compare',
    title: 'Comparar',
    description: 'Pon dos o más territorios cara a cara con indicadores medibles.',
    icon: <GitCompareArrows size={20} strokeWidth={2.25} />,
    accent: 'sky',
    href: '#comparador',
  },
  {
    id: 'analyze',
    title: 'Analizar',
    description: 'Entra al modo técnico para SPARQL, SHACL y reportes avanzados.',
    icon: <BarChart3 size={20} strokeWidth={2.25} />,
    accent: 'amber',
    href: '#modo-tecnico',
  },
];

/**
 * Bounds aproximados de la península y archipiélagos para la previsualización
 * del dashboard. Se proyecta a coordenadas SVG asumiendo un mapa Mercator
 * lineal — es suficientemente preciso para una vista decorativa estática y
 * evita arrastrar `maplibre-gl` (con su dependencia de WebGL/URL.createObjectURL)
 * a la home, donde la prioridad es el render rápido y SSR-friendly de la UI.
 *
 *  La vista interactiva real con react-map-gl + tiles de OpenFreeMap se sigue
 *  ofreciendo en `/mapa` (ver `routes/AppRouter.tsx`); aquí mostramos una
 *  versión estática pixel-perfect del comp `atlashabita-main.png`.
 */
const MAP_BOUNDS = {
  minLon: -10,
  maxLon: 4.5,
  minLat: 35.5,
  maxLat: 44.5,
} as const;

const MAP_VIEW = {
  width: 760,
  height: 480,
} as const;

function projectToSvg(lon: number, lat: number): { x: number; y: number } {
  const { minLon, maxLon, minLat, maxLat } = MAP_BOUNDS;
  const x = ((lon - minLon) / (maxLon - minLon)) * MAP_VIEW.width;
  const y = MAP_VIEW.height - ((lat - minLat) / (maxLat - minLat)) * MAP_VIEW.height;
  return { x, y };
}

/**
 * Mapa decorativo y estático para el shell del dashboard. Reproduce la silueta
 * estilizada de la captura sin depender de tiles ni WebGL: el contorno
 * peninsular es un trazo aproximado y los marcadores son círculos coloreados
 * con el score numérico.
 *
 * Al ser SVG puro:
 *  - Se renderiza igual en SSR/jsdom (los tests no necesitan polyfills).
 *  - Sigue siendo accesible: cada marcador expone `aria-label` con score y
 *    nombre del municipio, y la silueta se anuncia como `img` con `aria-label`.
 */
function HomeMapPreview({
  points,
  ariaLabel = 'Mapa territorial de España con municipios destacados',
}: {
  readonly points: typeof mockPoints;
  readonly ariaLabel?: string;
}) {
  return (
    <div className="relative h-full min-h-[380px] w-full overflow-hidden rounded-[20px] bg-gradient-to-br from-[#eaf3ee] via-[#eef4f0] to-[#e3eee8]">
      <svg
        role="img"
        aria-label={ariaLabel}
        viewBox={`0 0 ${MAP_VIEW.width} ${MAP_VIEW.height}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="land-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f5faf6" />
            <stop offset="100%" stopColor="#dde9e1" />
          </linearGradient>
          <linearGradient id="sea-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ecf2ee" />
            <stop offset="100%" stopColor="#dde6e1" />
          </linearGradient>
          <radialGradient id="marker-glow" cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor="rgba(255,255,255,0.6)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </radialGradient>
        </defs>
        <rect width={MAP_VIEW.width} height={MAP_VIEW.height} fill="url(#sea-gradient)" />

        {/*
         * Silueta peninsular muy simplificada (NO un mapa cartográfico real).
         * Sirve como "papel pintado" para que los marcadores tengan contexto
         * geográfico sin descargar tiles. El path está construido a mano para
         * encajar con los bounds proyectados arriba.
         */}
        <path
          d="M 305 120 L 360 100 L 420 95 L 490 105 L 560 130 L 600 175 L 615 230 L 610 280 L 580 330 L 530 360 L 460 390 L 380 405 L 310 405 L 250 395 L 195 365 L 155 320 L 130 270 L 130 220 L 165 175 L 215 145 L 270 125 Z"
          fill="url(#land-gradient)"
          stroke="#bfd1c5"
          strokeWidth={1.2}
        />

        {/* Mar Mediterráneo: islas Baleares estilizadas. */}
        <ellipse cx={650} cy={285} rx={28} ry={9} fill="#dde7e1" />
        <ellipse cx={685} cy={295} rx={12} ry={5} fill="#dde7e1" />

        {/* Etiquetas geográficas neutras (texto pequeño, decorativo). */}
        <text
          x={205}
          y={250}
          fill="#94a3b8"
          fontSize={13}
          fontFamily="Inter, sans-serif"
          fontWeight={500}
          aria-hidden="true"
        >
          Portugal
        </text>
        <text
          x={395}
          y={260}
          fill="#94a3b8"
          fontSize={14}
          fontFamily="Inter, sans-serif"
          fontWeight={600}
          aria-hidden="true"
        >
          España
        </text>

        {points.map((point) => {
          const { x, y } = projectToSvg(point.lon, point.lat);
          const radius = 14 + Math.round((point.score / 100) * 14);
          const color = scoreToColor(point.score);
          return (
            <g
              key={point.id}
              role="button"
              tabIndex={-1}
              aria-label={`${point.name}: score ${point.score}`}
            >
              <circle cx={x} cy={y} r={radius + 4} fill={color} opacity={0.18} />
              <circle cx={x} cy={y} r={radius} fill={color} stroke="white" strokeWidth={2.5} />
              <circle cx={x} cy={y} r={radius} fill="url(#marker-glow)" opacity={0.7} />
              <text
                x={x}
                y={y + 4}
                textAnchor="middle"
                fill="white"
                fontSize={Math.max(10, radius * 0.6)}
                fontFamily="Inter, sans-serif"
                fontWeight={700}
              >
                {point.score}
              </text>
            </g>
          );
        })}
      </svg>

      {/*
       * Leyenda coherente con la del SpainMap interactivo: misma rampa de
       * cinco tramos verde para que la transición entre la home (estática)
       * y `/mapa` (interactiva) sea visualmente consistente.
       */}
      <figure
        aria-label="Leyenda: Score territorial"
        className="pointer-events-auto absolute bottom-4 left-4 rounded-xl bg-white/95 px-3 py-2 shadow-[var(--shadow-card)] backdrop-blur"
      >
        <figcaption className="text-ink-700 text-[11px] font-semibold tracking-wide uppercase">
          Score territorial
        </figcaption>
        <div className="mt-2 flex items-center gap-1.5">
          {(['#34d399', '#10b981', '#059669', '#047857', '#065f46'] as const).map((color) => (
            <span
              key={color}
              aria-hidden="true"
              className="h-2.5 w-7 rounded-sm"
              style={{ backgroundColor: color }}
            />
          ))}
          <span className="text-ink-500 ml-1 text-[10px] tabular-nums">0 — 100</span>
        </div>
      </figure>
    </div>
  );
}

/**
 * Dashboard principal de AtlasHabita.
 *
 * Compone Sidebar + Topbar + bloque hero + mapa + panel lateral derecho
 * (recomendación / tendencias / actividad) + acciones inferiores. El
 * layout sigue pixel-perfect la captura `atlashabita-main.png`:
 *
 *  - Hero verde con gradiente y la palabra "mejor lugar" resaltada.
 *  - Chips de filtros sobre el hero, variante `onBrand`.
 *  - Mapa estático (SVG) con marcadores burbuja verdes; bajo él, índice de
 *    oportunidad. La versión interactiva con maplibre se accede en `/mapa`.
 *  - Panel lateral con HighlightCard, TrendsChart y ActivityFeed reales
 *    tomando datos de `data/mock.ts`.
 *  - Cards de acción inferiores con iconografía y acentos distintos.
 */
export function DashboardShell() {
  const [activeChips, setActiveChips] = useState<string[]>(['quality']);

  const hero = useMemo(
    () => (
      <section aria-labelledby="dashboard-title" className="flex flex-col gap-5">
        {/*
         * Banner verde del comp: gradiente diagonal con la palabra "mejor
         * lugar" en blanco brillante. Las dos burbujas blancas suavizadas
         * imitan el "glow" de la captura.
         */}
        <div className="from-brand-500 via-brand-500 to-brand-600 relative overflow-hidden rounded-3xl bg-gradient-to-br p-7 text-white shadow-[var(--shadow-elevated)] sm:p-8">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/25 blur-3xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-32 -left-10 h-80 w-80 rounded-full bg-emerald-300/30 blur-3xl"
          />
          <div className="relative flex flex-col gap-5">
            <div className="flex flex-col gap-2.5">
              <h1
                id="dashboard-title"
                className="font-display max-w-3xl text-[28px] leading-[1.15] font-bold sm:text-[34px]"
              >
                Descubre el{' '}
                <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-white">mejor lugar</span>{' '}
                para vivir en España
              </h1>
              <p className="max-w-xl text-[14px] leading-relaxed text-white/85">
                Explora, compara y encuentra tu lugar ideal con datos abiertos y tecnología
                semántica.
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
          </div>
        </div>

        {/*
         * Mapa estático pixel-perfect del comp. La ruta `/mapa` ofrece la
         * versión interactiva con maplibre + OpenFreeMap; aquí prima la
         * fidelidad visual y un render que no depende de WebGL.
         */}
        <div className="relative rounded-3xl bg-white p-3 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--color-line-soft)]">
          <HomeMapPreview points={mockPoints} />
        </div>

        <OpportunityIndex
          value={74}
          description="Resumen agregado de los territorios filtrados con tu selección actual."
        />
      </section>
    ),
    [activeChips]
  );

  /*
   * Panel lateral derecho: tres cards apiladas que reproducen exactamente
   * el orden de la captura — Recomendación destacada (con foto), Tendencias
   * (sparkline verde) y Actividad reciente (timeline con iconos circulares).
   */
  const side = (
    <>
      <HighlightCard highlight={mockHighlight} />
      <TrendsChart
        data={mockTrends}
        title="Tendencias"
        subtitle="Score medio de los últimos 12 meses."
      />
      <ActivityFeed items={mockActivity.slice(0, 3)} title="Actividad reciente" />
    </>
  );

  return <DashboardLayout hero={hero} side={side} footer={<ActionCards items={ACTION_ITEMS} />} />;
}
