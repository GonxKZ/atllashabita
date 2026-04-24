/**
 * Tests del tooltip multi-indicador.
 *
 * Verifica que: (a) el tooltip muestra la lista completa de indicadores
 * cuando se proporciona, (b) resalta el indicador asociado a la capa activa
 * y (c) cae a la versión clásica cuando no hay indicadores.
 */

import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MapTooltip, type MapTooltipIndicator } from '../MapTooltip';

const indicators: MapTooltipIndicator[] = [
  { id: 'rent_price', label: 'Alquiler medio', value: 950, unit: '€/mes' },
  { id: 'broadband', label: 'Banda ancha', value: 95, unit: '%' },
  { id: 'income', label: 'Renta', value: 28000, unit: '€' },
  { id: 'accidents', label: 'Accidentes', value: 12, unit: 'víctimas/año' },
];

describe('MapTooltip', () => {
  it('muestra TODOS los indicadores cuando se aportan', () => {
    render(
      <MapTooltip
        name="Sevilla"
        score={82}
        value={950}
        x={0}
        y={0}
        layerLabel="Alquiler medio"
        unit=" €/m²"
        activeIndicatorId="rent_price"
        indicators={indicators}
      />
    );
    const list = screen.getByTestId('tooltip-indicators');
    expect(within(list).getAllByRole('listitem')).toHaveLength(indicators.length);
  });

  it('resalta el indicador activo (data-active=true)', () => {
    render(
      <MapTooltip
        name="Sevilla"
        score={82}
        value={95}
        x={0}
        y={0}
        layerLabel="Banda ancha"
        unit=" %"
        activeIndicatorId="broadband"
        indicators={indicators}
      />
    );
    const list = screen.getByTestId('tooltip-indicators');
    const items = within(list).getAllByRole('listitem');
    const active = items.find((item) => item.getAttribute('data-active') === 'true');
    expect(active?.textContent ?? '').toMatch(/banda ancha/i);
  });

  it('refleja la etiqueta de la capa activa', () => {
    render(
      <MapTooltip
        name="Madrid"
        score={89}
        value={99}
        x={0}
        y={0}
        layerLabel="Banda ancha"
        unit=" %"
        indicators={indicators}
      />
    );
    expect(screen.getByTestId('tooltip-active-layer').textContent).toBe('Banda ancha');
  });

  it('cae a layout clásico sin lista cuando no hay indicadores', () => {
    render(<MapTooltip name="Sevilla" score={82} value={950} x={0} y={0} unit="€" />);
    expect(screen.queryByTestId('tooltip-indicators')).toBeNull();
  });
});
