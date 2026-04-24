/**
 * Catálogo SPARQL y ejecutor de respaldo.
 *
 * Permite que el panel técnico siga siendo funcional aunque `/sparql/catalog`
 * o `/sparql` no estén disponibles. Implementa tres consultas típicas sobre
 * el dataset nacional:
 *   - `top-by-score`: top-N municipios con mayor score.
 *   - `affordable-housing`: municipios con alquiler <= X y banda ancha >= Y.
 *   - `indicator-by-ca`: valores medios de un indicador por comunidad
 *     autónoma.
 *
 * Las implementaciones son funciones puras que trabajan sobre el dataset mock
 * nacional. Cuando la API real esté disponible, la UI prefiere el backend;
 * este módulo sólo se usa como fallback visible.
 */

import { NATIONAL_MUNICIPALITIES, type NationalMunicipality } from '../../data/national_mock';
import type {
  SparqlBindingValue,
  SparqlCatalog,
  SparqlCatalogEntry,
  SparqlResult,
  SparqlResultRow,
} from '../../services/sparql';

const CATALOG: SparqlCatalog = {
  version: 'fallback-0.2.0',
  entries: [
    {
      id: 'top-by-score',
      name: 'Top N municipios por score',
      description: 'Devuelve los N municipios con mayor score agregado.',
      tags: ['ranking', 'score'],
      bindings: [
        {
          name: 'limit',
          label: 'Número de resultados',
          type: 'integer',
          required: true,
          default: 10,
          example: 10,
          description: 'Número máximo de filas a devolver.',
        },
      ],
      query: `SELECT ?territory ?name ?score WHERE {
  ?territory a ah:Municipality ;
             ah:name ?name ;
             ah:score ?score .
} ORDER BY DESC(?score) LIMIT {{limit}}`,
    },
    {
      id: 'affordable-housing',
      name: 'Municipios asequibles con buena conectividad',
      description: 'Municipios con alquiler medio <= precio y banda ancha >= cobertura.',
      tags: ['vivienda', 'conectividad'],
      bindings: [
        {
          name: 'max_rent',
          label: 'Alquiler máximo (€/mes)',
          type: 'number',
          required: true,
          default: 700,
          example: 700,
        },
        {
          name: 'min_broadband',
          label: 'Cobertura mínima (%)',
          type: 'number',
          required: true,
          default: 95,
          example: 95,
        },
      ],
      query: `SELECT ?name ?rent ?broadband WHERE {
  ?territory a ah:Municipality ; ah:name ?name .
  ?indicatorRent ah:of ?territory ; ah:id "rent_price" ; ah:value ?rent .
  ?indicatorBb   ah:of ?territory ; ah:id "broadband"  ; ah:value ?broadband .
  FILTER(?rent <= {{max_rent}} && ?broadband >= {{min_broadband}})
} ORDER BY ?rent`,
    },
    {
      id: 'indicator-by-ca',
      name: 'Media de indicador por comunidad autónoma',
      description: 'Agrega los valores medios de un indicador por CA.',
      tags: ['agregación', 'territorial'],
      bindings: [
        {
          name: 'indicator',
          label: 'Identificador del indicador',
          type: 'string',
          required: true,
          default: 'income',
          example: 'income',
          description: 'Ej. income, rent_price, broadband, services.',
        },
      ],
      query: `SELECT ?ca (AVG(?value) AS ?mean) WHERE {
  ?territory ah:autonomousCommunity ?ca .
  ?indicator ah:of ?territory ; ah:id "{{indicator}}" ; ah:value ?value .
} GROUP BY ?ca ORDER BY DESC(?mean)`,
    },
  ],
};

export function getFallbackCatalog(): SparqlCatalog {
  return CATALOG;
}

function executeTopByScore(
  bindings: Record<string, SparqlBindingValue>,
  data: readonly NationalMunicipality[]
): SparqlResult {
  const limit = Math.max(1, Number(bindings.limit ?? 10));
  const rows = data
    .slice()
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map<SparqlResultRow>((entry) => ({
      territory: `urn:ah:municipality:${entry.id}`,
      name: entry.name,
      score: entry.score,
    }));
  return {
    id: 'top-by-score',
    variables: ['territory', 'name', 'score'],
    rows,
    total: rows.length,
    took_ms: 1,
  };
}

function executeAffordable(
  bindings: Record<string, SparqlBindingValue>,
  data: readonly NationalMunicipality[]
): SparqlResult {
  const maxRent = Number(bindings.max_rent ?? 700);
  const minBroadband = Number(bindings.min_broadband ?? 95);
  const rows: SparqlResultRow[] = [];
  for (const entry of data) {
    const rent = entry.indicators.find((i) => i.id === 'rent_price')?.value ?? 0;
    const bb = entry.indicators.find((i) => i.id === 'broadband')?.value ?? 0;
    if (rent <= maxRent && bb >= minBroadband) {
      rows.push({ name: entry.name, rent, broadband: bb });
    }
  }
  rows.sort((a, b) => Number(a.rent ?? 0) - Number(b.rent ?? 0));
  return {
    id: 'affordable-housing',
    variables: ['name', 'rent', 'broadband'],
    rows,
    total: rows.length,
    took_ms: 2,
  };
}

function executeIndicatorByCa(
  bindings: Record<string, SparqlBindingValue>,
  data: readonly NationalMunicipality[]
): SparqlResult {
  const indicatorId = String(bindings.indicator ?? 'income');
  const sums = new Map<string, { total: number; count: number }>();
  for (const entry of data) {
    const value = entry.indicators.find((i) => i.id === indicatorId)?.value;
    if (typeof value !== 'number') continue;
    const acc = sums.get(entry.autonomousCommunity) ?? { total: 0, count: 0 };
    acc.total += value;
    acc.count += 1;
    sums.set(entry.autonomousCommunity, acc);
  }
  const rows: SparqlResultRow[] = Array.from(sums.entries())
    .map(([ca, { total, count }]) => ({ ca, mean: Number((total / count).toFixed(2)) }))
    .sort((a, b) => Number(b.mean ?? 0) - Number(a.mean ?? 0));
  return {
    id: 'indicator-by-ca',
    variables: ['ca', 'mean'],
    rows,
    total: rows.length,
    took_ms: 3,
  };
}

export function executeFallbackQuery(
  entry: SparqlCatalogEntry,
  bindings: Record<string, SparqlBindingValue>,
  data: readonly NationalMunicipality[] = NATIONAL_MUNICIPALITIES
): SparqlResult {
  switch (entry.id) {
    case 'top-by-score':
      return executeTopByScore(bindings, data);
    case 'affordable-housing':
      return executeAffordable(bindings, data);
    case 'indicator-by-ca':
      return executeIndicatorByCa(bindings, data);
    default:
      return {
        id: entry.id,
        variables: [],
        rows: [],
        total: 0,
        took_ms: 0,
      };
  }
}
