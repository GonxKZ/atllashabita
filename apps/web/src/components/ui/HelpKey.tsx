/**
 * Etiqueta inline para representar atajos de teclado.
 *
 * Se usa en tooltips, listas de ayuda y mensajes vacíos para que el usuario
 * pueda escanear rápidamente la combinación que activa una acción. La fuente
 * monoespaciada y el fondo gris claro la diferencian del texto corrido.
 */
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { cn } from './cn';

export interface HelpKeyProps extends ComponentPropsWithoutRef<'kbd'> {
  /** Etiqueta visible (`Ctrl`, `K`, `⌘`, `Esc`, etc.). */
  readonly children: ReactNode;
  /** Variante visual: por defecto blanco con borde, `solid` invierte para CTA. */
  readonly tone?: 'default' | 'solid';
}

const TONE_STYLES: Record<NonNullable<HelpKeyProps['tone']>, string> = {
  default:
    'bg-white text-ink-700 border border-[color:var(--color-line-soft)] shadow-[0_1px_0_0_rgba(15,23,42,0.04)]',
  solid: 'bg-ink-900 text-white border border-ink-900',
};

export function HelpKey({ tone = 'default', className, children, ...rest }: HelpKeyProps) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-md px-1.5 text-[11px] font-semibold tracking-wide',
        'align-middle font-mono',
        TONE_STYLES[tone],
        className
      )}
      {...rest}
    >
      {children}
    </kbd>
  );
}
