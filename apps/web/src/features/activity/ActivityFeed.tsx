import {
  Bookmark,
  LineChart,
  Map as MapIcon,
  Sparkles,
  Users,
  type LucideIcon,
} from 'lucide-react';

import { MotionStagger } from '@/components/motion';
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
      className={[
        'rounded-3xl bg-white p-5 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--color-line-soft)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-ink-900 text-base font-semibold tracking-tight">
          {title}
        </h3>
        <button
          type="button"
          className="text-brand-700 hover:text-brand-800 focus-visible:ring-brand-300 rounded-full text-[11px] font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Ver todo
        </button>
      </header>
      <MotionStagger as="ul" className="flex flex-col gap-3" duration={0.5} stagger={0.07} y={12}>
        {items.map((item) => {
          const Icon = ICONS[item.icon];
          return (
            <li key={item.id} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="text-brand-700 ring-brand-100 mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--color-brand-50)] ring-1"
              >
                <Icon width={16} height={16} strokeWidth={2.25} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-ink-900 text-[13px] font-semibold tracking-tight">
                  {item.title}
                </p>
                <p className="text-ink-500 mt-0.5 text-[12px] leading-snug">{item.description}</p>
                <p className="text-ink-300 mt-1 text-[11px]">{item.timestamp}</p>
              </div>
            </li>
          );
        })}
      </MotionStagger>
    </section>
  );
}
