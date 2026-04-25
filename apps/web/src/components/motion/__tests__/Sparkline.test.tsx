import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { Sparkline } from '../Sparkline';

describe('Sparkline', () => {
  it('renderiza un SVG accesible con role="img"', () => {
    render(<Sparkline values={[1, 4, 2, 6, 5]} ariaLabel="Tendencia mensual" />);
    const svg = screen.getByRole('img', { name: 'Tendencia mensual' });
    expect(svg.tagName.toLowerCase()).toBe('svg');
    expect(svg).toHaveAttribute('data-motion', 'sparkline');
  });

  it('genera un path para series con varios puntos', () => {
    const { container } = render(<Sparkline values={[1, 2, 3, 4]} />);
    const path = container.querySelector('path');
    expect(path).not.toBeNull();
    const d = path?.getAttribute('d') ?? '';
    expect(d.startsWith('M')).toBe(true);
    // Esperamos tantos comandos M/L como puntos en la serie.
    expect(d.match(/[ML]/g)).toHaveLength(4);
  });

  it('maneja series planas sin lanzar errores', () => {
    const { container } = render(<Sparkline values={[5, 5, 5]} />);
    const path = container.querySelector('path');
    expect(path).not.toBeNull();
    const d = path?.getAttribute('d') ?? '';
    expect(d.includes('NaN')).toBe(false);
  });

  it('dibuja un área cuando se proporciona un fill diferente de transparent', () => {
    const { container } = render(<Sparkline values={[1, 2, 3]} fill="#bada55" fillOpacity={0.4} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
    expect(paths[0].getAttribute('fill')).toBe('#bada55');
    expect(paths[0].getAttribute('fill-opacity')).toBe('0.4');
  });

  it('etiqueta automáticamente la serie cuando no se pasa ariaLabel', () => {
    render(<Sparkline values={[10, 20, 30]} />);
    expect(screen.getByRole('img', { name: 'Tendencia (3 valores)' })).toBeInTheDocument();
  });
});
