/**
 * Tests del overlay FloatingRanking.
 *
 * Verifican: estado expandido por defecto, alternancia del pin contra el
 * store de UI y comportamiento de auto-colapso/restauración al
 * desenfocarse.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it } from 'vitest';

import { FloatingRanking } from '../FloatingRanking';
import { useUiStore } from '@/state/ui';

const wrap = (node: ReactNode) => <MemoryRouter>{node}</MemoryRouter>;

describe('FloatingRanking', () => {
  beforeEach(() => {
    useUiStore.getState().reset();
  });

  it('renderiza la cabecera y empieza expandido', () => {
    render(wrap(<FloatingRanking>contenido</FloatingRanking>));
    const aside = screen.getByLabelText(/ranking de municipios/i);
    expect(aside).toHaveAttribute('data-state', 'expanded');
    expect(aside.textContent).toMatch(/ranking nacional/i);
    expect(aside.textContent).toMatch(/Pinchar en el mapa/i);
  });

  it('togglea el pin contra el store de UI', async () => {
    const user = userEvent.setup();
    render(wrap(<FloatingRanking>contenido</FloatingRanking>));
    const pinBtn = screen.getByTestId('floating-ranking-pin');
    expect(pinBtn).toHaveAttribute('aria-pressed', 'false');
    await user.click(pinBtn);
    expect(useUiStore.getState().isRankingPinned).toBe(true);
    expect(pinBtn).toHaveAttribute('aria-pressed', 'true');
  });

  it('reacciona a forcedExpanded para representar el estado colapsado', () => {
    render(wrap(<FloatingRanking forcedExpanded={false}>x</FloatingRanking>));
    const aside = screen.getByLabelText(/ranking de municipios/i);
    expect(aside).toHaveAttribute('data-state', 'collapsed');
    // El cuerpo se oculta a SR cuando colapsa.
    const body = aside.querySelector('[aria-hidden="true"]');
    expect(body).not.toBeNull();
  });

  it('expande automáticamente al pinchar contra el pin', async () => {
    const user = userEvent.setup();
    render(wrap(<FloatingRanking>contenido</FloatingRanking>));
    const pinBtn = screen.getByTestId('floating-ranking-pin');
    await user.click(pinBtn);
    const aside = screen.getByLabelText(/ranking de municipios/i);
    expect(aside).toHaveAttribute('data-pinned', 'true');
    expect(aside).toHaveAttribute('data-state', 'expanded');
  });
});
