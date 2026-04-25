/* eslint-disable no-undef -- HTMLFormElement es tipo DOM global resuelto por TypeScript. */
/**
 * Página del simulador de escenarios (`/escenarios`).
 *
 * El usuario ajusta los pesos en `WeightSliders` y observa al instante cómo
 * cambia el top-10 nacional. Puede guardar combinaciones nombradas en el
 * `useEscenariosStore` (localStorage) y cargarlas más tarde para comparar
 * antes/después con la baseline.
 *
 * Cálculo del ranking: el componente computa una puntuación normalizada en
 * cliente a partir del dataset territorial integrado. La misma lógica
 * normalizada se reutiliza en el dashboard para que el mapa refleje la mezcla
 * del usuario sin esperar a una recarga.
 */
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { ArrowDownLeft, ArrowDownRight, BookmarkPlus, RotateCcw } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { EmptyState } from '../../components/ui/EmptyState';
import { HelpKey } from '../../components/ui/HelpKey';
import { Tag } from '../../components/ui/Tag';
import { Tooltip } from '../../components/ui/Tooltip';
import { cn } from '../../components/ui/cn';
import { NATIONAL_MUNICIPALITIES } from '../../data/national_mock';
import { DEFAULT_WEIGHTS, useEscenariosStore } from '../../state/escenariosStore';
import { computeRanges, rankMunicipalities, type RankedEntry } from './scoring';
import { WEIGHT_DESCRIPTORS, WeightSliders } from './WeightSliders';

const TOP_LIMIT = 10;

const RANGES = computeRanges(NATIONAL_MUNICIPALITIES);

function buildBaseline(): readonly RankedEntry[] {
  return rankMunicipalities(NATIONAL_MUNICIPALITIES, DEFAULT_WEIGHTS, TOP_LIMIT, RANGES);
}

export function EscenariosPage() {
  const weights = useEscenariosStore((state) => state.weights);
  const setWeight = useEscenariosStore((state) => state.setWeight);
  const resetToBaseline = useEscenariosStore((state) => state.resetToBaseline);
  const saveScenario = useEscenariosStore((state) => state.saveScenario);
  const loadScenario = useEscenariosStore((state) => state.loadScenario);
  const deleteScenario = useEscenariosStore((state) => state.deleteScenario);
  const scenarios = useEscenariosStore((state) => state.scenarios);

  const [scenarioName, setScenarioName] = useState('');
  const [feedback, setFeedback] = useState<{ kind: 'ok' | 'error'; message: string } | null>(null);

  const baselineRanking = useMemo(() => buildBaseline(), []);
  const currentRanking = useMemo(
    () => rankMunicipalities(NATIONAL_MUNICIPALITIES, weights, TOP_LIMIT, RANGES),
    [weights]
  );

  const baselinePositions = useMemo(() => {
    const map = new Map<string, number>();
    baselineRanking.forEach((row, index) => map.set(row.entry.id, index + 1));
    return map;
  }, [baselineRanking]);

  // Limpia el feedback transitorio al cambiar pesos para evitar mensajes obsoletos.
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 4000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [feedback]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const id = saveScenario(scenarioName);
    setScenarioName('');
    setFeedback({ kind: 'ok', message: `Escenario guardado (#${id.slice(-6)}).` });
  }

  function handleLoad(id: string) {
    const ok = loadScenario(id);
    if (!ok) {
      setFeedback({ kind: 'error', message: 'No pudimos recuperar el escenario.' });
      return;
    }
    setFeedback({ kind: 'ok', message: 'Escenario aplicado al simulador.' });
  }

  return (
    <section
      aria-label="Escenarios"
      className="mx-auto w-full max-w-7xl px-8 py-8"
      data-route="escenarios"
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-ink-900 text-2xl font-semibold tracking-tight">
            Simulador de escenarios
          </h1>
          <p className="text-ink-500 mt-1 max-w-2xl text-sm">
            Ajusta cuánto pesa cada criterio en tu perfil y observa al instante cómo cambia el top-
            {TOP_LIMIT} nacional. Guarda combinaciones para volver más tarde.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={<RotateCcw size={14} aria-hidden="true" />}
            onClick={() => resetToBaseline()}
          >
            Restaurar baseline
          </Button>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <div className="flex flex-col gap-6">
          <WeightSliders weights={weights} onChange={(id, value) => setWeight(id, value)} />

          <form
            onSubmit={handleSubmit}
            aria-label="Guardar escenario"
            className="flex flex-wrap items-end gap-3 rounded-3xl border border-[color:var(--color-line-soft)] bg-white p-4 shadow-[var(--shadow-card)]"
          >
            <div className="flex flex-1 flex-col gap-1">
              <label htmlFor="scenario-name" className="text-ink-700 text-xs font-semibold">
                Nombre del escenario
              </label>
              <input
                id="scenario-name"
                type="text"
                value={scenarioName}
                onChange={(event) => setScenarioName(event.target.value)}
                placeholder="Mi escenario familiar"
                className="bg-surface-soft text-ink-900 placeholder:text-ink-500 focus:border-brand-400 focus:ring-brand-100 h-10 rounded-full border border-[color:var(--color-line-soft)] px-4 text-sm transition-colors focus:bg-white focus:ring-4 focus:outline-none"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              leadingIcon={<BookmarkPlus size={16} aria-hidden="true" />}
            >
              Guardar escenario
            </Button>
          </form>

          {scenarios.length > 0 ? (
            <section
              aria-label="Escenarios guardados"
              className="rounded-3xl border border-[color:var(--color-line-soft)] bg-white p-4 shadow-[var(--shadow-card)]"
            >
              <h2 className="text-ink-900 mb-2 text-sm font-semibold">Escenarios guardados</h2>
              <ul
                className="divide-y divide-[color:var(--color-line-soft)]"
                data-testid="escenarios-list"
              >
                {scenarios.map((scenario) => (
                  <li
                    key={scenario.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-ink-900 truncate text-sm font-medium">{scenario.name}</p>
                      <p className="text-ink-500 text-[11px]">
                        Guardado{' '}
                        {new Date(scenario.createdAt).toLocaleString('es-ES', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handleLoad(scenario.id)}>
                        Cargar
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => deleteScenario(scenario.id)}>
                        Borrar
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {feedback ? (
            <p
              role={feedback.kind === 'error' ? 'alert' : 'status'}
              aria-live="polite"
              className={cn(
                'rounded-2xl px-4 py-2 text-sm',
                feedback.kind === 'error'
                  ? 'border border-rose-200 bg-rose-50 text-rose-700'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
              )}
            >
              {feedback.message}
            </p>
          ) : null}
        </div>

        <aside
          aria-label="Top-10 actual"
          className="flex flex-col gap-4 rounded-3xl border border-[color:var(--color-line-soft)] bg-white p-5 shadow-[var(--shadow-card)]"
        >
          <header>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-ink-900 text-base font-semibold tracking-tight">
                Top-{TOP_LIMIT} con tus pesos
              </h2>
              <Tag tone="brand" size="sm">
                {WEIGHT_DESCRIPTORS.length} factores
              </Tag>
            </div>
            <p className="text-ink-500 text-xs">
              La columna Δ refleja cuántas posiciones gana o pierde cada municipio respecto a la
              baseline equilibrada.
            </p>
          </header>
          {currentRanking.length === 0 ? (
            <EmptyState
              compact
              title="No hay resultados"
              description="Reparte algo de peso entre los criterios para empezar a ver resultados."
            />
          ) : (
            <ol
              className="divide-y divide-[color:var(--color-line-soft)]"
              data-testid="escenarios-ranking"
            >
              {currentRanking.map((row, index) => {
                const baselinePosition = baselinePositions.get(row.entry.id);
                const delta =
                  baselinePosition === undefined ? null : baselinePosition - (index + 1);
                return (
                  <li
                    key={row.entry.id}
                    className="flex items-center gap-3 py-2"
                    data-testid={`escenarios-row-${row.entry.id}`}
                  >
                    <span className="text-ink-500 w-6 text-right text-xs font-semibold tabular-nums">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-ink-900 block truncate text-sm font-medium">
                        {row.entry.name}
                      </span>
                      <span className="text-ink-500 block truncate text-[11px]">
                        {row.entry.province}
                      </span>
                    </span>
                    <span className="text-ink-900 text-sm font-semibold tabular-nums">
                      {row.score.toFixed(1)}
                    </span>
                    {delta !== null ? (
                      <Tooltip
                        content={
                          delta === 0
                            ? 'Misma posición que en la baseline.'
                            : delta > 0
                              ? `Sube ${delta} posiciones respecto a la baseline.`
                              : `Baja ${Math.abs(delta)} posiciones respecto a la baseline.`
                        }
                        side="left"
                      >
                        <span
                          className={cn(
                            'inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px] font-semibold tabular-nums',
                            delta === 0 && 'bg-surface-muted text-ink-700',
                            delta > 0 && 'bg-brand-50 text-brand-700',
                            delta < 0 && 'bg-amber-50 text-amber-700'
                          )}
                        >
                          {delta === 0 ? (
                            '='
                          ) : delta > 0 ? (
                            <>
                              <ArrowDownLeft size={12} aria-hidden="true" />+{delta}
                            </>
                          ) : (
                            <>
                              <ArrowDownRight size={12} aria-hidden="true" />
                              {delta}
                            </>
                          )}
                        </span>
                      </Tooltip>
                    ) : null}
                  </li>
                );
              })}
            </ol>
          )}
          <footer className="text-ink-500 text-[11px]">
            Pulsa <HelpKey>Ctrl</HelpKey> <HelpKey>K</HelpKey> y escribe el nombre del municipio
            para abrir su ficha completa.
          </footer>
        </aside>
      </div>
    </section>
  );
}
