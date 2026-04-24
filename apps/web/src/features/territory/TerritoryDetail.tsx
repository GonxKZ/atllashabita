/**
 * Ficha territorial completa.
 *
 * Muestra la cabecera con jerarquía territorial, una tabla de indicadores con
 * chips de procedencia (PROV-O), la explicación del score y un botón para
 * abrir el modal "Ver RDF" que renderiza el grafo Turtle paginado.
 *
 * La vista acepta directamente un municipio del dataset nacional mock. Cuando
 * la API real esté disponible, el router podrá pasar el ID por la URL y la
 * ruta leerá el dato con `useTerritoryDetail`; el componente de presentación
 * no cambia.
 */

import { ArrowLeft, Building2, FileCode2, Info, Users } from 'lucide-react';
import { useParams, Link } from 'react-router-dom';
import { useMemo, useState } from 'react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { DataTable, type DataTableColumn } from '../../components/ui/DataTable';
import { Stat } from '../../components/ui/Stat';
import { cn } from '../../components/ui/cn';
import {
  NATIONAL_MUNICIPALITIES,
  findSourceRef,
  type NationalIndicator,
  type NationalMunicipality,
} from '../../data/national_mock';
import { ProvenanceChip } from '../provenance/ProvenanceChip';
import { RdfExportModal } from './RdfExportModal';

export interface TerritoryDetailProps {
  readonly municipality?: NationalMunicipality;
  readonly data?: readonly NationalMunicipality[];
}

function resolveMunicipality(
  data: readonly NationalMunicipality[],
  routeId: string | undefined,
  fallback: NationalMunicipality | undefined
): NationalMunicipality | null {
  if (fallback) return fallback;
  if (!routeId) return data[0] ?? null;
  return data.find((entry) => entry.id === routeId) ?? null;
}

/**
 * Genera un texto explicativo del score combinando los indicadores más
 * relevantes. Se mantiene determinista (basado en valores numéricos) para que
 * los tests sean estables.
 */
function buildScoreExplanation(municipality: NationalMunicipality): string {
  const broadband = municipality.indicators.find((i) => i.id === 'broadband')?.value ?? 0;
  const income = municipality.indicators.find((i) => i.id === 'income')?.value ?? 0;
  const rent = municipality.indicators.find((i) => i.id === 'rent_price')?.value ?? 0;
  const air = municipality.indicators.find((i) => i.id === 'air_quality')?.value ?? 0;
  const pieces: string[] = [];
  if (broadband >= 96) pieces.push('conectividad excelente');
  else if (broadband >= 90) pieces.push('conectividad adecuada');
  if (income >= 32000) pieces.push('renta por hogar alta');
  else if (income >= 28000) pieces.push('renta por hogar media-alta');
  if (rent < 800) pieces.push('alquiler asequible');
  else if (rent < 1100) pieces.push('alquiler en rango medio');
  else pieces.push('alquiler tensionado');
  if (air <= 45) pieces.push('calidad del aire buena');
  else if (air <= 55) pieces.push('calidad del aire aceptable');
  return `El score ${municipality.score} se apoya en: ${pieces.join(', ')}.`;
}

export function TerritoryDetail({
  municipality,
  data = NATIONAL_MUNICIPALITIES,
}: TerritoryDetailProps) {
  const params = useParams<{ id?: string }>();
  const selected = resolveMunicipality(data, params.id, municipality);
  const [rdfOpen, setRdfOpen] = useState(false);

  const indicatorColumns = useMemo<DataTableColumn<NationalIndicator>[]>(
    () => [
      {
        id: 'label',
        header: 'Indicador',
        cell: (row) => <span className="font-medium">{row.label}</span>,
      },
      {
        id: 'value',
        header: 'Valor',
        align: 'right',
        cell: (row) => (
          <span className="tabular-nums">
            {new Intl.NumberFormat('es-ES').format(row.value)} {row.unit}
          </span>
        ),
      },
      {
        id: 'quality',
        header: 'Calidad',
        cell: (row) => (
          <Badge tone={row.quality === 'ok' ? 'success' : 'warning'}>{row.quality}</Badge>
        ),
      },
      {
        id: 'source',
        header: 'Fuente',
        cell: (row) => {
          const source = findSourceRef(row.sourceId);
          if (!source) return <span className="text-ink-500 text-xs">Sin fuente</span>;
          return (
            <ProvenanceChip
              sourceName={source.name}
              licence={source.licence}
              period={source.period}
              url={source.url}
            />
          );
        },
      },
    ],
    []
  );

  if (!selected) {
    return (
      <Card tone="soft" padding="md">
        <p className="text-ink-500">No se encontró información para el territorio indicado.</p>
        <Link
          to="/ranking"
          className="text-brand-600 hover:text-brand-700 mt-3 inline-flex items-center gap-1 text-sm font-semibold"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Volver al ranking
        </Link>
      </Card>
    );
  }

  const populationIndicator = selected.indicators.find((i) => i.id === 'population');

  return (
    <section
      aria-labelledby="territory-detail-title"
      data-feature="territory-detail"
      className="flex flex-col gap-4"
    >
      <Card tone="base" padding="md" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <Link
              to="/ranking"
              className="text-brand-600 hover:text-brand-700 inline-flex items-center gap-1 text-xs font-semibold"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              Volver al ranking
            </Link>
            <h1
              id="territory-detail-title"
              className="font-display text-ink-900 text-2xl font-bold"
            >
              {selected.name}
            </h1>
            <p className="text-ink-500 text-sm">
              {selected.province} · {selected.autonomousCommunity}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Stat
              label="Score"
              value={selected.score}
              hint={`${Math.round(selected.confidence * 100)}% confianza`}
            />
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={<FileCode2 size={14} aria-hidden="true" />}
              onClick={() => setRdfOpen(true)}
              data-testid="open-rdf-modal"
            >
              Ver RDF
            </Button>
          </div>
        </div>
        <div
          className={cn(
            'grid grid-cols-2 gap-3 rounded-2xl border border-[color:var(--color-line-soft)] bg-white p-4',
            'md:grid-cols-3'
          )}
        >
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="bg-brand-50 text-brand-600 inline-flex h-10 w-10 items-center justify-center rounded-2xl"
            >
              <Users size={18} />
            </span>
            <div>
              <p className="text-ink-500 text-xs font-medium">Población</p>
              <p className="text-ink-900 text-sm font-semibold tabular-nums">
                {populationIndicator
                  ? new Intl.NumberFormat('es-ES').format(populationIndicator.value)
                  : '—'}{' '}
                hab.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-700"
            >
              <Building2 size={18} />
            </span>
            <div>
              <p className="text-ink-500 text-xs font-medium">Jerarquía</p>
              <p className="text-ink-900 text-sm font-semibold">
                Municipio · {selected.autonomousCommunity}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-700"
            >
              <Info size={18} />
            </span>
            <div>
              <p className="text-ink-500 text-xs font-medium">Explicación</p>
              <p className="text-ink-900 text-sm font-medium">{buildScoreExplanation(selected)}</p>
            </div>
          </div>
        </div>
      </Card>

      <Card tone="base" padding="md" className="flex flex-col gap-3">
        <CardHeader title="Indicadores" subtitle="Valores vigentes · fuentes y licencias PROV-O" />
        <DataTable
          ariaLabel={`Indicadores de ${selected.name}`}
          columns={indicatorColumns}
          rows={selected.indicators}
          getRowId={(row) => row.id}
        />
      </Card>

      {rdfOpen ? (
        <RdfExportModal
          territoryId={selected.id}
          territoryName={selected.name}
          onClose={() => setRdfOpen(false)}
        />
      ) : null}
    </section>
  );
}
