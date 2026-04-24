/**
 * Bloque de código con wrap controlado, numeración de líneas opcional y botón
 * de copiar al portapapeles.
 *
 * Se usa para mostrar Turtle, SPARQL y JSON dentro de la UI técnica sin
 * depender de una librería externa de syntax highlighting (el coste de bundle
 * no compensa para el MVP). La accesibilidad se cuida con `role="region"`,
 * `aria-label` y foco gestionado en el botón de copiar.
 */

import { useCallback, useState } from 'react';
import { ClipboardCheck, ClipboardCopy } from 'lucide-react';
import { cn } from './cn';

export interface CodeBlockProps {
  readonly code: string;
  readonly language?: string;
  readonly label?: string;
  readonly showLineNumbers?: boolean;
  readonly maxHeight?: number;
  readonly className?: string;
}

async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function CodeBlock({
  code,
  language = 'text',
  label = 'Bloque de código',
  showLineNumbers = false,
  maxHeight = 320,
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');

  const handleCopy = useCallback(async () => {
    const ok = await copyToClipboard(code);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  return (
    <section
      aria-label={label}
      data-language={language}
      className={cn(
        'relative overflow-hidden rounded-2xl border border-[color:var(--color-line-soft)] bg-slate-900 text-slate-100',
        className
      )}
    >
      <header className="flex items-center justify-between gap-2 border-b border-slate-800 px-4 py-2">
        <span className="text-xs font-semibold tracking-wide text-slate-400 uppercase">
          {language}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full border border-slate-700 px-2.5 py-1 text-xs font-medium',
            'hover:border-brand-400 hover:text-brand-200 text-slate-200',
            'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900'
          )}
          aria-label={copied ? 'Copiado al portapapeles' : 'Copiar código al portapapeles'}
        >
          {copied ? (
            <ClipboardCheck size={14} aria-hidden="true" />
          ) : (
            <ClipboardCopy size={14} aria-hidden="true" />
          )}
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </header>
      <pre
        className="overflow-auto px-4 py-3 text-xs leading-relaxed"
        style={{ maxHeight: `${maxHeight}px` }}
      >
        <code className="font-mono">
          {lines.map((line, index) => (
            <span key={`${index}-${line.length}`} className="flex">
              {showLineNumbers ? (
                <span
                  aria-hidden="true"
                  className="mr-4 inline-block w-8 shrink-0 text-right text-slate-500 select-none"
                >
                  {index + 1}
                </span>
              ) : null}
              <span className="flex-1 whitespace-pre-wrap">{line || ' '}</span>
            </span>
          ))}
        </code>
      </pre>
    </section>
  );
}
