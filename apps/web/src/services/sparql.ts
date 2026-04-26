/* eslint-disable no-undef -- AbortSignal es tipo DOM global gestionado por TypeScript. */
/**
 * Cliente tipado para los recursos `/sparql` y `/sparql/catalog`.
 *
 * El backend (Fase C) acepta:
 *   - `GET /sparql/catalog` con el catálogo de consultas predefinidas.
 *   - `POST /sparql` con `{ id, bindings }` para ejecutar una consulta con
 *     parámetros seguros. También admite `{ query, bindings }` para consultas
 *     ad-hoc autorizadas.
 *
 * Los contratos se escriben aquí porque el OpenAPI de Fase C todavía no está
 * consolidado; cuando se genere, estos tipos pueden delegarse a un artefacto
 * compilado.
 */

import { apiFetch } from './http';

/** Identificador canónico de una consulta del catálogo (p.ej. `top-by-score`). */
export type SparqlQueryId = string;

export type SparqlBindingValue = string | number | boolean;

export interface SparqlBindingSchema {
  readonly name: string;
  readonly label: string;
  readonly type: 'string' | 'integer' | 'number' | 'boolean' | 'iri';
  readonly required?: boolean;
  readonly description?: string;
  readonly default?: SparqlBindingValue;
  readonly example?: SparqlBindingValue;
}

export interface SparqlCatalogEntry {
  readonly id: SparqlQueryId;
  readonly name: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly bindings: readonly SparqlBindingSchema[];
  readonly query: string;
}

export interface SparqlCatalog {
  readonly version: string;
  readonly entries: readonly SparqlCatalogEntry[];
}

export interface SparqlExecuteRequest {
  readonly id: SparqlQueryId;
  readonly bindings?: Record<string, SparqlBindingValue>;
}

export interface SparqlResultRow {
  readonly [variable: string]: SparqlBindingValue | null;
}

export interface SparqlResult {
  readonly id: SparqlQueryId;
  readonly variables: readonly string[];
  readonly rows: readonly SparqlResultRow[];
  readonly total: number;
  readonly took_ms: number;
}

interface ApiSparqlCatalogEntry {
  readonly query_id: string;
  readonly description: string;
  readonly required: readonly string[];
  readonly optional?: readonly string[];
}

interface ApiSparqlCatalog {
  readonly queries: readonly ApiSparqlCatalogEntry[];
}

interface ApiSparqlResult {
  readonly query_id: string;
  readonly rows: readonly SparqlResultRow[];
  readonly elapsed_ms: number;
}

const QUERY_LABELS: Record<string, string> = {
  top_scores_by_profile: 'Top territorios por perfil',
  municipalities_by_province: 'Municipios por provincia',
  indicators_for_territory: 'Indicadores de un territorio',
  sources_used_by_territory: 'Fuentes usadas por territorio',
  count_triples_by_class: 'Conteo de triples por clase',
  indicator_definition: 'Definición de indicador',
  mobility_flow_between: 'Flujo de movilidad entre municipios',
  accidents_in_radius: 'Accidentes en radio geográfico',
  transit_stops_in_municipality: 'Paradas de transporte por municipio',
  risk_index: 'Índice de riesgo movilidad-accidentes',
};

const BINDING_DEFAULTS: Record<
  string,
  Pick<SparqlBindingSchema, 'label' | 'type' | 'default' | 'example' | 'description'>
> = {
  profile_id: {
    label: 'Perfil',
    type: 'string',
    default: 'remote_work',
    example: 'remote_work',
    description: 'Identificador del perfil de decisión.',
  },
  scope: {
    label: 'Ámbito',
    type: 'string',
    default: 'municipality',
    example: 'municipality',
    description: 'municipality, province o autonomous_community para consultas RDF.',
  },
  limit: {
    label: 'Número de resultados',
    type: 'integer',
    default: 10,
    example: 10,
    description: 'Número máximo de filas a devolver.',
  },
  province_code: {
    label: 'Código de provincia',
    type: 'string',
    default: '28',
    example: '28',
  },
  territory_id: {
    label: 'Territorio',
    type: 'string',
    default: 'municipality:28079',
    example: 'municipality:28079',
  },
  indicator_code: {
    label: 'Indicador',
    type: 'string',
    default: 'income',
    example: 'income',
  },
  origin_code: {
    label: 'Origen',
    type: 'string',
    default: '28079',
    example: '28079',
  },
  destination_code: {
    label: 'Destino',
    type: 'string',
    default: '08019',
    example: '08019',
  },
  period: {
    label: 'Periodo',
    type: 'string',
    default: '2024',
    example: '2024',
  },
  lat: {
    label: 'Latitud',
    type: 'number',
    default: 40.4168,
    example: 40.4168,
  },
  lon: {
    label: 'Longitud',
    type: 'number',
    default: -3.7038,
    example: -3.7038,
  },
  km: {
    label: 'Radio (km)',
    type: 'number',
    default: 10,
    example: 10,
  },
  year: {
    label: 'Año',
    type: 'integer',
    default: 2024,
    example: 2024,
  },
  municipality_code: {
    label: 'Código municipal',
    type: 'string',
    default: '28079',
    example: '28079',
  },
};

function isApiCatalog(value: unknown): value is ApiSparqlCatalog {
  return (
    typeof value === 'object' &&
    value !== null &&
    Array.isArray((value as { queries?: unknown }).queries)
  );
}

function toBindingSchema(name: string, required: boolean): SparqlBindingSchema {
  const defaults = BINDING_DEFAULTS[name] ?? {
    label: name.replaceAll('_', ' '),
    type: 'string' as const,
    example: '',
  };
  return {
    name,
    required,
    ...defaults,
  };
}

function toUiCatalog(apiCatalog: ApiSparqlCatalog): SparqlCatalog {
  return {
    version: 'api',
    entries: apiCatalog.queries.map((entry) => {
      const optional = entry.optional ?? [];
      return {
        id: entry.query_id,
        name: QUERY_LABELS[entry.query_id] ?? entry.query_id.replaceAll('_', ' '),
        description: entry.description,
        tags: ['api', 'rdf'],
        bindings: [
          ...entry.required.map((name) => toBindingSchema(name, true)),
          ...optional.map((name) => toBindingSchema(name, false)),
        ],
        query: `# Consulta controlada por backend\n# query_id: ${entry.query_id}\n# ${entry.description}`,
      };
    }),
  };
}

function toUiResult(result: ApiSparqlResult): SparqlResult {
  const variables = Array.from(new Set(result.rows.flatMap((row) => Object.keys(row))));
  return {
    id: result.query_id,
    variables,
    rows: result.rows,
    total: result.rows.length,
    took_ms: result.elapsed_ms,
  };
}

/** Recupera el catálogo de consultas SPARQL disponibles para la UI técnica. */
export function fetchSparqlCatalog(signal?: AbortSignal): Promise<SparqlCatalog> {
  const init = signal ? { signal } : undefined;
  return apiFetch<SparqlCatalog | ApiSparqlCatalog>('/sparql/catalog', init).then((catalog) =>
    isApiCatalog(catalog) ? toUiCatalog(catalog) : catalog
  );
}

/** Ejecuta una consulta del catálogo con los bindings indicados. */
export function executeSparql(
  request: SparqlExecuteRequest,
  signal?: AbortSignal
): Promise<SparqlResult> {
  return apiFetch<SparqlResult | ApiSparqlResult>('/sparql', {
    method: 'POST',
    body: {
      query_id: request.id,
      bindings: request.bindings ?? {},
    },
    ...(signal ? { signal } : {}),
  }).then((result) => ('elapsed_ms' in result ? toUiResult(result) : result));
}
