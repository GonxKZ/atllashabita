/**
 * Validador minimalista "zod-like" para los bindings SPARQL.
 *
 * El proyecto no incorpora `zod` como dependencia en este worktree para
 * respetar el alcance del agente, por lo que implementamos un subconjunto
 * suficiente para el panel técnico: validación de tipo, requerido y
 * coerción segura. El API imita a `z.object({...}).safeParse(...)` para
 * facilitar la migración posterior.
 */

import type { SparqlBindingSchema, SparqlBindingValue } from '../../services/sparql';

export type BindingValues = Record<string, SparqlBindingValue>;

export interface BindingParseOk {
  readonly success: true;
  readonly data: BindingValues;
}

export interface BindingParseFail {
  readonly success: false;
  readonly errors: Readonly<Record<string, string>>;
}

export type BindingParseResult = BindingParseOk | BindingParseFail;

function coerceValue(
  raw: unknown,
  binding: SparqlBindingSchema
): { value?: SparqlBindingValue; error?: string } {
  if (raw === undefined || raw === null || raw === '') {
    if (binding.default !== undefined) {
      return { value: binding.default };
    }
    if (binding.required) {
      return { error: 'Este valor es obligatorio.' };
    }
    return {};
  }
  switch (binding.type) {
    case 'string':
    case 'iri': {
      const str = String(raw).trim();
      if (binding.type === 'iri' && !/^https?:\/\//.test(str)) {
        return { error: 'Se esperaba una IRI con esquema http(s).' };
      }
      return { value: str };
    }
    case 'integer': {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
        return { error: 'Introduce un número entero.' };
      }
      return { value: parsed };
    }
    case 'number': {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed)) {
        return { error: 'Introduce un número válido.' };
      }
      return { value: parsed };
    }
    case 'boolean': {
      if (typeof raw === 'boolean') return { value: raw };
      const normalized = String(raw).toLowerCase();
      if (
        normalized === 'true' ||
        normalized === '1' ||
        normalized === 'si' ||
        normalized === 'sí'
      ) {
        return { value: true };
      }
      if (normalized === 'false' || normalized === '0' || normalized === 'no') {
        return { value: false };
      }
      return { error: 'Valor booleano inválido.' };
    }
    default:
      return { error: 'Tipo no soportado.' };
  }
}

/**
 * Valida un diccionario de inputs contra el schema declarado por la consulta.
 *
 * Devuelve `success: true` + valores coercionados, o `success: false` con el
 * detalle por campo listo para pintar en la UI.
 */
export function parseBindings(
  schema: readonly SparqlBindingSchema[],
  input: Readonly<Record<string, unknown>>
): BindingParseResult {
  const values: BindingValues = {};
  const errors: Record<string, string> = {};
  for (const binding of schema) {
    const raw = input[binding.name];
    const result = coerceValue(raw, binding);
    if (result.error) {
      errors[binding.name] = result.error;
      continue;
    }
    if (result.value !== undefined) {
      values[binding.name] = result.value;
    }
  }
  if (Object.keys(errors).length > 0) {
    return { success: false, errors };
  }
  return { success: true, data: values };
}
