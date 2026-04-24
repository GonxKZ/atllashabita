import {
  Filter,
  HomeIcon,
  LifeBuoy,
  Plug,
  Sliders,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react';
import { useState } from 'react';

export type HeroChip = {
  id: string;
  label: string;
  icon: LucideIcon;
};

export type HeroBannerProps = {
  title?: string;
  subtitle?: string;
  /** Chip inicialmente seleccionado (controla el estado interno). */
  initialSelectedChipId?: string;
  /** Se invoca al cambiar el chip activo. */
  onChipChange?: (chipId: string) => void;
  className?: string;
};

const DEFAULT_CHIPS: HeroChip[] = [
  { id: 'quality', label: 'Calidad de vida', icon: LifeBuoy },
  { id: 'housing', label: 'Vivienda asequible', icon: HomeIcon },
  { id: 'jobs', label: 'Empleo', icon: TrendingUp },
  { id: 'connectivity', label: 'Conectividad', icon: Plug },
  { id: 'more', label: 'Más filtros', icon: Sliders },
];

/**
 * Franja superior tipo hero del dashboard. Reproduce el bloque verde claro de
 * la captura con titular, subtítulo y chips de filtros rápidos.
 */
export function HeroBanner({
  title = 'Descubre el mejor lugar para vivir en España',
  subtitle = 'Combina datos abiertos, tu perfil y prioridades para encontrar el territorio que mejor encaja contigo.',
  initialSelectedChipId = 'quality',
  onChipChange,
  className,
}: HeroBannerProps) {
  const [selected, setSelected] = useState(initialSelectedChipId);

  const handleSelect = (chipId: string) => {
    setSelected(chipId);
    onChipChange?.(chipId);
  };

  return (
    <section
      aria-label="Buscador principal de AtlasHabita"
      className={[
        'relative overflow-hidden rounded-2xl bg-gradient-to-br from-[var(--color-brand-50)] via-white to-[var(--color-brand-100)] p-8 shadow-[var(--shadow-card)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/2 opacity-70 md:block">
        <HeroIllustration />
      </div>

      <div className="relative max-w-2xl">
        <span className="text-brand-700 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold tracking-wide uppercase">
          <Filter width={14} height={14} strokeWidth={2.5} aria-hidden="true" />
          Asistente territorial
        </span>
        <h1 className="font-display text-ink-900 mt-4 text-3xl leading-tight font-semibold md:text-4xl">
          {title}
        </h1>
        <p className="text-ink-700 mt-3 max-w-xl text-sm md:text-base">{subtitle}</p>

        <ul className="mt-6 flex flex-wrap gap-2" aria-label="Filtros rápidos">
          {DEFAULT_CHIPS.map((chip) => {
            const Icon = chip.icon;
            const isSelected = chip.id === selected;
            return (
              <li key={chip.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(chip.id)}
                  aria-pressed={isSelected}
                  className={[
                    'inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold transition-colors',
                    isSelected
                      ? 'bg-[var(--color-brand-600)] text-white shadow-[var(--shadow-card)]'
                      : 'bg-white/90 text-[var(--color-ink-700)] hover:bg-white',
                  ].join(' ')}
                >
                  <Icon width={14} height={14} strokeWidth={2.5} aria-hidden="true" />
                  {chip.label}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}

function HeroIllustration() {
  return (
    <svg
      viewBox="0 0 400 280"
      className="h-full w-full"
      aria-hidden="true"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <radialGradient id="hero-glow" cx="70%" cy="20%" r="70%">
          <stop offset="0%" stopColor="#d1fae5" />
          <stop offset="100%" stopColor="#ecfdf5" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="280" fill="url(#hero-glow)" />
      <circle cx="320" cy="70" r="54" fill="#a7f3d0" opacity="0.8" />
      <circle cx="250" cy="160" r="28" fill="#6ee7b7" opacity="0.7" />
      <circle cx="340" cy="210" r="42" fill="#10b981" opacity="0.55" />
      <path
        d="M40 240 L120 180 L190 210 L260 160 L330 200 L400 170 L400 280 L40 280 Z"
        fill="#34d399"
        opacity="0.35"
      />
    </svg>
  );
}
