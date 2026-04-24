/* eslint-disable no-undef -- AbortSignal es tipo DOM global gestionado por TypeScript. */
/**
 * Servicio para el recurso `/quality/reports`.
 */

import { apiFetch } from './http';
import type { QualityReport } from './types';

/** Reporte de calidad consolidado de la versión de datos publicada. */
export function getQualityReport(signal?: AbortSignal): Promise<QualityReport> {
  const init = signal ? { signal } : undefined;
  return apiFetch<QualityReport>('/quality/reports', init);
}
