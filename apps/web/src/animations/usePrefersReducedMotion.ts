import { useEffect, useState } from 'react';

import { REDUCED_MOTION_QUERY, prefersReducedMotion } from './reducedMotion';

// Tipo nativo del navegador. Lo redeclaramos como alias para que el
// linter (que sólo conoce los globales declarados en su config) no se
// queje en archivos compartidos sin tocar la configuración.
type MediaQueryListEvent = globalThis.MediaQueryListEvent;

/**
 * Hook reactivo que expone `prefers-reduced-motion` y se actualiza si
 * el usuario cambia la preferencia del sistema en caliente. Esto evita
 * que un componente montado anteriormente continúe animando aunque la
 * persona haya activado "reducir movimiento" durante la sesión.
 *
 * Implementación defensiva: trabajamos sólo cuando `window.matchMedia`
 * existe y ofrecemos compatibilidad con APIs antiguas (`addListener`)
 * por si algún test o navegador embebido no expone `addEventListener`.
 *
 * Devuelve un booleano sincrónico durante el primer render, gracias a
 * que `prefersReducedMotion()` es una función pura que consulta el DOM
 * en el momento del montaje.
 */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState<boolean>(() => prefersReducedMotion());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(REDUCED_MOTION_QUERY);
    setReduced(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => setReduced(event.matches);

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    // Fallback para navegadores antiguos (Safari < 14, jsdom legacy).
    if (typeof mediaQuery.addListener === 'function') {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
    return undefined;
  }, []);

  return reduced;
}
