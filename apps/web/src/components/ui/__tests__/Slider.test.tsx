import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Slider } from '../Slider';

describe('Slider', () => {
  it('renderiza la etiqueta y el valor formateado', () => {
    render(<Slider label="Precio máximo" value={700} unit=" €" onValueChange={() => undefined} />);
    expect(screen.getByLabelText('Precio máximo')).toBeInTheDocument();
    expect(screen.getByText('700 €')).toBeInTheDocument();
  });

  it('avisa cuando el usuario mueve el slider', () => {
    const handle = vi.fn();
    render(<Slider label="Conectividad" value={90} min={0} max={100} onValueChange={handle} />);
    const input = screen.getByLabelText('Conectividad');
    fireEvent.change(input, { target: { value: '92' } });
    expect(handle).toHaveBeenCalledWith(92);
  });

  it('permite formatear el valor con una función personalizada', () => {
    render(
      <Slider
        label="Cobertura"
        value={0.95}
        min={0}
        max={1}
        step={0.01}
        onValueChange={() => undefined}
        format={(value) => `${Math.round(value * 100)}%`}
      />
    );
    expect(screen.getByText('95%')).toBeInTheDocument();
  });
});
