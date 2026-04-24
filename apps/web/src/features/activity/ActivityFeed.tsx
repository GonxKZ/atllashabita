import {
  Bookmark,
  LineChart,
  Map as MapIcon,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';

import type { ActivityItem } from '@/data/mock';

export type ActivityFeedProps = {
  items: ActivityItem[];
  title?: string;
  className?: string;
};

const ICONS: Record<ActivityItem['icon'], LucideIcon> = {
  map: MapIcon,
  sparkles: Sparkles,
  chart: LineChart,
  bookmark: Bookmark,
  users: Users,
};

/**
 * Feed vertical de actividad reciente. Cada entrada contiene un icono, un
 * título, una descripción breve y un timestamp relativo. El componente es
 * accesible: se anuncia como lista y cada icono va marcado como decorativo.
 */
export function ActivityFeed({
  items,
  title = 'Actividad reciente',
  className,
}: ActivityFeedProps) {
  return (
    <section
      aria-label={title}
      className={['rounded-2xl bg-white p-6 shadow-[var(--shadow-card)]', className ?? '']
        .filter(Boolean)
        .join(' ')}
    >
      <header className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-ink-900 text-lg font-semibold">{title}</h3>
        <button type="button" className="text-brand-700 hover:text-brand-800 text-xs font-semibold">
          Ver todo
        </button>
      </header>
      <ul className="flex flex-col gap-4">
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <li key={item.id} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="text-brand-700 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-50)]"
              >
                <Icon width={18} height={18} strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-ink-900 text-sm font-semibold">{item.title}</p>
                <p className="text-ink-500 mt-0.5 text-sm leading-snug">{item.description}</p>
                <p className="text-ink-300 mt-1 text-xs">{item.timestamp}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
