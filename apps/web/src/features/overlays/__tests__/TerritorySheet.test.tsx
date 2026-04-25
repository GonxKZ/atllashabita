/**
 * Tests del bottom-sheet TerritorySheet.
 *
 * Cubren: visibilidad controlada por `territoryId`, snap por defecto,
 * cierre por Escape y por botón de cierre, navegación entre snaps con
 * teclado, render del nombre del territorio en el título.
 */

import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TerritorySheet, SHEET_SNAP_POINTS } from '../TerritorySheet';
import { NATIONAL_MUNICIPALITIES } from '@/data/national_mock';

const wrap = (node: ReactNode) => <MemoryRouter>{node}</MemoryRouter>;

const FIRST = NATIONAL_MUNICIPALITIES[0];

describe('TerritorySheet', () => {
  it('no renderiza nada cuando territoryId es null', () => {
    render(wrap(<TerritorySheet territoryId={null} onClose={() => {}} />));
    expect(screen.queryByTestId('territory-sheet')).toBeNull();
  });

  it('renderiza con el snap por defecto cuando hay territoryId', () => {
    render(wrap(<TerritorySheet territoryId={FIRST.id} onClose={() => {}} />));
    const sheet = screen.getByTestId('territory-sheet');
    expect(sheet).toHaveAttribute('data-snap', 'default');
    expect(sheet.style.height).toBe(`${SHEET_SNAP_POINTS.default}vh`);
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(FIRST.name);
  });

  it('cierra al pulsar Escape', () => {
    const onClose = vi.fn();
    render(wrap(<TerritorySheet territoryId={FIRST.id} onClose={onClose} />));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('cierra al pulsar el botón de cierre', async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(wrap(<TerritorySheet territoryId={FIRST.id} onClose={onClose} />));
    await user.click(screen.getByTestId('territory-sheet-close'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('permite expandir el sheet con ArrowUp en el handle', () => {
    render(wrap(<TerritorySheet territoryId={FIRST.id} onClose={() => {}} />));
    const handle = screen.getByRole('slider');
    fireEvent.keyDown(handle, { key: 'ArrowUp' });
    const sheet = screen.getByTestId('territory-sheet');
    expect(sheet).toHaveAttribute('data-snap', 'expanded');
  });

  it('al pulsar ArrowDown desde peek invoca onClose', () => {
    const onClose = vi.fn();
    render(wrap(<TerritorySheet territoryId={FIRST.id} onClose={onClose} initialSnap="peek" />));
    const handle = screen.getByRole('slider');
    fireEvent.keyDown(handle, { key: 'ArrowDown' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('expone el microcopy "Arrastra hacia abajo" en el handle accesible', () => {
    render(wrap(<TerritorySheet territoryId={FIRST.id} onClose={() => {}} />));
    expect(screen.getByRole('slider')).toHaveAttribute(
      'aria-label',
      'Arrastra hacia abajo para cerrar la ficha.'
    );
  });
});
