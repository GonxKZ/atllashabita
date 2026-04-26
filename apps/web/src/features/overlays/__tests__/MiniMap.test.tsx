/**
 * Tests del componente MiniMap.
 *
 * Verifican: render del mapa real, estado offline, y comportamiento del
 * toggle (mostrar/ocultar) coordinado con
 * `useUiStore`.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { vi } from 'vitest';

vi.mock('maplibre-gl', () => ({ default: {} }));

vi.mock('react-map-gl/maplibre', () => ({
  __esModule: true,
  default: ({
    children,
    mapStyle,
    interactive,
  }: {
    children?: ReactNode;
    mapStyle?: unknown;
    interactive?: boolean;
  }) => (
    <div
      data-testid="maplibre-minimap"
      data-interactive={String(interactive)}
      data-style-kind={typeof mapStyle === 'string' ? 'remote' : 'fallback'}
    >
      {children}
    </div>
  ),
}));

import { MiniMap } from '../MiniMap';
import { useUiStore } from '@/state/ui';

describe('MiniMap', () => {
  beforeEach(() => {
    useUiStore.getState().reset();
  });

  it('renderiza una instancia real de mapa no interactiva', () => {
    render(<MiniMap />);
    const figure = screen.getByTestId('mini-map');
    expect(figure).toBeInTheDocument();
    expect(screen.getByTestId('mini-map-real-map')).toBeInTheDocument();
    expect(screen.getByTestId('maplibre-minimap')).toHaveAttribute('data-interactive', 'false');
  });

  it('puede usar estilo offline sin depender de tiles remotos', () => {
    render(<MiniMap offline />);
    expect(screen.getByTestId('maplibre-minimap')).toHaveAttribute('data-style-kind', 'fallback');
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
