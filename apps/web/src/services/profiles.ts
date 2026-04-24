/* eslint-disable no-undef -- AbortSignal es tipo DOM global gestionado por TypeScript. */
/**
 * Servicio para el recurso `/profiles`.
 *
 * Encapsula el acceso HTTP y devuelve los perfiles disponibles junto con
 * sus pesos por defecto, tal como describe el contrato.
 */

import { apiFetch } from './http';
import type { Profile } from './types';

/** Recupera la lista de perfiles soportados por la API. */
export function listProfiles(signal?: AbortSignal): Promise<readonly Profile[]> {
  const init = signal ? { signal } : undefined;
  return apiFetch<readonly Profile[]>('/profiles', init);
}
