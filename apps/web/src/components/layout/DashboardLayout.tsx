import type { ReactNode } from 'react';
import { cn } from '../ui/cn';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

export interface DashboardLayoutProps {
  /** Slot lateral izquierdo. Por defecto `<Sidebar />`. */
  sidebar?: ReactNode;
  /** Cabecera superior. Por defecto `<Topbar />`. */
  topbar?: ReactNode;
  /** Bloque principal (hero + mapa). Ocupa la columna central. */
  hero: ReactNode;
  /** Panel lateral derecho (tendencias, recomendación, ranking…). */
  side?: ReactNode;
  /** Cards de acción que se muestran debajo del hero. */
  footer?: ReactNode;
  className?: string;
}

export function DashboardLayout({
  sidebar,
  topbar,
  hero,
  side,
  footer,
  className,
}: DashboardLayoutProps) {
  return (
    <div className={cn('bg-surface-soft text-ink-900 flex min-h-screen w-full', className)}>
      {sidebar ?? <Sidebar />}

      <div className="flex min-w-0 flex-1 flex-col">
        {topbar ?? <Topbar />}

        <main
          id="contenido-principal"
          className="flex-1 overflow-x-hidden px-8 pt-6 pb-10"
          aria-label="Panel principal"
        >
          <div
            className={cn(
              'grid w-full gap-6',
              side ? 'lg:grid-cols-[minmax(0,1fr)_360px]' : 'grid-cols-1'
            )}
          >
            <section className="flex min-w-0 flex-col gap-6" aria-label="Contenido principal">
              {hero}
              {footer ? (
                <section aria-label="Acciones destacadas" className="mt-2">
                  {footer}
                </section>
              ) : null}
            </section>
            {side ? (
              <aside aria-label="Panel lateral" className="flex flex-col gap-4">
                {side}
              </aside>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
