/**
 * Tests de RichLegend.
 *
 * Cubren: render con la capa activa, atajos `[` y `]` para alternar de
 * capa, ocultar/mostrar la pastilla y propagación de la unidad.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RichLegend } from '../RichLegend';
import { useUiStore } from '@/state/ui';
import {
  MAP_LAYER_CATALOG,
  buildLegendStops,
  computeLayerDomain,
  resolveLayer,
  type EnrichedMapPoint,
} from '@/features/map/layers/catalog';
import { toEnrichedMapPoints } from '@/data/national_mock';

const points: readonly EnrichedMapPoint[] = toEnrichedMapPoints();

function buildHelpers(layerId: 'score' | 'broadband' | 'rent_price' = 'score') {
  const layer = resolveLayer(layerId);
  const domain = computeLayerDomain(points, layer);
  const stops = buildLegendStops(layer, domain);
  return { layer, domain, stops };
}

describe('RichLegend', () => {
  beforeEach(() => {
    useUiStore.getState().reset();
  });

  it('renderiza la etiqueta de la capa y su unidad correctamente', () => {
    const { layer, domain, stops } = buildHelpers('broadband');
    render(<RichLegend layer={layer} stops={stops} domain={domain} onLayerChange={() => {}} />);
    expect(screen.getByTestId('rich-legend')).toHaveAttribute(
      'aria-label',
      `Leyenda: ${layer.label}`
    );
    expect(screen.getByTestId('rich-legend-min').textContent).toMatch(/%/);
    expect(screen.getByTestId('rich-legend-max').textContent).toMatch(/%/);
  });

  it('cambia de capa con `[` y `]` invocando onLayerChange', () => {
    const onLayerChange = vi.fn();
    const { layer, domain, stops } = buildHelpers('score');
    render(
      <RichLegend
        layer={layer}
        stops={stops}
        domain={domain}
        onLayerChange={onLayerChange}
        catalog={MAP_LAYER_CATALOG}
      />
    );
    fireEvent.keyDown(window, { key: ']' });
    expect(onLayerChange).toHaveBeenCalledWith(MAP_LAYER_CATALOG[1].id);
    fireEvent.keyDown(window, { key: '[' });
    expect(onLayerChange).toHaveBeenLastCalledWith(
      MAP_LAYER_CATALOG[MAP_LAYER_CATALOG.length - 1].id
    );
  });

  it('los botones prev/next también invocan onLayerChange', async () => {
    const onLayerChange = vi.fn();
    const { layer, domain, stops } = buildHelpers('score');
    const user = userEvent.setup();
    render(
      <RichLegend
        layer={layer}
        stops={stops}
        domain={domain}
        onLayerChange={onLayerChange}
        catalog={MAP_LAYER_CATALOG}
      />
    );
    await user.click(screen.getByTestId('rich-legend-next'));
    expect(onLayerChange).toHaveBeenCalledWith(MAP_LAYER_CATALOG[1].id);
    await user.click(screen.getByTestId('rich-legend-prev'));
    expect(onLayerChange).toHaveBeenLastCalledWith(
      MAP_LAYER_CATALOG[MAP_LAYER_CATALOG.length - 1].id
    );
  });

  it('al ocultar muestra el botón de re-apertura', async () => {
    const user = userEvent.setup();
    const { layer, domain, stops } = buildHelpers('score');
    render(<RichLegend layer={layer} stops={stops} domain={domain} onLayerChange={() => {}} />);
    await user.click(screen.getByTestId('rich-legend-hide'));
    expect(screen.queryByTestId('rich-legend')).toBeNull();
    expect(screen.getByRole('button', { name: /mostrar leyenda/i })).toBeInTheDocument();
    expect(useUiStore.getState().legendOpen).toBe(false);
  });

  it('al estar oculta no consume las pulsaciones [ ]', () => {
    useUiStore.getState().setLegendOpen(false);
    const onLayerChange = vi.fn();
    const { layer, domain, stops } = buildHelpers('score');
    render(
      <RichLegend layer={layer} stops={stops} domain={domain} onLayerChange={onLayerChange} />
    );
    fireEvent.keyDown(window, { key: ']' });
    expect(onLayerChange).not.toHaveBeenCalled();
  });
});
