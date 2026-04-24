/**
 * Tests del `LayerSwitcher` reactivo (single-select).
 *
 * Cubrimos: render del catálogo completo, propagación de eventos al cambiar
 * la capa y atributos ARIA del grupo de radios. Mantener estos tests es
 * crítico porque el componente se monta tanto en `/mapa` como en la home,
 * sincronizado vía store global.
 */

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LayerSwitcher } from '../LayerSwitcher';
import { MAP_LAYER_CATALOG } from '../catalog';

describe('LayerSwitcher', () => {
  it('renderiza al menos ocho capas con role radio', () => {
    expect(MAP_LAYER_CATALOG.length).toBeGreaterThanOrEqual(8);
    render(<LayerSwitcher activeLayerId="score" onChange={() => undefined} />);
    expect(screen.getAllByRole('radio')).toHaveLength(MAP_LAYER_CATALOG.length);
  });

  it('marca exactamente una capa como activa', () => {
    render(<LayerSwitcher activeLayerId="broadband" onChange={() => undefined} />);
    const broadband = screen.getByRole('radio', { name: /banda ancha/i });
    expect(broadband).toBeChecked();
    const score = screen.getByRole('radio', { name: /score territorial/i });
    expect(score).not.toBeChecked();
  });

  it('propaga el cambio al padre con el id seleccionado', async () => {
    const user = userEvent.setup();
    const handleChange = vi.fn();
    render(<LayerSwitcher activeLayerId="score" onChange={handleChange} />);
    await user.click(screen.getByRole('radio', { name: /alquiler medio/i }));
    expect(handleChange).toHaveBeenCalledWith('rent_price');
  });

  it('expone descripción y unidad de cada capa por accesibilidad', () => {
    render(<LayerSwitcher activeLayerId="score" onChange={() => undefined} />);
    const group = screen.getByRole('radiogroup', { name: /capa activa/i });
    const accidents = within(group).getByText(/víctimas anuales en accidentes/i);
    expect(accidents).toBeInTheDocument();
  });

  it('anuncia la capa activa con aria-live', () => {
    const { container } = render(
      <LayerSwitcher activeLayerId="climate" onChange={() => undefined} />
    );
    const live = container.querySelector('[aria-live="polite"]');
    expect(live?.textContent ?? '').toMatch(/clima/i);
  });
});
