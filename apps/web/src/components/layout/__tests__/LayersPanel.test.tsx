import { describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LayersPanel, type LayerOption } from '../LayersPanel';

const LAYERS: LayerOption[] = [
  { id: 'housing', label: 'Vivienda asequible', checked: true },
  { id: 'jobs', label: 'Empleo', checked: false },
  { id: 'connectivity', label: 'Conectividad', checked: false, disabled: true },
];

describe('LayersPanel', () => {
  it('expone una región con el título proporcionado', () => {
    render(<LayersPanel layers={LAYERS} title="Capas activas" />);
    expect(screen.getByRole('region', { name: /Capas activas/i })).toBeInTheDocument();
  });

  it('renderiza un checkbox por capa con su estado correcto', () => {
    render(<LayersPanel layers={LAYERS} />);
    const region = screen.getByRole('region');
    const checkboxes = within(region).getAllByRole('checkbox');
    expect(checkboxes).toHaveLength(LAYERS.length);

    expect(within(region).getByRole('checkbox', { name: /Vivienda asequible/i })).toBeChecked();
    expect(within(region).getByRole('checkbox', { name: /Empleo/i })).not.toBeChecked();
  });

  it('respeta capas deshabilitadas y no dispara onChange en ellas', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LayersPanel layers={LAYERS} onChange={onChange} />);
    const disabled = screen.getByRole('checkbox', { name: /Conectividad/i });
    expect(disabled).toBeDisabled();

    await user.click(disabled);
    expect(onChange).not.toHaveBeenCalled();
  });

  it('emite onChange con el id y nuevo estado al pulsar un checkbox', async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<LayersPanel layers={LAYERS} onChange={onChange} />);

    await user.click(screen.getByRole('checkbox', { name: /Empleo/i }));
    expect(onChange).toHaveBeenCalledWith('jobs', true);
  });
});
