/**
 * Tests del componente MiniMap.
 *
 * Verifican: render del SVG, posición proporcional del recuadro de
 * viewport, y comportamiento del toggle (mostrar/ocultar) coordinado con
 * `useUiStore`.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { MiniMap } from '../MiniMap';
import { useUiStore } from '@/state/ui';

describe('MiniMap', () => {
  beforeEach(() => {
    useUiStore.getState().reset();
  });

  it('renderiza el SVG y un recuadro de viewport por defecto', () => {
    render(<MiniMap />);
    const figure = screen.getByTestId('mini-map');
    expect(figure).toBeInTheDocument();
    const viewport = screen.getByTestId('mini-map-viewport');
    expect(viewport).toBeInTheDocument();
  });

  it('proyecta el viewport al rectángulo SVG', () => {
    render(<MiniMap viewport={{ minLon: -5, maxLon: 0, minLat: 38, maxLat: 42 }} />);
    const viewport = screen.getByTestId('mini-map-viewport');
    // El cálculo esperado: lonSpan=14.5, latSpan=8.5.
    // x=( -5 - (-10) ) / 14.5 * 200 ≈ 68.97
    // width=( 0 - (-5) ) / 14.5 * 200 ≈ 68.97
    // y=( 44 - 42 ) / 8.5 * 140 ≈ 32.94
    // height=( 42 - 38 ) / 8.5 * 140 ≈ 65.88
    expect(Number(viewport.getAttribute('x'))).toBeGreaterThan(60);
    expect(Number(viewport.getAttribute('x'))).toBeLessThan(80);
    expect(Number(viewport.getAttribute('width'))).toBeGreaterThan(60);
    expect(Number(viewport.getAttribute('y'))).toBeGreaterThan(20);
    expect(Number(viewport.getAttribute('height'))).toBeGreaterThan(50);
  });

  it('al ocultar muestra el botón de re-apertura y desaparece la figura', async () => {
    const user = userEvent.setup();
    render(<MiniMap />);
    await user.click(screen.getByTestId('mini-map-toggle'));
    expect(screen.queryByTestId('mini-map')).toBeNull();
    expect(screen.getByRole('button', { name: /mostrar mini-mapa/i })).toBeInTheDocument();
    expect(useUiStore.getState().miniMapOpen).toBe(false);
  });

  it('respeta el flag forcedVisible sobre el store', () => {
    useUiStore.getState().setMiniMapOpen(false);
    render(<MiniMap forcedVisible />);
    expect(screen.getByTestId('mini-map')).toBeInTheDocument();
  });
});
