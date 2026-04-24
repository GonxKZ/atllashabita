/* eslint-disable no-undef -- document, HTMLElement y KeyboardEvent son globales DOM. */
/**
 * Modal "Ver RDF" con contenido Turtle paginado.
 *
 * Consume `useRdfExport`; si el backend aún no está disponible, muestra un
 * fallback determinista con un Turtle mínimo construido en cliente a partir
 * del municipio seleccionado. El fallback permite que la UI sea verificable
 * en e2e y en la presentación académica aunque la Fase C no esté
 * operativa.
 */

import { X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { CodeBlock } from '../../components/ui/CodeBlock';
import { Pagination } from '../../components/ui/Pagination';
import { Tag } from '../../components/ui/Tag';
import { useRdfExport } from '../../hooks/useRdfExport';
import {
  NATIONAL_MUNICIPALITIES,
  findSourceRef,
  type NationalMunicipality,
} from '../../data/national_mock';

export interface RdfExportModalProps {
  readonly territoryId: string;
  readonly territoryName: string;
  readonly onClose: () => void;
}

const LINES_PER_PAGE = 20;

/**
 * Construye un Turtle sintético con los indicadores y la procedencia PROV-O
 * del municipio. Solo se usa cuando el backend devuelve error o aún no está
 * disponible; así la UI sigue siendo demostrable.
 */
export function buildFallbackTurtle(municipality: NationalMunicipality): string {
  const lines = [
    '@prefix ah:   <https://atlashabita.es/ontology#> .',
    '@prefix dct:  <http://purl.org/dc/terms/> .',
    '@prefix prov: <http://www.w3.org/ns/prov#> .',
    '@prefix xsd:  <http://www.w3.org/2001/XMLSchema#> .',
    '',
    `ah:territory/${municipality.id} a ah:Municipality ;`,
    `    ah:name "${municipality.name}" ;`,
    `    ah:province "${municipality.province}" ;`,
    `    ah:score "${municipality.score}"^^xsd:integer ;`,
    `    ah:confidence "${municipality.confidence.toFixed(2)}"^^xsd:decimal .`,
    '',
  ];
  for (const indicator of municipality.indicators) {
    const source = findSourceRef(indicator.sourceId);
    lines.push(
      `ah:indicator/${municipality.id}/${indicator.id} a ah:Indicator ;`,
      `    ah:value "${indicator.value}"^^xsd:decimal ;`,
      `    ah:unit "${indicator.unit}" ;`,
      `    dct:source <${source?.url ?? 'https://atlashabita.es/source/unknown'}> ;`,
      `    prov:wasDerivedFrom <urn:source:${indicator.sourceId}> .`,
      ''
    );
  }
  return lines.join('\n');
}

function paginateTurtle(turtle: string): readonly string[] {
  const lines = turtle.split('\n');
  const pages: string[] = [];
  for (let index = 0; index < lines.length; index += LINES_PER_PAGE) {
    pages.push(lines.slice(index, index + LINES_PER_PAGE).join('\n'));
  }
  return pages.length > 0 ? pages : [''];
}

export function RdfExportModal({ territoryId, territoryName, onClose }: RdfExportModalProps) {
  const [page, setPage] = useState(1);

  const request = useMemo(
    () => ({
      territoryId,
      format: 'turtle' as const,
      page,
    }),
    [territoryId, page]
  );

  const { data, isError } = useRdfExport(request);

  const municipality = useMemo(
    () => NATIONAL_MUNICIPALITIES.find((entry) => entry.id === territoryId),
    [territoryId]
  );
  const fallbackTurtle = useMemo(
    () => (municipality ? buildFallbackTurtle(municipality) : ''),
    [municipality]
  );
  const fallbackPages = useMemo(() => paginateTurtle(fallbackTurtle), [fallbackTurtle]);

  const handleClose = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [handleClose]);

  const usingFallback = isError || !data;
  const content = usingFallback
    ? (fallbackPages[Math.min(page, fallbackPages.length) - 1] ?? '')
    : (data?.content ?? '');
  const totalPages = usingFallback ? fallbackPages.length : (data?.totalPages ?? 1);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="rdf-modal-title"
      className="fixed inset-0 z-30 flex items-center justify-center p-4"
    >
      <button
        type="button"
        aria-label="Cerrar mediante fondo"
        className="absolute inset-0 bg-slate-900/40 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
        onClick={handleClose}
      />
      <div className="relative flex w-full max-w-3xl flex-col gap-4 rounded-3xl bg-white p-6 shadow-[var(--shadow-elevated)]">
        <header className="flex items-start justify-between gap-3">
          <div>
            <h2 id="rdf-modal-title" className="font-display text-ink-900 text-xl font-semibold">
              Grafo RDF · {territoryName}
            </h2>
            <p className="text-ink-500 mt-1 text-xs">
              Formato Turtle · paginado en bloques de {LINES_PER_PAGE} líneas
            </p>
          </div>
          <div className="flex items-center gap-2">
            {usingFallback ? (
              <Tag tone="warning">Fallback local</Tag>
            ) : (
              <Tag tone="success">API</Tag>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClose}
              leadingIcon={<X size={14} aria-hidden="true" />}
              aria-label="Cerrar ventana"
            >
              Cerrar
            </Button>
          </div>
        </header>

        <CodeBlock
          code={content}
          language="turtle"
          label={`Turtle de ${territoryName}`}
          showLineNumbers
          maxHeight={360}
        />

        <footer className="flex items-center justify-between gap-3">
          <p className="text-ink-500 text-xs">
            Página {Math.min(page, totalPages)} de {totalPages}
          </p>
          <Pagination
            page={Math.min(page, totalPages)}
            totalPages={totalPages}
            onPageChange={setPage}
            label="Paginación del grafo"
          />
        </footer>
      </div>
    </div>
  );
}
