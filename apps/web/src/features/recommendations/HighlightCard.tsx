import { ArrowUpRight } from 'lucide-react';
import { useState } from 'react';

import type { Highlight } from '@/data/mock';

export type HighlightCardProps = {
  highlight: Highlight;
  /**
   * Ruta local a la fotografía destacada (p.ej. `/images/donostia.jpg`).
   * Si no carga, el componente degrada a un SVG estilizado propio.
   */
  imageSrc?: string;
  /** Callback invocado al pulsar "Ver análisis". */
  onOpen?: (highlightId: string) => void;
  className?: string;
};

/**
 * Componente interno que aísla el estado de "imagen fallida".
 *
 * Al montarlo con ``key={imageSrc ?? 'placeholder'}`` desde el padre, React
 * remonta el componente automáticamente cada vez que cambia la fuente, por lo
 * que el estado `failed` se reinicia sin necesidad de `useEffect`. Así se
 * evita el antipatrón de sincronizar estado con props que detectó
 * ``react-doctor``.
 */
function HighlightMedia({ imageSrc, name }: { imageSrc?: string; name: string }) {
  const [failed, setFailed] = useState(false);
  if (!imageSrc || failed) {
    return <HighlightPlaceholder name={name} />;
  }
  return (
    <img
      src={imageSrc}
      alt={`Vista de ${name}`}
      loading="lazy"
      decoding="async"
      className="h-full w-full object-cover"
      onError={() => setFailed(true)}
    />
  );
}

/**
 * Tarjeta vertical que sigue el comp pixel-perfect del panel lateral
 * derecho del dashboard: cabecera "Recomendación destacada" + foto/ilustración
 * superior, título y región en el cuerpo y CTA "Ver análisis" al pie. La
 * versión horizontal anterior se reserva para cuando se reutilice en la
 * vista comparador (más amplia); aquí prima la densidad vertical para
 * encajar dentro del panel de 340px.
 */
export function HighlightCard({ highlight, imageSrc, onOpen, className }: HighlightCardProps) {
  return (
    <article
      aria-label={`Recomendación destacada: ${highlight.name}`}
      className={[
        'flex flex-col gap-4 overflow-hidden rounded-3xl bg-white p-4 shadow-[var(--shadow-card)] ring-1 ring-[color:var(--color-line-soft)]',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <header className="flex items-center justify-between">
        <div>
          <p className="text-ink-500 text-[11px] font-semibold tracking-[0.16em] uppercase">
            Recomendación destacada
          </p>
          <p className="text-ink-300 mt-0.5 text-[11px]">Coincide con tu perfil actual</p>
        </div>
        <span
          aria-label={`Top score ${highlight.score}`}
          className="bg-brand-50 text-brand-700 ring-brand-100 rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ring-1"
        >
          Top {highlight.score}
        </span>
      </header>

      <div className="relative h-32 w-full shrink-0 overflow-hidden rounded-2xl bg-[var(--color-surface-muted)]">
        <HighlightMedia key={imageSrc ?? 'placeholder'} imageSrc={imageSrc} name={highlight.name} />
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <div>
          <h3 className="font-display text-ink-900 text-lg leading-tight font-semibold tracking-tight">
            {highlight.name}
          </h3>
          <p className="text-ink-500 mt-0.5 text-xs">{highlight.region}</p>
        </div>
        <p className="text-ink-700 text-[13px] leading-relaxed">{highlight.description}</p>

        <ul className="mt-1 flex flex-wrap gap-1.5">
          {highlight.attributes.map((attribute) => (
            <li
              key={attribute.label}
              className="rounded-full border border-[color:var(--color-line-soft)] bg-[var(--color-surface-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-700)]"
            >
              <span className="text-[var(--color-ink-500)]">{attribute.label}:</span>{' '}
              <span className="font-semibold text-[var(--color-ink-900)]">{attribute.value}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-1 flex items-center justify-between border-t border-[color:var(--color-line-soft)] pt-3">
        <span className="text-ink-300 text-[11px]">Actualizado hoy</span>
        <button
          type="button"
          onClick={() => onOpen?.(highlight.id)}
          className="text-brand-700 hover:text-brand-800 focus-visible:ring-brand-300 inline-flex items-center gap-1 rounded-full text-xs font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
        >
          Ver análisis
          <ArrowUpRight width={14} height={14} strokeWidth={2.5} aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

/**
 * Placeholder SVG controlado. No usa texto Lorem ni imágenes externas; dibuja
 * un paisaje estilizado en tonos de marca para comunicar "territorio".
 */
function HighlightPlaceholder({ name }: { name: string }) {
  return (
    <svg
      role="img"
      aria-label={`Ilustración de ${name}`}
      viewBox="0 0 240 180"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ecfdf5" />
          <stop offset="100%" stopColor="#a7f3d0" />
        </linearGradient>
        <linearGradient id="mount" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="100%" stopColor="#065f46" />
        </linearGradient>
      </defs>
      <rect width="240" height="180" fill="url(#sky)" />
      <circle cx="190" cy="48" r="18" fill="#fef3c7" opacity="0.9" />
      <path
        d="M0 130 L55 80 L95 110 L140 60 L190 105 L240 80 L240 180 L0 180 Z"
        fill="url(#mount)"
      />
      <path
        d="M0 150 L40 130 L85 150 L130 125 L180 150 L240 130 L240 180 L0 180 Z"
        fill="#10b981"
        opacity="0.85"
      />
    </svg>
  );
}
