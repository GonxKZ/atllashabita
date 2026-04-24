import type { ReactNode } from 'react';
import { ArrowRight } from 'lucide-react';
import { MotionScale } from '../motion';
import { Card } from '../ui/Card';
import { cn } from '../ui/cn';

export interface ActionCardItem {
  id: string;
  title: string;
  description: string;
  icon: ReactNode;
  href?: string;
  accent?: 'brand' | 'emerald' | 'sky' | 'amber';
}

export interface ActionCardsProps {
  items: ActionCardItem[];
  className?: string;
}

const ACCENT_BG: Record<NonNullable<ActionCardItem['accent']>, string> = {
  brand: 'bg-brand-50 text-brand-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  sky: 'bg-sky-50 text-sky-600',
  amber: 'bg-amber-50 text-amber-600',
};

export function ActionCards({ items, className }: ActionCardsProps) {
  return (
    <ul className={cn('grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4', className)}>
      {items.map((item) => (
        <li key={item.id}>
          <MotionScale scale={1.03} duration={0.25} className="block h-full">
            <Card
              as="article"
              tone="base"
              padding="md"
              interactive
              className="group relative flex h-full flex-col gap-4 transition-shadow hover:shadow-[var(--shadow-elevated)]"
            >
              <header className="flex items-center justify-between">
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex h-11 w-11 items-center justify-center rounded-2xl',
                    ACCENT_BG[item.accent ?? 'brand']
                  )}
                >
                  {item.icon}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  size={18}
                  className="text-ink-300 group-hover:text-brand-500 transition-all group-hover:translate-x-0.5"
                />
              </header>
              <div className="flex flex-col gap-1.5">
                <h3 className="font-display text-ink-900 text-base font-semibold tracking-tight">
                  {item.href ? (
                    <a
                      href={item.href}
                      className="rounded-md focus-visible:ring-2 focus-visible:ring-[var(--color-brand-300)] focus-visible:outline-none"
                    >
                      <span className="absolute inset-0" aria-hidden="true" />
                      {item.title}
                    </a>
                  ) : (
                    item.title
                  )}
                </h3>
                <p className="text-ink-500 text-sm leading-relaxed">{item.description}</p>
              </div>
            </Card>
          </MotionScale>
        </li>
      ))}
    </ul>
  );
}
