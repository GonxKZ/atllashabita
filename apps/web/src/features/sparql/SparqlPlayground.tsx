/**
 * Panel técnico SPARQL.
 *
 * Compone el selector de consulta, el editor de bindings y la tabla de
 * resultados. Si la API `/sparql` no está disponible, el panel cambia de
 * forma transparente al `fallbackCatalog` para seguir siendo demostrable en
 * vivo (TFG, academias, entrevistas).
 */

import { AlertTriangle, Play } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { CodeBlock } from '../../components/ui/CodeBlock';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { Tag } from '../../components/ui/Tag';
import { cn } from '../../components/ui/cn';
import { useSparqlCatalog, useSparqlMutation } from '../../hooks/useSparql';
import type {
  SparqlBindingSchema,
  SparqlBindingValue,
  SparqlCatalog,
  SparqlCatalogEntry,
  SparqlResult,
  SparqlResultRow,
} from '../../services/sparql';
import { executeFallbackQuery, getFallbackCatalog } from './fallbackCatalog';
import { parseBindings, type BindingValues } from './schema';

function buildInitialValues(schema: readonly SparqlBindingSchema[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (const binding of schema) {
    const fallback = binding.default ?? binding.example ?? '';
    values[binding.name] = fallback === undefined ? '' : String(fallback);
  }
  return values;
}

function buildColumnsFromResult(result: SparqlResult): DataTableColumn<SparqlResultRow>[] {
  return result.variables.map((variable) => ({
    id: variable,
    header: variable,
    cell: (row) => {
      const value = row[variable];
      if (value === null || value === undefined) return <span className="text-ink-300">—</span>;
      if (typeof value === 'number')
        return <span className="tabular-nums">{new Intl.NumberFormat('es-ES').format(value)}</span>;
      return <span>{String(value)}</span>;
    },
  }));
}

export interface SparqlPlaygroundProps {
  readonly className?: string;
}

export function SparqlPlayground({ className }: SparqlPlaygroundProps) {
  const catalogQuery = useSparqlCatalog();
  const mutation = useSparqlMutation();
  const fallbackCatalog = useMemo<SparqlCatalog>(() => getFallbackCatalog(), []);
  const catalog = catalogQuery.data ?? fallbackCatalog;
  const usingFallback = !catalogQuery.data;

  const [selectedId, setSelectedId] = useState<string>(() => fallbackCatalog.entries[0]?.id ?? '');
  const [values, setValues] = useState<Record<string, string>>(() =>
    buildInitialValues(fallbackCatalog.entries[0]?.bindings ?? [])
  );
  const [errors, setErrors] = useState<Readonly<Record<string, string>>>({});
  const [result, setResult] = useState<SparqlResult | null>(null);

  const effectiveSelectedId = useMemo(() => {
    if (catalog.entries.some((entry) => entry.id === selectedId)) return selectedId;
    return catalog.entries[0]?.id ?? '';
  }, [catalog.entries, selectedId]);

  const selectedEntry = useMemo<SparqlCatalogEntry | undefined>(
    () => catalog.entries.find((entry) => entry.id === effectiveSelectedId),
    [catalog.entries, effectiveSelectedId]
  );

  const bindingValues = useMemo(
    () => ({
      ...buildInitialValues(selectedEntry?.bindings ?? []),
      ...values,
    }),
    [selectedEntry, values]
  );

  const handleQueryChange = (entryId: string) => {
    const nextEntry = catalog.entries.find((entry) => entry.id === entryId);
    setSelectedId(entryId);
    setValues(buildInitialValues(nextEntry?.bindings ?? []));
    setErrors({});
    setResult(null);
  };

  const runQuery = async () => {
    if (!selectedEntry) return;
    const parsed = parseBindings(selectedEntry.bindings, bindingValues);
    if (!parsed.success) {
      setErrors(parsed.errors);
      setResult(null);
      return;
    }
    setErrors({});
    const bindings: BindingValues = parsed.data;
    try {
      const response = await mutation.mutateAsync({ id: selectedEntry.id, bindings });
      setResult(response);
    } catch {
      setResult(
        executeFallbackQuery(selectedEntry, bindings as Record<string, SparqlBindingValue>)
      );
    }
  };

  const columns = result ? buildColumnsFromResult(result) : [];

  return (
    <Card
      tone="base"
      padding="md"
      className={cn('flex flex-col gap-4', className)}
      aria-label="Panel SPARQL"
      data-feature="sparql-playground"
    >
      <CardHeader
        title="Panel técnico SPARQL"
        subtitle="Catálogo de consultas y ejecutor con bindings tipados"
        action={
          usingFallback ? <Tag tone="warning">Catálogo local</Tag> : <Tag tone="success">API</Tag>
        }
      />

      <section aria-label="Selector de consulta" className="flex flex-col gap-2">
        <label htmlFor="sparql-query" className="text-ink-700 text-sm font-medium">
          Consulta predefinida
        </label>
        <select
          id="sparql-query"
          data-testid="sparql-selector"
          className={cn(
            'bg-surface-soft h-11 rounded-2xl border border-[color:var(--color-line-soft)] px-3 text-sm',
            'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:outline-none'
          )}
          value={effectiveSelectedId}
          onChange={(event) => handleQueryChange(event.target.value)}
        >
          {catalog.entries.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.name}
            </option>
          ))}
        </select>
        {selectedEntry ? <p className="text-ink-500 text-xs">{selectedEntry.description}</p> : null}
      </section>

      {selectedEntry ? (
        <section
          aria-label="Parámetros de la consulta"
          className="grid grid-cols-1 gap-3 md:grid-cols-2"
        >
          {selectedEntry.bindings.map((binding) => {
            const inputId = `sparql-binding-${binding.name}`;
            const error = errors[binding.name];
            return (
              <div key={binding.name} className="flex flex-col gap-1.5">
                <label htmlFor={inputId} className="text-ink-700 text-xs font-semibold">
                  {binding.label}
                  {binding.required ? (
                    <span aria-hidden="true" className="text-rose-600">
                      {' '}
                      *
                    </span>
                  ) : null}
                </label>
                <input
                  id={inputId}
                  data-testid={`sparql-binding-${binding.name}`}
                  value={bindingValues[binding.name] ?? ''}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [binding.name]: event.target.value }))
                  }
                  placeholder={binding.example !== undefined ? String(binding.example) : ''}
                  aria-invalid={error ? true : undefined}
                  aria-describedby={error ? `${inputId}-error` : undefined}
                  className={cn(
                    'h-10 rounded-xl border border-[color:var(--color-line-soft)] px-3 text-sm',
                    'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:outline-none',
                    error && 'border-rose-400 focus-visible:ring-rose-200'
                  )}
                />
                {binding.description ? (
                  <span className="text-ink-500 text-[11px]">{binding.description}</span>
                ) : null}
                {error ? (
                  <span id={`${inputId}-error`} className="text-xs text-rose-600">
                    {error}
                  </span>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="primary"
          size="md"
          onClick={runQuery}
          leadingIcon={<Play size={14} aria-hidden="true" />}
          disabled={!selectedEntry || mutation.isPending}
          data-testid="sparql-run"
        >
          {mutation.isPending ? 'Ejecutando…' : 'Ejecutar consulta'}
        </Button>
        {mutation.isError ? (
          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
            <AlertTriangle size={12} aria-hidden="true" />
            API no disponible · mostrando resultado local.
          </span>
        ) : null}
      </div>

      {selectedEntry ? (
        <CodeBlock
          code={selectedEntry.query}
          language="sparql"
          label="Consulta seleccionada"
          maxHeight={200}
        />
      ) : null}

      {result ? (
        <section aria-label="Resultados de la consulta" className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-ink-900 text-sm font-semibold">
              {result.total} resultado{result.total === 1 ? '' : 's'}
            </h3>
            <span className="text-ink-500 text-xs">{result.took_ms} ms</span>
          </div>
          <DataTable
            ariaLabel={`Resultados de ${selectedEntry?.name ?? 'la consulta'}`}
            columns={columns}
            rows={result.rows}
            getRowId={(row, index) => `${index}-${String(row[result.variables[0]] ?? '')}`}
            emptyState="Sin resultados para los parámetros actuales."
          />
        </section>
      ) : null}
    </Card>
  );
}
