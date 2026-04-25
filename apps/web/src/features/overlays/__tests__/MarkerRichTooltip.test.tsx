/**
 * Tests del MarkerRichTooltip.
 *
 * Verifican el render del marker, la sparkline, el top-3 de indicadores
 * y la activación del CTA "Ver ficha".
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MarkerRichTooltip, type MarkerRichTooltipMarker } from '../MarkerRichTooltip';

const baseMarker: MarkerRichTooltipMarker = {
  id: 'mun:41091',
  name: 'Sevilla',
  province: 'Sevilla',
  score: 78,
  value: 95,
  indicators: [
    { id: 'broadband', label: 'Banda ancha', value: 95, unit: '%' },
    { id: 'rent_price', label: 'Alquiler medio', value: 850, unit: '€' },
    { id: 'income', label: 'Renta', value: 28000, unit: '€' },
    { id: 'air_quality', label: 'Aire', value: 42, unit: 'AQI' },
  ],
};

describe('MarkerRichTooltip', () => {
  it('muestra nombre, score y sparkline del marker', () => {
    render(
      <MarkerRichTooltip
        marker={baseMarker}
        x={100}
        y={120}
        layerLabel="Banda ancha"
        unit=" %"
        activeIndicatorId="broadband"
      />
    );
    expect(screen.getByTestId('marker-rich-tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('marker-rich-tooltip-score')).toHaveTextContent('78');
    expect(screen.getByTestId('marker-rich-tooltip-sparkline')).toBeInTheDocument();
  });

  it('renderiza un máximo de 3 indicadores en el top, con el activo destacado', () => {
    render(
      <MarkerRichTooltip
        marker={baseMarker}
        x={0}
        y={0}
        layerLabel="Banda ancha"
        unit=" %"
        activeIndicatorId="broadband"
      />
    );
    const list = screen.getByTestId('marker-rich-tooltip-top');
    const items = within(list).getAllByRole('listitem');
    expect(items.length).toBeLessThanOrEqual(3);
    const active = items.find((item) => item.getAttribute('data-active') === 'true');
    expect(active?.textContent ?? '').toMatch(/banda ancha/i);
  });

  it('al pulsar "Ver ficha" emite onOpenSheet con el id del marker', async () => {
    const onOpenSheet = vi.fn();
    const user = userEvent.setup();
    render(
      <MarkerRichTooltip
        marker={baseMarker}
        x={0}
        y={0}
        layerLabel="Banda ancha"
        unit=" %"
        onOpenSheet={onOpenSheet}
      />
    );
    await user.click(screen.getByTestId('marker-rich-tooltip-cta'));
    expect(onOpenSheet).toHaveBeenCalledWith('mun:41091');
  });

  it('si no recibe indicadores, no se renderiza el top-3', () => {
    render(
      <MarkerRichTooltip
        marker={{ ...baseMarker, indicators: [] }}
        x={0}
        y={0}
        layerLabel="Score"
        unit=""
      />
    );
    expect(screen.queryByTestId('marker-rich-tooltip-top')).toBeNull();
  });

  it('expone microcopy "Pinchar en el mapa"', () => {
    render(
      <MarkerRichTooltip marker={baseMarker} x={0} y={0} layerLabel="Banda ancha" unit=" %" />
    );
    expect(screen.getByTestId('marker-rich-tooltip').textContent).toMatch(/Pinchar en el mapa/i);
  });
});
