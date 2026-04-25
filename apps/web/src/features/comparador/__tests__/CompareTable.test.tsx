import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { COMPARE_INDICATORS, CompareTable, bestValue, getIndicator, ratio } from '../CompareTable';
import { NATIONAL_MUNICIPALITIES } from '../../../data/national_mock';

describe('getIndicator', () => {
  it('devuelve el valor cuando el indicador existe', () => {
    const entry = NATIONAL_MUNICIPALITIES[0]!;
    expect(getIndicator(entry, 'rent_price')).toBeGreaterThan(0);
  });

  it('devuelve null cuando no existe', () => {
    const entry = NATIONAL_MUNICIPALITIES[0]!;
    expect(getIndicator(entry, 'unknown')).toBeNull();
  });
});

describe('bestValue', () => {
  it('elige el menor cuando "menos es mejor"', () => {
    expect(bestValue([100, 80, 90], 'lower_is_better')).toBe(80);
  });

  it('elige el mayor cuando "más es mejor"', () => {
    expect(bestValue([100, 80, 90], 'higher_is_better')).toBe(100);
  });

  it('admite valores nulos', () => {
    expect(bestValue([null, 5, null], 'higher_is_better')).toBe(5);
    expect(bestValue([null, null], 'higher_is_better')).toBeNull();
  });
});

describe('ratio', () => {
  it('devuelve 1 cuando todos los valores son iguales', () => {
    expect(ratio(50, [50, 50])).toBe(1);
  });

  it('escala al rango cuando hay diferencias', () => {
    expect(ratio(75, [50, 100])).toBe(0.5);
  });
});

describe('CompareTable', () => {
  it('renderiza una columna por municipio y filas por indicador', () => {
    const sample = NATIONAL_MUNICIPALITIES.slice(0, 3);
    render(<CompareTable municipalities={sample} />);
    for (const entry of sample) {
      // Los municipios con mismo nombre que provincia (Barcelona, Sevilla, …)
      // aparecen dos veces; nos basta con verificar que están al menos una.
      expect(screen.getAllByText(entry.name).length).toBeGreaterThan(0);
    }
    for (const indicator of COMPARE_INDICATORS) {
      expect(screen.getByText(indicator.label)).toBeInTheDocument();
    }
  });

  it('marca con Mejor el municipio destacado', () => {
    const sample = NATIONAL_MUNICIPALITIES.slice(0, 2);
    render(<CompareTable municipalities={sample} />);
    expect(screen.getAllByText('Mejor').length).toBeGreaterThan(0);
  });
});
