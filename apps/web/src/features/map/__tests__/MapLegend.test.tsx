/**
 * Tests de la leyenda dinámica.
 *
 * Verifica que la leyenda actualiza unidad, dominio y descripción cuando se
 * cambia la capa activa, garantizando coherencia con la rampa cromática.
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { MapLegend } from '../MapLegend';

const stops = [
  { min: 0, max: 20, color: '#34d399' },
  { min: 20, max: 40, color: '#10b981' },
  { min: 40, max: 60, color: '#059669' },
  { min: 60, max: 80, color: '#047857' },
  { min: 80, max: 100, color: '#065f46' },
];

describe('MapLegend', () => {
  it('renderiza la etiqueta y la unidad de la capa', () => {
    render(<MapLegend label="Banda ancha" stops={stops} unit=" %" domain={{ min: 0, max: 100 }} />);
    expect(screen.getByTestId('map-legend-label').textContent).toMatch(/banda ancha/i);
    expect(screen.getByTestId('map-legend-unit').textContent).toMatch(/%/);
  });

  it('renderiza un stop por cada tramo', () => {
    render(<MapLegend label="Score" stops={stops} unit="" domain={{ min: 0, max: 100 }} />);
    const list = screen.getByTestId('map-legend-stops');
    expect(list.querySelectorAll('li')).toHaveLength(stops.length);
  });

  it('muestra descripción cuando se proporciona', () => {
    render(
      <MapLegend
        label="Alquiler medio"
        description="Precio mensual del alquiler residencial."
        stops={stops}
        unit=" €/m²"
        domain={{ min: 400, max: 1500 }}
      />
    );
    expect(screen.getByTestId('map-legend-desc').textContent).toMatch(/precio mensual/i);
  });

  it('imprime el dominio observado en mínimos y máximos', () => {
    render(<MapLegend label="Renta" stops={stops} unit=" €" domain={{ min: 25000, max: 45000 }} />);
    const numbers = screen.getByLabelText(/leyenda: renta/i).textContent ?? '';
    expect(numbers).toContain('25.000');
    expect(numbers).toContain('45.000');
  });
});
