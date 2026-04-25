/**
 * Panel de ranking ampliado.
 *
 * Lee el dataset nacional mock y ofrece:
 *   - Lista paginada (20 por página) ordenada por score.
 *   - Filtros duros (precio máximo, conectividad mínima) aplicados en memoria
 *     de forma determinista.
 *   - Badge de confianza del score por municipio.
 *   - Selección sincronizada con el store de `selection` para que el mapa se
 *     entere cuando el usuario marca un municipio.
 *
 * El componente es auto-contenido: se puede instalar en cualquier ruta del
 * dashboard o en la propia ruta `/ranking`. Cuando la API real esté
 * disponible, bastará con sustituir `NATIONAL_MUNICIPALITIES` por el hook
 * `useRankings` (el shape es compatible con el tipo `NationalMunicipality`).
 */

import { Check, Filter, Sparkles } from 'lucide-react';
import { useMemo, useState, type KeyboardEvent } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { Pagination } from '../../components/ui/Pagination';
import { Slider } from '../../components/ui/Slider';
import { Tag } from '../../components/ui/Tag';
import { cn } from '../../components/ui/cn';
import {
  NATIONAL_MUNICIPALITIES,
  findSourceRef,
  type NationalMunicipality,
} from '../../data/national_mock';
import { useSelectionStore } from '../../state/selection';
import { ProvenanceChip } from '../provenance/ProvenanceChip';

const PAGE_SIZE = 20;
const DEFAULT_MAX_RENT = 1500;
const DEFAULT_MIN_BROADBAND = 90;

export interface RankingPanelProps {
  readonly title?: string;
  readonly data?: readonly NationalMunicipality[];
  readonly className?: string;
  readonly pageSize?: number;
}

function findIndicator(municipality: NationalMunicipality, id: string): number {
  return municipality.indicators.find((indicator) => indicator.id === id)?.value ?? 0;
}

function confidenceTone(confidence: number): 'success' | 'warning' | 'danger' {
  if (confidence >= 0.9) return 'success';
  if (confidence >= 0.8) return 'warning';
  return 'danger';
}

function isActivationKey(event: KeyboardEvent<HTMLElement>): boolean {
  return event.key === 'Enter' || event.key === ' ';
}

export function filterMunicipalities(
  data: readonly NationalMunicipality[],
  maxRent: number,
  minBroadband: number
): readonly NationalMunicipality[] {
  return data.filter(
    (entry) =>
      findIndicator(entry, 'rent_price') <= maxRent &&
      findIndicator(entry, 'broadband') >= minBroadband
  );
}

export function RankingPanel({
  title = 'Ranking nacional',
  data = NATIONAL_MUNICIPALITIES,
  className,
  pageSize = PAGE_SIZE,
}: RankingPanelProps) {
  const [page, setPage] = useState(1);
  const [maxRent, setMaxRent] = useState(DEFAULT_MAX_RENT);
  const [minBroadband, setMinBroadband] = useState(DEFAULT_MIN_BROADBAND);
  const selectedId = useSelectionStore((state) => state.selectedTerritoryId);
  const selectTerritory = useSelectionStore((state) => state.selectTerritory);

  const filtered = useMemo(
    () =>
      filterMunicipalities(data, maxRent, minBroadband)
        .slice()
        .sort((a, b) => b.score - a.score),
    [data, maxRent, minBroadband]
  );

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const start = (currentPage - 1) * pageSize;
  const pageRows = filtered.slice(start, start + pageSize);

  return (
    <Card
      tone="base"
      padding="md"
      className={cn('flex flex-col gap-4', className)}
      aria-label={title}
      data-feature="ranking-panel"
    >
      <CardHeader
        title={title}
        subtitle={`${filtered.length} municipios · ordenados por score`}
        action={
          <Tag tone="brand" icon={<Sparkles size={12} aria-hidden="true" />}>
            v0.2.0 · datos nacionales
          </Tag>
        }
      />

      <section
        aria-label="Filtros duros"
        className="grid grid-cols-1 gap-4 rounded-2xl border border-[color:var(--color-line-soft)] bg-white p-4 md:grid-cols-2"
      >
        <Slider
          label="Precio máximo alquiler"
          value={maxRent}
          min={400}
          max={1800}
          step={10}
          unit=" €"
          helper="Se filtran municipios con alquiler superior."
          onValueChange={(value) => {
            setMaxRent(value);
            setPage(1);
          }}
        />
        <Slider
          label="Conectividad mínima"
          value={minBroadband}
          min={70}
          max={100}
          step={1}
          unit=" %"
          helper="Cobertura de banda ancha requerida."
          onValueChange={(value) => {
            setMinBroadband(value);
            setPage(1);
          }}
        />
      </section>

      <ol
        aria-label="Lista de municipios"
        className="divide-y divide-[color:var(--color-line-soft)] rounded-2xl border border-[color:var(--color-line-soft)] bg-white"
        data-ranking-list
      >
        {pageRows.length === 0 ? (
          <li className="text-ink-500 px-4 py-6 text-center text-sm" role="status">
            <Filter size={16} aria-hidden="true" className="mr-2 inline-block" />
            Ningún municipio coincide con los filtros aplicados.
          </li>
        ) : (
          pageRows.map((entry, index) => {
            const rank = start + index + 1;
            const rent = findIndicator(entry, 'rent_price');
            const broadband = findIndicator(entry, 'broadband');
            const rentIndicator = entry.indicators.find((i) => i.id === 'rent_price');
            const rentSource = rentIndicator ? findSourceRef(rentIndicator.sourceId) : undefined;
            const isSelected = selectedId === entry.id;
            const toggleSelected = () => selectTerritory(isSelected ? null : entry.id);
            return (
              <li key={entry.id}>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={toggleSelected}
                  onKeyDown={(event) => {
                    if (!isActivationKey(event)) return;
                    event.preventDefault();
                    toggleSelected();
                  }}
                  aria-pressed={isSelected}
                  data-testid={`ranking-item-${entry.id}`}
                  className={cn(
                    'cursor-pointer',
                    'flex w-full items-center gap-4 px-4 py-3 text-left transition-colors',
                    'focus-visible:ring-brand-300 focus-visible:ring-2 focus-visible:outline-none focus-visible:ring-inset',
                    'hover:bg-surface-soft',
                    isSelected && 'bg-brand-50'
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="text-ink-500 w-6 text-right text-xs font-semibold tabular-nums"
                  >
                    {rank}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center gap-2">
                      <span className="text-ink-900 truncate text-sm font-semibold">
                        {entry.name}
                      </span>
                      {isSelected ? (
                        <Check size={14} className="text-brand-600" aria-hidden="true" />
                      ) : null}
                    </span>
                    <span className="text-ink-500 text-xs">
                      {entry.province} · {entry.autonomousCommunity}
                    </span>
                    <span className="flex flex-wrap items-center gap-2 pt-1">
                      <Tag tone="neutral" size="sm">
                        Alquiler {rent.toLocaleString('es-ES')} €
                      </Tag>
                      <Tag tone="info" size="sm">
                        Banda ancha {broadband}%
                      </Tag>
                      {rentSource ? (
                        <ProvenanceChip
                          sourceName={rentSource.name}
                          licence={rentSource.licence}
                          period={rentSource.period}
                          url={rentSource.url}
                        />
                      ) : null}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-1">
                    <span className="text-ink-900 text-xl font-semibold tabular-nums">
                      {entry.score}
                    </span>
                    <Badge tone={confidenceTone(entry.confidence)}>
                      conf · {Math.round(entry.confidence * 100)}%
                    </Badge>
                  </span>
                </div>
              </li>
            );
          })
        )}
      </ol>

      <footer className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-ink-500 text-xs">
          Página {currentPage} de {totalPages} · {pageSize} por página
        </p>
        <Pagination
          page={currentPage}
          totalPages={totalPages}
          onPageChange={setPage}
          label="Paginación del ranking"
        />
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            setMaxRent(DEFAULT_MAX_RENT);
            setMinBroadband(DEFAULT_MIN_BROADBAND);
            setPage(1);
          }}
        >
          Restablecer filtros
        </Button>
      </footer>
    </Card>
  );
}
