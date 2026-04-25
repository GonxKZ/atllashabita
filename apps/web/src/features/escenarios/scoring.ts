import type { NationalIndicator, NationalMunicipality } from '@/data/national_mock';
import { DEFAULT_WEIGHTS, normalizeWeights, type WeightVector } from '@/state/escenariosStore';

const TOP_LIMIT = 10;

/** Sentido de cada factor para convertir cada indicador a utilidad [0, 1]. */
const DIRECTION: Readonly<Record<string, 'higher_is_better' | 'lower_is_better'>> = {
  rent_price: 'lower_is_better',
  income: 'higher_is_better',
  broadband: 'higher_is_better',
  services: 'higher_is_better',
  air_quality: 'lower_is_better',
  mobility: 'lower_is_better',
  transit: 'higher_is_better',
  climate: 'higher_is_better',
};

export interface IndicatorRange {
  readonly min: number;
  readonly max: number;
}

export type IndicatorRanges = Readonly<Record<string, IndicatorRange>>;

export interface RankedEntry {
  readonly entry: NationalMunicipality;
  readonly score: number;
}

export interface ScoringCandidate {
  readonly indicators: readonly NationalIndicator[];
}

export function computeRanges(data: readonly ScoringCandidate[]): IndicatorRanges {
  const accumulators: Record<string, IndicatorRange> = {};
  for (const entry of data) {
    for (const indicator of entry.indicators) {
      const current = accumulators[indicator.id];
      accumulators[indicator.id] = current
        ? {
            min: Math.min(current.min, indicator.value),
            max: Math.max(current.max, indicator.value),
          }
        : { min: indicator.value, max: indicator.value };
    }
  }
  return accumulators;
}

export function scoreMunicipality(
  entry: ScoringCandidate,
  weights: WeightVector = DEFAULT_WEIGHTS,
  ranges: IndicatorRanges
): number {
  const normalizedWeights = normalizeWeights(weights);
  let total = 0;

  for (const indicator of entry.indicators) {
    const weight = normalizedWeights[indicator.id];
    if (typeof weight !== 'number' || weight <= 0) continue;
    const range = ranges[indicator.id];
    if (!range) continue;

    const span = range.max - range.min;
    const normalized = span === 0 ? 1 : (indicator.value - range.min) / span;
    const oriented = DIRECTION[indicator.id] === 'lower_is_better' ? 1 - normalized : normalized;
    total += weight * Math.max(0, Math.min(1, oriented));
  }

  return Math.round(total * 1000) / 10;
}

export function rankMunicipalities(
  data: readonly NationalMunicipality[],
  weights: WeightVector,
  limit: number = TOP_LIMIT,
  ranges: IndicatorRanges = computeRanges(data)
): readonly RankedEntry[] {
  return data
    .map((entry) => ({ entry, score: scoreMunicipality(entry, weights, ranges) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
