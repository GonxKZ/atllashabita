/**
 * Tests de la página `/mapa`.
 *
 * Verifica que la página monta el `LayerSwitcher` reactivo y que la
 * interacción del usuario sincroniza el store global, garantizando que la
 * elección persista al volver a la home.
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';

import { MapPage } from '../MapPage';
import { useMapLayerStore } from '@/state/mapLayer';

describe('MapPage', () => {
  beforeEach(() => {
    useMapLayerStore.getState().resetActiveLayer();
    /* eslint-disable-next-line no-undef -- localStorage es global del navegador. */
    localStorage.clear();
  });

  it('renderiza el panel lateral con el switcher reactivo', () => {
    render(<MapPage />);
    expect(screen.getByRole('radiogroup', { name: /capa activa/i })).toBeInTheDocument();
    // El catálogo se materializa como radios (al menos 8).
    expect(screen.getAllByRole('radio').length).toBeGreaterThanOrEqual(8);
  });

  it('al cambiar de capa actualiza el store y la leyenda', async () => {
    const user = userEvent.setup();
    render(<MapPage />);
    await user.click(screen.getByRole('radio', { name: /banda ancha/i }));
    expect(useMapLayerStore.getState().activeLayerId).toBe('broadband');
    expect(screen.getByTestId('map-legend-label').textContent).toMatch(/banda ancha/i);
  });
});
