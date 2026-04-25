/* eslint-disable no-undef -- KeyboardEvent y document son tipos DOM globales del navegador. */
/**
 * Hook que registra los atajos globales del Atelier:
 *
 *  - `⌘K` / `Ctrl+K` → abrir/cerrar la paleta.
 *  - `⌘B` / `Ctrl+B` → mostrar/ocultar la barra lateral.
 *  - `⌘L` → mostrar/ocultar la leyenda del mapa.
 *  - `⌘M` → mostrar/ocultar el mini-mapa.
 *  - `⌘1..9` → activar la capa N del mapa.
 *  - `/` → enfocar el buscador del topbar.
 *  - `?` → abrir el panel de atajos.
 *  - `Esc` → cerrar overlays activos.
 *
 * El hook acepta los handlers desde fuera para mantenerse libre de stores
 * concretos; son las páginas o el layout principal quienes los conectan a
 * Zustand o al router. El listener se monta una sola vez por instancia y se
 * desmonta al desmontar el componente que invoque el hook.
 */
import { useEffect } from 'react';

export interface ShortcutHandlers {
  /** Toggle de la paleta de comandos (⌘K / Ctrl+K). */
  readonly onTogglePalette?: () => void;
  /** Toggle de la sidebar (⌘B / Ctrl+B). */
  readonly onToggleSidebar?: () => void;
  /** Toggle de la leyenda del mapa (⌘L / Ctrl+L). */
  readonly onToggleLegend?: () => void;
  /** Toggle del mini-mapa (⌘M / Ctrl+M). */
  readonly onToggleMiniMap?: () => void;
  /** Activación de capa N del mapa (Ctrl+1 a Ctrl+9). */
  readonly onSelectLayer?: (index: number) => void;
  /** Foco del buscador del topbar (`/`). */
  readonly onFocusSearch?: () => void;
  /** Apertura del panel de ayuda (`?`). */
  readonly onShowShortcuts?: () => void;
  /** Cierre de cualquier overlay activo (Esc). */
  readonly onEscape?: () => void;
}

/** Tipo abreviado para describir un evento de teclado del DOM. */
type KeyEvent = KeyboardEvent;

/**
 * Comprueba si el modificador "primario" del SO está activo. En macOS es la
 * tecla ⌘ (`metaKey`); en el resto la tecla Ctrl (`ctrlKey`). Aceptar ambos
 * permite que el atajo funcione bajo cualquier plataforma sin detectar SO.
 */
export function isPrimaryModifier(event: Pick<KeyEvent, 'metaKey' | 'ctrlKey'>): boolean {
  return event.metaKey || event.ctrlKey;
}

/**
 * Devuelve `true` si el evento ocurre dentro de un campo de texto editable.
 * Lo usamos para no robar la pulsación de `/` ni `?` cuando el usuario está
 * escribiendo en un input normal: sólo el modificador primario pasa filtro.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return false;
}

/**
 * Registra los listeners. Devuelve la función de limpieza para que pueda
 * usarse desde tests sin React.
 */
export function bindShortcuts(handlers: ShortcutHandlers): () => void {
  function handler(event: KeyEvent) {
    const primary = isPrimaryModifier(event);
    const key = event.key;

    if (primary && key.toLowerCase() === 'k') {
      event.preventDefault();
      handlers.onTogglePalette?.();
      return;
    }
    if (primary && key.toLowerCase() === 'b') {
      event.preventDefault();
      handlers.onToggleSidebar?.();
      return;
    }
    if (primary && key.toLowerCase() === 'l') {
      event.preventDefault();
      handlers.onToggleLegend?.();
      return;
    }
    if (primary && key.toLowerCase() === 'm') {
      event.preventDefault();
      handlers.onToggleMiniMap?.();
      return;
    }
    if (primary && /^[1-9]$/.test(key)) {
      event.preventDefault();
      handlers.onSelectLayer?.(Number(key));
      return;
    }
    if (key === 'Escape') {
      handlers.onEscape?.();
      return;
    }
    // Las pulsaciones sin modificador sólo se procesan cuando el usuario no
    // está escribiendo: así `/` o `?` no roban texto en inputs.
    if (isTypingTarget(event.target)) return;
    if (key === '/') {
      event.preventDefault();
      handlers.onFocusSearch?.();
      return;
    }
    if (key === '?') {
      event.preventDefault();
      handlers.onShowShortcuts?.();
    }
  }

  document.addEventListener('keydown', handler);
  return () => document.removeEventListener('keydown', handler);
}

/**
 * Hook React que monta/desmonta los listeners y los actualiza si los
 * handlers cambian. Mantiene una sola suscripción global.
 */
export function useShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    return bindShortcuts(handlers);
    // Cada `handlers` distinto reinstala los listeners; aceptamos ese coste a
    // cambio de simplicidad y previsibilidad: la página llamará al hook con
    // funciones estables vía `useCallback`.
  }, [handlers]);
}
