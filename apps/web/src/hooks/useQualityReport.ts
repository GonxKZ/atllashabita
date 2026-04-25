/**
 * Hook para el reporte de calidad (RF-022).
 */

import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { getQualityReport } from '../services/quality';
import type { QualityReport } from '../services/types';

const QUALITY_REPORT_KEY = ['quality', 'report'] as const;

export function useQualityReport(): UseQueryResult<QualityReport> {
  return useQuery({
    queryKey: QUALITY_REPORT_KEY,
    queryFn: ({ signal }) => getQualityReport(signal),
    staleTime: 5 * 60_000,
  });
}
