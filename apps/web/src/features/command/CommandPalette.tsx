/* eslint-disable no-undef -- HTMLInputElement, HTMLDivElement, HTMLElement, KeyboardEvent y document son tipos DOM globales. */
/**
 * Paleta de comandos accesible (⌘K).
 *
 * Composición:
 *   - Modal ARIA con overlay glass de 720px (alto máximo 80vh / 600px).
 *   - Input de búsqueda con foco automático al abrir.
 *   - Lista filtrada y agrupada por sección (`buildCommandCatalog`).
 *   - Navegación con flechas y `Enter`; `Esc` cierra.
 *   - Focus trap basico: Tab/Shift+Tab queda confinado al dialogo
 *     mientras `open === true` (cumple WCAG 2.4.3 - orden de foco y
 *     2.4.7 - focus visible).
 *   - Atajos sugeridos en cada fila para enseñar el camino "rápido" al usuario.
 *
 * Pensada para vivir en el `RootLayout`. Fuera de la paleta el usuario nunca
 * percibe su presencia: si `open` es `false` el componente no monta el overlay
 * ni los listeners.
 */
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Sparkles, X } from 'lucide-react';

import { useMapLayerStore } from '../../state/mapLayer';
import { cn } from '../../components/ui/cn';
import { HelpKey } from '../../components/ui/HelpKey';
import {
  buildCommandCatalog,
  groupBySection,
  searchCommands,
  SECTION_LABELS,
  type CommandContext,
  type CommandItem,
} from './items';

export interface CommandPaletteProps {
  /** Indica si el modal debe estar visible. */
  readonly open: boolean;
  /** Solicitud de cierre proveniente del usuario (Esc, overlay, ítem). */
  readonly onClose: () => void;
  /** Callback para mostrar el panel de ayuda con los atajos. */
  readonly onShowShortcuts?: () => void;
  /** Callback para alternar la sidebar. */
  readonly onToggleSidebar?: () => void;
  /** Callback para alternar la leyenda. */
  readonly onToggleLegend?: () => void;
  /** Callback para alternar el mini-mapa. */
  readonly onToggleMiniMap?: () => void;
  /** Callback para enfocar el buscador del topbar. */
  readonly onFocusSearch?: () => void;
  /** Catálogo de comandos opcional — se inyecta principalmente en tests. */
  readonly catalog?: readonly CommandItem[];
}

const SHORTCUT_LABEL = 'Ctrl K';

/** Utilidad mínima para detectar si la app corre en macOS sin requerir SSR. */
function detectMacOS(): boolean {
  if (typeof navigator === 'undefined') return false;
  // `userAgentData` aún no es universal; usar el UA clásico es suficiente
  // para discriminar el cluster de plataformas Apple. En tests jsdom el UA
  // es "Mozilla/5.0" y devuelve `false`, manteniendo la salida determinista.
  return /Mac|iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function CommandPalette({
  open,
  onClose,
  onShowShortcuts,
  onToggleSidebar,
  onToggleLegend,
  onToggleMiniMap,
  onFocusSearch,
  catalog,
}: CommandPaletteProps) {
  const navigate = useNavigate();
  const setActiveLayer = useMapLayerStore((state) => state.setActiveLayer);
  const dialogId = useId();
  const titleId = `${dialogId}-title`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(() => catalog ?? buildCommandCatalog(), [catalog]);
  const filtered = useMemo(() => searchCommands(items, query), [items, query]);
  const sections = useMemo(() => groupBySection(filtered), [filtered]);

  const platformShortcut = useMemo(() => (detectMacOS() ? '⌘ K' : SHORTCUT_LABEL), []);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setActiveIndex(0);
      return;
    }
    // Esperamos un microtick para que React monte el input antes de robar el foco.
    const handle = window.setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
    return () => window.clearTimeout(handle);
  }, [open]);

  /*
   * Patrón "ajustar estado durante el render" recomendado por react.dev
   * (https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes).
   * Reseteamos `activeIndex` cuando cambia la consulta o el conjunto de
   * items sin un `useEffect` de sincronización (que provocaba un render
   * extra y violaba `react-doctor/no-derived-state-effect`).
   */
  const [resetSignature, setResetSignature] = useState({ query, count: items.length });
  if (resetSignature.query !== query || resetSignature.count !== items.length) {
    setResetSignature({ query, count: items.length });
    setActiveIndex(0);
  }

  const context: CommandContext = useMemo(
    () => ({
      navigate: (path) => navigate(path),
      setActiveLayer: (id) => setActiveLayer(id),
      toggleSidebar: () => onToggleSidebar?.(),
      toggleLegend: () => onToggleLegend?.(),
      toggleMiniMap: () => onToggleMiniMap?.(),
      focusTopbarSearch: () => onFocusSearch?.(),
      openShortcuts: () => onShowShortcuts?.(),
      close: () => onClose(),
    }),
    [
      navigate,
      setActiveLayer,
      onClose,
      onFocusSearch,
      onShowShortcuts,
      onToggleLegend,
      onToggleMiniMap,
      onToggleSidebar,
    ]
  );

  /**
   * Focus trap basico: cuando el usuario tabula fuera del dialogo (Tab al
   * final / Shift+Tab al inicio) lo redirigimos al primer/ultimo elemento
   * focusable. Aceptamos el coste de leer el DOM en cada Tab a cambio de
   * no acoplar el dialogo a una libreria externa.
   */
  const trapFocus = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const dialog = event.currentTarget;
    const focusables = dialog.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (focusables.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Tab') {
        trapFocus(event);
        return;
      }
      if (filtered.length === 0) {
        if (event.key === 'Escape') onClose();
        return;
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((current) => (current + 1) % filtered.length);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((current) => (current - 1 + filtered.length) % filtered.length);
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const target = filtered[activeIndex];
        if (target) target.run(context);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    },
    [activeIndex, context, filtered, onClose, trapFocus]
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center px-4 pt-[8vh]"
      role="presentation"
    >
      {/*
       * Backdrop accionable: cumple "click outside cierra" sin contaminar
       * el arbol semantico (el cierre tambien existe via boton X y Esc).
       * `tabIndex={-1}` para que no entre en el orden de tab, y
       * `aria-label` por si algun SR lo recoge.
       */}
      <button
        type="button"
        tabIndex={-1}
        className="bg-ink-900/40 absolute inset-0 backdrop-blur-md transition-opacity"
        aria-label="Cerrar paleta de comandos"
        onClick={() => onClose()}
      />
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- es un dialog ARIA legítimo: el rol declara la interactividad y `onKeyDown` gestiona Esc/Arrow/Enter para teclado. */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        id={dialogId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className={cn(
          'relative z-10 flex w-full max-w-[720px] flex-col overflow-hidden rounded-3xl bg-white/95 backdrop-blur',
          'border border-[color:var(--color-line-soft)] shadow-[0_40px_120px_-40px_rgba(15,23,42,0.55)]',
          'max-h-[min(80vh,600px)]'
        )}
      >
        <header className="flex items-center gap-3 border-b border-[color:var(--color-line-soft)] px-4 py-3">
          <Search aria-hidden="true" size={18} className="text-ink-500" />
          <label htmlFor={`${dialogId}-input`} className="sr-only">
            Buscar acciones, municipios y atajos
          </label>
          <input
            id={`${dialogId}-input`}
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Busca un municipio, capa o acción…"
            autoComplete="off"
            aria-controls={`${dialogId}-listbox`}
            aria-activedescendant={
              filtered[activeIndex] ? `${dialogId}-option-${filtered[activeIndex]!.id}` : undefined
            }
            className="text-ink-900 placeholder:text-ink-500 flex-1 bg-transparent text-base outline-none"
          />
          <span className="text-ink-500 hidden items-center gap-1 text-[11px] sm:inline-flex">
            <span>cierra con</span>
            <HelpKey>Esc</HelpKey>
          </span>
          <button
            type="button"
            onClick={() => onClose()}
            aria-label="Cerrar"
            className="text-ink-500 hover:text-ink-900 inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </header>
        <h2 id={titleId} className="sr-only">
          Paleta de comandos AtlasHabita
        </h2>
        <div
          ref={listRef}
          id={`${dialogId}-listbox`}
          role="listbox"
          aria-label="Comandos disponibles"
          className="max-h-[60vh] flex-1 overflow-y-auto px-2 py-3"
        >
          {sections.length === 0 ? (
            <p
              role="status"
              aria-live="polite"
              className="text-ink-500 px-4 py-10 text-center text-sm"
            >
              No encontramos resultados para “{query}”. Prueba con otra palabra o pulsa{' '}
              <HelpKey>Esc</HelpKey> para cerrar.
            </p>
          ) : (
            sections.map((group) => (
              <section
                key={group.section}
                aria-label={SECTION_LABELS[group.section]}
                className="mb-3"
              >
                <h3 className="text-ink-500 px-3 pb-1 text-[11px] font-semibold tracking-[0.16em] uppercase">
                  {SECTION_LABELS[group.section]}
                </h3>
                <ul className="flex flex-col gap-0.5">
                  {group.items.map((item) => {
                    const flatIndex = filtered.indexOf(item);
                    const isActive = flatIndex === activeIndex;
                    const Icon = item.icon ?? Sparkles;
                    return (
                      <li key={item.id}>
                        <button
                          type="button"
                          id={`${dialogId}-option-${item.id}`}
                          role="option"
                          aria-selected={isActive}
                          data-testid={`palette-option-${item.id}`}
                          onMouseEnter={() => setActiveIndex(flatIndex)}
                          onClick={() => item.run(context)}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-2xl px-3 py-2 text-left transition-colors',
                            'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:outline-none',
                            isActive
                              ? 'bg-brand-50 text-ink-900'
                              : 'text-ink-700 hover:bg-surface-muted'
                          )}
                        >
                          <span
                            aria-hidden="true"
                            className={cn(
                              'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl',
                              isActive
                                ? 'bg-brand-500 text-white shadow-[0_6px_12px_-8px_rgba(16,185,129,0.65)]'
                                : 'bg-surface-muted text-ink-500'
                            )}
                          >
                            <Icon size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="text-ink-900 block truncate text-sm font-semibold">
                              {item.title}
                            </span>
                            {item.subtitle ? (
                              <span className="text-ink-500 block truncate text-xs">
                                {item.subtitle}
                              </span>
                            ) : null}
                          </span>
                          {item.shortcut ? (
                            <span className="hidden items-center gap-1 sm:inline-flex">
                              {item.shortcut.map((token) => (
                                <HelpKey key={`${item.id}-${token}`}>{token}</HelpKey>
                              ))}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          )}
        </div>
        <footer className="text-ink-500 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--color-line-soft)] bg-white/80 px-4 py-2 text-[11px]">
          <span className="inline-flex items-center gap-1">
            Sugiere acciones con <HelpKey>{platformShortcut}</HelpKey>
          </span>
          <span className="inline-flex items-center gap-1">
            <HelpKey>↑</HelpKey>
            <HelpKey>↓</HelpKey>
            <span>navegar</span>
            <HelpKey>Enter</HelpKey>
            <span>elegir</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
