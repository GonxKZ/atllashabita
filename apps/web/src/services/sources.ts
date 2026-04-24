/* eslint-disable no-undef -- AbortSignal es tipo DOM global gestionado por TypeScript. */
/**
 * Servicios para los recursos `/sources`.
 */

import { apiFetch } from './http';
import type { SourceDetail, SourceSummary } from './types';

/** Lista fuentes disponibles con su estado y metadatos básicos. */
export function listSources(signal?: AbortSignal): Promise<readonly SourceSummary[]> {
  const init = signal ? { signal } : undefined;
  return apiFetch<readonly SourceSummary[]>('/sources', init);
}

/** Detalle de una fuente concreta (licencia, cobertura, indicadores). */
export function getSource(id: string, signal?: AbortSignal): Promise<SourceDetail> {
  const init = signal ? { signal } : undefined;
  return apiFetch<SourceDetail>(`/sources/${encodeURIComponent(id)}`, init);
}
