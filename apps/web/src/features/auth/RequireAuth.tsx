/**
 * Wrapper de rutas protegidas.
 *
 * Si no hay sesión, redirige a `/login?next=<ruta_actual>` para que el flujo
 * vuelva al destino original tras autenticarse. El componente no asume nada
 * sobre el contenido renderizado: se le pasa por `children` la subárbol que
 * debe protegerse.
 */
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../state/auth';

export interface RequireAuthProps {
  children: ReactNode;
  /** Ruta a la que redirigir cuando no hay sesión. Por defecto `/login`. */
  redirectTo?: string;
}

export function RequireAuth({ children, redirectTo = '/login' }: RequireAuthProps) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    const next = `${location.pathname}${location.search}`;
    const params = new URLSearchParams({ next });
    return <Navigate to={`${redirectTo}?${params.toString()}`} replace />;
  }
  return <>{children}</>;
}
