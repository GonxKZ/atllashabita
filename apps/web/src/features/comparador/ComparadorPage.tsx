/* eslint-disable no-undef -- Blob, URL y document son tipos DOM globales del navegador. */
/**
 * Página de comparador territorial real (`/comparador`).
 *
 * Composición:
 *   - Drawer izquierdo con buscador y lista de candidatos del dataset
 *     nacional. Cada item permite añadir el municipio a la comparación.
 *   - Área central con drag & drop entre las cuatro "ranuras" disponibles.
 *   - Tabla diferencial con barras (CompareTable).
 *   - Radar / spider chart con la lectura normalizada (CompareSpider).
 *   - Botones para exportar la comparación a CSV y JSON.
 *
 * Persiste la lista en `useCompareStore`, que vive en `localStorage`.
 */
import { useMemo, useState, type DragEvent } from 'react';
import { Download, GripVertical, Plus, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { HelpKey } from '../../components/ui/HelpKey';
import { Tag } from '../../components/ui/Tag';
import { Tooltip } from '../../components/ui/Tooltip';
import { cn } from '../../components/ui/cn';
import { NATIONAL_MUNICIPALITIES, type NationalMunicipality } from '../../data/national_mock';
import { MAX_COMPARE_ITEMS, useCompareStore } from '../../state/compareStore';
import { CompareTable, COMPARE_INDICATORS, getIndicator } from './CompareTable';
import { CompareSpider } from './CompareSpider';

/** Devuelve los municipios cuyo nombre o provincia contienen `query`. */
export function searchMunicipalities(
  data: readonly NationalMunicipality[],
  query: string
): readonly NationalMunicipality[] {
  if (query.trim().length === 0) return data;
  const needle = query.trim().toLowerCase();
  return data.filter((entry) => {
    return (
      entry.name.toLowerCase().includes(needle) ||
      entry.province.toLowerCase().includes(needle) ||
      entry.id.includes(needle)
    );
  });
}

/** Resuelve la lista persistida en el store al objeto completo. */
export function resolveSelection(
  ids: readonly string[],
  source: readonly NationalMunicipality[]
): readonly NationalMunicipality[] {
  return ids
    .map((id) => source.find((entry) => entry.id === id))
    .filter((entry): entry is NationalMunicipality => Boolean(entry));
}

/** Construye CSV serializable con encabezados en español. */
export function buildCsv(municipalities: readonly NationalMunicipality[]): string {
  const headers = ['Indicador', 'Unidad', ...municipalities.map((m) => m.name)];
  const rows = COMPARE_INDICATORS.map((row) => {
    const values = municipalities.map((entry) => {
      const value = getIndicator(entry, row.id);
      return value === null ? '' : String(value);
    });
    return [row.label, row.unit, ...values];
  });
  const all = [headers, ...rows];
  return all
    .map((cells) =>
      cells
        .map((cell) => {
          const text = String(cell);
          return text.includes(',') || text.includes('"') ? `"${text.replace(/"/g, '""')}"` : text;
        })
        .join(',')
    )
    .join('\n');
}

/** Construye un objeto JSON serializable con la comparación completa. */
export function buildJson(municipalities: readonly NationalMunicipality[]): string {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    indicators: COMPARE_INDICATORS,
    municipalities: municipalities.map((entry) => ({
      id: entry.id,
      name: entry.name,
      province: entry.province,
      autonomousCommunity: entry.autonomousCommunity,
      score: entry.score,
      confidence: entry.confidence,
      indicators: entry.indicators,
    })),
  };
  return JSON.stringify(payload, null, 2);
}

function downloadFile(name: string, content: string, mime: string) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = name;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ComparadorPage() {
  const ids = useCompareStore((state) => state.territoryIds);
  const add = useCompareStore((state) => state.add);
  const remove = useCompareStore((state) => state.remove);
  const clear = useCompareStore((state) => state.clear);
  const reorder = useCompareStore((state) => state.reorder);

  const [query, setQuery] = useState('');
  const [dragId, setDragId] = useState<string | null>(null);

  const candidates = useMemo(() => searchMunicipalities(NATIONAL_MUNICIPALITIES, query), [query]);
  const selection = useMemo(() => resolveSelection(ids, NATIONAL_MUNICIPALITIES), [ids]);
  const slots = useMemo(() => {
    const arr: Array<NationalMunicipality | null> = [];
    for (let i = 0; i < MAX_COMPARE_ITEMS; i += 1) {
      arr.push(selection[i] ?? null);
    }
    return arr;
  }, [selection]);

  function handleDragStart(event: DragEvent<HTMLElement>, id: string) {
    setDragId(id);
    event.dataTransfer.setData('text/plain', id);
    event.dataTransfer.effectAllowed = 'copyMove';
  }

  function handleDropOnSlot(event: DragEvent<HTMLElement>, slotIndex: number) {
    event.preventDefault();
    const droppedId = event.dataTransfer.getData('text/plain') || dragId;
    if (!droppedId) return;
    const targetIndex = ids.indexOf(droppedId);
    if (targetIndex === -1) {
      add(droppedId);
    } else if (slotIndex < ids.length) {
      reorder(targetIndex, slotIndex);
    }
    setDragId(null);
  }

  function handleExportCsv() {
    if (selection.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`atlashabita-comparador-${stamp}.csv`, buildCsv(selection), 'text/csv');
  }

  function handleExportJson() {
    if (selection.length === 0) return;
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`atlashabita-comparador-${stamp}.json`, buildJson(selection), 'application/json');
  }

  return (
    <section
      aria-label="Comparador"
      className="mx-auto w-full max-w-7xl px-8 py-8"
      data-route="comparador"
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-ink-900 text-2xl font-semibold tracking-tight">
            Comparador territorial
          </h1>
          <p className="text-ink-500 mt-1 max-w-2xl text-sm">
            Añade hasta {MAX_COMPARE_ITEMS} municipios y observa diferencias en alquiler, empleo,
            conectividad y servicios. Las celdas marcadas como{' '}
            <Tag tone="brand" size="sm">
              Mejor
            </Tag>{' '}
            indican el municipio que destaca en cada fila.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Download size={14} aria-hidden="true" />}
            onClick={handleExportCsv}
            disabled={selection.length === 0}
          >
            Exportar CSV
          </Button>
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<Download size={14} aria-hidden="true" />}
            onClick={handleExportJson}
            disabled={selection.length === 0}
          >
            Exportar JSON
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leadingIcon={<Trash2 size={14} aria-hidden="true" />}
            onClick={() => clear()}
            disabled={selection.length === 0}
          >
            Vaciar
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <aside
          aria-label="Candidatos"
          className="flex max-h-[640px] flex-col gap-3 rounded-3xl border border-[color:var(--color-line-soft)] bg-white p-4 shadow-[var(--shadow-card)]"
        >
          <header>
            <h2 className="text-ink-900 text-sm font-semibold">Candidatos</h2>
            <p className="text-ink-500 text-xs">
              Pulsa <HelpKey>+</HelpKey> o arrastra a la zona central.
            </p>
          </header>
          <label className="sr-only" htmlFor="comparador-search">
            Buscar municipios
          </label>
          <input
            id="comparador-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filtra por nombre o provincia…"
            className="bg-surface-soft text-ink-900 placeholder:text-ink-500 focus:border-brand-400 focus:ring-brand-100 h-10 rounded-full border border-[color:var(--color-line-soft)] px-4 text-sm transition-colors focus:bg-white focus:ring-4 focus:outline-none"
          />
          <ul
            className="flex-1 divide-y divide-[color:var(--color-line-soft)] overflow-y-auto rounded-2xl border border-[color:var(--color-line-soft)]"
            data-testid="comparador-candidates"
          >
            {candidates.slice(0, 50).map((entry) => {
              const inComparison = ids.includes(entry.id);
              return (
                <li key={entry.id}>
                  <div
                    draggable
                    onDragStart={(event) => handleDragStart(event, entry.id)}
                    onDragEnd={() => setDragId(null)}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 transition-colors',
                      'hover:bg-surface-soft focus-within:bg-surface-soft',
                      inComparison && 'bg-brand-50/60'
                    )}
                  >
                    <GripVertical size={14} className="text-ink-400 shrink-0" aria-hidden="true" />
                    <span className="min-w-0 flex-1">
                      <span className="text-ink-900 block truncate text-sm font-medium">
                        {entry.name}
                      </span>
                      <span className="text-ink-500 block truncate text-[11px]">
                        {entry.province} · score {entry.score}
                      </span>
                    </span>
                    <button
                      type="button"
                      onClick={() => add(entry.id)}
                      disabled={inComparison || ids.length >= MAX_COMPARE_ITEMS}
                      aria-label={
                        inComparison
                          ? `${entry.name} ya está en la comparación`
                          : `Añadir ${entry.name} a la comparación`
                      }
                      data-testid={`comparador-add-${entry.id}`}
                      className={cn(
                        'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors',
                        inComparison
                          ? 'bg-brand-50 text-brand-600 cursor-default'
                          : 'bg-surface-muted text-ink-700 hover:bg-brand-100 hover:text-brand-700',
                        ids.length >= MAX_COMPARE_ITEMS &&
                          !inComparison &&
                          'cursor-not-allowed opacity-50'
                      )}
                    >
                      <Plus size={14} aria-hidden="true" />
                    </button>
                  </div>
                </li>
              );
            })}
            {candidates.length === 0 ? (
              <li className="px-3 py-6 text-center">
                <p className="text-ink-500 text-xs">Sin coincidencias para “{query}”.</p>
              </li>
            ) : null}
          </ul>
        </aside>

        <div className="flex flex-col gap-6">
          <section
            aria-label="Ranuras de comparación"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4"
            data-testid="comparador-slots"
          >
            {slots.map((slot, index) => (
              <div
                key={`slot-${index}`}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDropOnSlot(event, index)}
                className={cn(
                  'flex h-32 flex-col justify-between rounded-3xl border-2 border-dashed p-4 transition-colors',
                  slot
                    ? 'border-[color:var(--color-line-soft)] bg-white shadow-[var(--shadow-card)]'
                    : 'bg-surface-soft/40 hover:border-brand-300 hover:bg-brand-50/30 border-[color:var(--color-line-soft)]'
                )}
              >
                {slot ? (
                  <>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-ink-900 text-sm font-semibold">{slot.name}</p>
                        <p className="text-ink-500 text-xs">{slot.province}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(slot.id)}
                        aria-label={`Quitar ${slot.name}`}
                        className="text-ink-500 inline-flex h-7 w-7 items-center justify-center rounded-full transition-colors hover:bg-rose-50 hover:text-rose-600"
                      >
                        <span aria-hidden="true">×</span>
                      </button>
                    </div>
                    <Tooltip content="Score AtlasHabita compuesto sobre 100." side="bottom">
                      <span className="text-ink-700 cursor-help text-xs tabular-nums">
                        Score · {slot.score}{' '}
                        <span className="text-ink-400">
                          (conf {Math.round(slot.confidence * 100)}%)
                        </span>
                      </span>
                    </Tooltip>
                  </>
                ) : (
                  <div className="flex h-full flex-col items-center justify-center gap-1 text-center">
                    <span className="text-ink-500 text-xs font-medium">
                      Ranura {index + 1} libre
                    </span>
                    <span className="text-ink-400 text-[11px]">
                      Arrastra un municipio o pulsa <HelpKey>+</HelpKey>.
                    </span>
                  </div>
                )}
              </div>
            ))}
          </section>

          {selection.length === 0 ? (
            <EmptyState
              title="Aún no comparas ningún municipio"
              description="Añade al menos dos municipios para ver la tabla diferencial y el mapa de fortalezas. Puedes arrastrar desde el listado de la izquierda o pulsar el botón ➕."
              hint={
                <span>
                  Sugerencia: usa la paleta <HelpKey>Ctrl</HelpKey> <HelpKey>K</HelpKey> para
                  localizar municipios sin ratón.
                </span>
              }
            />
          ) : (
            <>
              <CompareTable municipalities={selection} onRemove={(id) => remove(id)} />
              <CompareSpider municipalities={selection} />
            </>
          )}
        </div>
      </div>
    </section>
  );
}
