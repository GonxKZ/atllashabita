import type { ReactNode } from 'react';
import { cn } from '../ui/cn';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export interface DashboardLayoutProps {
  /** Slot lateral izquierdo. Por defecto `<Sidebar />`. Pásalo como `false` o usa `embedded` para suprimirlo. */
  sidebar?: ReactNode;
  /** Cabecera superior. Por defecto `<Topbar />`. */
  topbar?: ReactNode;
  /** Bloque principal (hero + mapa). Ocupa la columna central. */
  hero: ReactNode;
  /** Panel lateral derecho (tendencias, recomendación, ranking…). */
  side?: ReactNode;
  /** Cards de acción que se muestran debajo del hero. */
  footer?: ReactNode;
  /**
   * Cuando es `true`, se omiten Sidebar y Topbar para integrarse en un
   * layout padre que ya los proporciona (caso del `RootLayout` del router).
   */
  embedded?: boolean;
  className?: string;
}

export function DashboardLayout({
  sidebar,
  topbar,
  hero,
  side,
  footer,
  embedded = false,
  className,
}: DashboardLayoutProps) {
  const main = (
    <main
      id="contenido-principal"
      // Padding ajustado al comp: 32px laterales en desktop, 24px en
      // tablet. El `gap-6` entre columnas reproduce la separación que
      // se observa en la captura entre mapa y panel lateral.
      className="flex-1 overflow-x-hidden px-4 pt-4 pb-8 sm:px-5 md:px-6 xl:px-8"
      aria-label="Panel principal"
    >
      <div
        className={cn(
          'grid w-full gap-5 xl:gap-6',
          // Panel derecho de 340px en desktop (igual que el comp):
          // suficiente para HighlightCard + TrendsChart + ActivityFeed
          // sin desbordar en monitores 1440-1920px.
          side ? '2xl:grid-cols-[minmax(0,1fr)_340px]' : 'grid-cols-1'
        )}
      >
        <section className="flex min-w-0 flex-col gap-6" aria-label="Contenido principal">
          {hero}
          {footer ? (
            <section aria-label="Acciones destacadas" className="mt-1">
              {footer}
            </section>
          ) : null}
        </section>
        {side ? (
          <aside aria-label="Panel lateral" className="flex flex-col gap-5">
            {side}
          </aside>
        ) : null}
      </div>
    </main>
  );

  // Modo embedded: el layout padre ya proporciona sidebar/topbar; sólo
  // emitimos el contenido principal.
  if (embedded) {
    return <div className={cn('flex min-h-0 flex-1 flex-col', className)}>{main}</div>;
  }

  return (
    <div className={cn('bg-surface-soft text-ink-900 flex min-h-screen w-full', className)}>
      {sidebar ?? <Sidebar />}

      <div className="flex min-w-0 flex-1 flex-col">
        {topbar ?? <Topbar />}
        {main}
      </div>
    </div>
  );
}
