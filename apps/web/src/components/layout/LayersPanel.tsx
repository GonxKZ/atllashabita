import { useId } from 'react';
import { cn } from '../ui/cn';

export interface LayerOption {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
}

export interface LayersPanelProps {
  title?: string;
  layers: LayerOption[];
  onChange?: (id: string, checked: boolean) => void;
  className?: string;
}

export function LayersPanel({
  title = 'Capas activas',
  layers,
  onChange,
  className,
}: LayersPanelProps) {
  const groupId = useId();

  return (
    <section aria-labelledby={groupId} className={cn('flex flex-col gap-2.5', className)}>
      <h2
        id={groupId}
        className="text-ink-500 text-[11px] font-semibold tracking-[0.16em] uppercase"
      >
        {title}
      </h2>
      <ul className="flex flex-col gap-0.5">
        {layers.map((layer) => {
          const inputId = `${groupId}-${layer.id}`;
          return (
            <li key={layer.id}>
              <label
                htmlFor={inputId}
                className={cn(
                  'group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5',
                  'hover:bg-surface-muted transition-colors',
                  layer.disabled && 'cursor-not-allowed opacity-60'
                )}
              >
                <input
                  id={inputId}
                  type="checkbox"
                  checked={layer.checked}
                  disabled={layer.disabled}
                  onChange={(event) => onChange?.(layer.id, event.target.checked)}
                  // `accent-color` aplica el verde de marca al check nativo en
                  // navegadores modernos sin perder accesibilidad ni el
                  // comportamiento por defecto del checkbox.
                  className={cn(
                    'text-brand-500 focus:ring-brand-300 h-4 w-4 cursor-pointer rounded',
                    'accent-[var(--color-brand-500)]',
                    'border-[color:var(--color-line-strong)]'
                  )}
                />
                <span
                  className={cn(
                    'text-sm transition-colors',
                    layer.checked ? 'text-ink-900 font-medium' : 'text-ink-500'
                  )}
                >
                  {layer.label}
                </span>
              </label>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
