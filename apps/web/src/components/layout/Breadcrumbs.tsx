import { Fragment } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '../ui/cn';

/**
 * AtlasHabita · Breadcrumbs (M12, issue #116)
 *
 * Migas de pan compactas para el Topbar flotante. Resuelven la ruta actual
 * a partir de `useLocation()` y la traducen a etiquetas humanas en español.
 * Aceptan también un override `items` para escenarios donde la ruta no
 * comunica el contexto (por ejemplo, ficha de territorio con nombre real).
 *
 * Diseño:
 *  - Tipografía Geist 13px tracking-tight, eyebrow uppercase para el primer
 *    nivel y semibold para el último.
 *  - Separador `chevron` de lucide a 14px en moss-300.
 *  - Cada miga es <a> excepto la última (página actual) que se renderiza
 *    como <span aria-current="page">.
 *  - Accesible: `<nav aria-label="Migas de pan">` + `<ol>` semántico.
 */
export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface BreadcrumbsProps {
  /**
   * Lista explícita de migas. Si se omite, se infiere desde la ruta actual.
   * Aporta el control fino que necesitan páginas como /territorio/:id
   * para inyectar el nombre legible del municipio.
   */
  items?: BreadcrumbItem[];
  className?: string;
}

const ROUTE_LABELS: Record<string, string> = {
  mapa: 'Explorar mapa',
  recomendador: 'Recomendador',
  ranking: 'Ranking',
  comparador: 'Comparador',
  escenarios: 'Escenarios',
  sparql: 'Panel SPARQL',
  territorio: 'Territorio',
  cuenta: 'Mi cuenta',
};

function humanise(segment: string): string {
  // Decodifica %20 / acentos y capitaliza la primera letra.
  const decoded = decodeURIComponent(segment);
  if (ROUTE_LABELS[decoded]) return ROUTE_LABELS[decoded];
  return decoded.charAt(0).toUpperCase() + decoded.slice(1).replace(/[-_]/g, ' ');
}

function deriveItems(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split('/').filter(Boolean);
  const crumbs: BreadcrumbItem[] = [{ label: 'Inicio', href: '/' }];

  let acc = '';
  for (const segment of segments) {
    acc += `/${segment}`;
    crumbs.push({ label: humanise(segment), href: acc });
  }

  // El último elemento se considera "página actual" y por convención no
  // necesita href; lo eliminamos para que el render lo trate como activo.
  if (crumbs.length > 1) {
    const last = crumbs[crumbs.length - 1];
    crumbs[crumbs.length - 1] = { label: last.label };
  }
  return crumbs;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const location = useLocation();
  const resolved = items ?? deriveItems(location.pathname);

  if (resolved.length <= 1) {
    // En la home no añadimos migas: el saludo del hero ya orienta.
    return null;
  }

  return (
    <nav aria-label="Migas de pan" className={cn('flex min-w-0 items-center', className)}>
      <ol className="flex min-w-0 flex-wrap items-center gap-1.5">
        {resolved.map((item, index) => {
          const isLast = index === resolved.length - 1;
          const key = `${item.label}-${index}`;
          const content = (
            <span
              className={cn(
                'inline-flex items-center gap-1.5 truncate',
                isLast
                  ? 'font-semibold text-[color:var(--color-linen-900)]'
                  : 'text-[color:var(--color-linen-600)]'
              )}
            >
              {index === 0 ? <Home aria-hidden="true" size={13} className="shrink-0" /> : null}
              <span className="truncate">{item.label}</span>
            </span>
          );

          return (
            <Fragment key={key}>
              <li className="flex min-w-0 items-center text-[13px] tracking-tight">
                {item.href && !isLast ? (
                  <Link
                    to={item.href}
                    className={cn(
                      'inline-flex items-center rounded-full px-1.5 py-0.5 transition-colors',
                      'hover:bg-[color:color-mix(in_srgb,var(--color-moss-100)_70%,transparent)] hover:text-[color:var(--color-moss-700)]',
                      'focus-visible:ring-2 focus-visible:ring-[color:var(--color-moss-400)] focus-visible:outline-none'
                    )}
                  >
                    {content}
                  </Link>
                ) : (
                  <span aria-current={isLast ? 'page' : undefined} className="px-1.5 py-0.5">
                    {content}
                  </span>
                )}
              </li>
              {!isLast ? (
                <li aria-hidden="true" className="text-[color:var(--color-moss-300)]">
                  <ChevronRight size={14} strokeWidth={2} />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}
