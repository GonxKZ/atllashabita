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
 * Tarjeta horizontal que combina una imagen destacada con los atributos
 * clave del territorio recomendado. Se inspira en la captura de referencia:
 * foto a la izquierda y contenido textual a la derecha, con CTA primario.
 */
export function HighlightCard({ highlight, imageSrc, onOpen, className }: HighlightCardProps) {
  return (
    <article
      aria-label={`Recomendación destacada: ${highlight.name}`}
      className={[
        'flex flex-col gap-4 overflow-hidden rounded-2xl bg-white p-4 shadow-[var(--shadow-card)] md:flex-row',
        className ?? '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="relative h-44 w-full shrink-0 overflow-hidden rounded-xl bg-[var(--color-surface-muted)] md:h-auto md:w-56">
        <HighlightMedia key={imageSrc ?? 'placeholder'} imageSrc={imageSrc} name={highlight.name} />
        <span className="absolute top-3 left-3 rounded-full bg-white/90 px-3 py-1 text-[11px] font-semibold text-[var(--color-brand-700)] backdrop-blur">
          Top {highlight.score}
        </span>
      </div>

      <div className="flex min-w-0 flex-1 flex-col justify-between">
        <div>
          <p className="text-brand-700 text-xs font-semibold tracking-[0.18em] uppercase">
            {highlight.headline}
          </p>
          <h3 className="font-display text-ink-900 mt-1 text-xl font-semibold">{highlight.name}</h3>
          <p className="text-ink-500 text-xs">{highlight.region}</p>
          <p className="text-ink-700 mt-3 text-sm leading-relaxed">{highlight.description}</p>

          <ul className="mt-4 flex flex-wrap gap-2">
            {highlight.attributes.map((attribute) => (
              <li
                key={attribute.label}
                className="rounded-full bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-medium text-[var(--color-ink-700)]"
              >
                <span className="text-[var(--color-ink-500)]">{attribute.label}:</span>{' '}
                <span className="font-semibold text-[var(--color-ink-900)]">{attribute.value}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex items-center justify-between">
          <span className="text-ink-500 text-xs">Actualizado hoy</span>
          <button
            type="button"
            onClick={() => onOpen?.(highlight.id)}
            className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-brand-600)] px-4 py-2 text-xs font-semibold text-white shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--color-brand-700)]"
          >
            Ver análisis
            <ArrowUpRight width={14} height={14} strokeWidth={2.5} aria-hidden="true" />
          </button>
        </div>
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
