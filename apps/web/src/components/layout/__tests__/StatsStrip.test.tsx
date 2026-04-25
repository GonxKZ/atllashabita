import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DEFAULT_STATS_STRIP_ITEMS, StatsStrip } from '../StatsStrip';

describe('StatsStrip', () => {
  it('renderiza una región accesible con los KPIs proporcionados', () => {
    render(<StatsStrip items={DEFAULT_STATS_STRIP_ITEMS} />);
    const region = screen.getByRole('region', { name: /Indicadores destacados/i });
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute('data-testid', 'stats-strip');
  });

  it('expone cada KPI como artículo con label legible', () => {
    render(<StatsStrip items={DEFAULT_STATS_STRIP_ITEMS} />);
    expect(screen.getByLabelText(/Municipios analizados:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Oportunidad agregada:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Asequibilidad media:/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Fuentes federadas:/i)).toBeInTheDocument();
  });

  it('muestra los headings y eyebrows de cada KPI', () => {
    render(<StatsStrip items={DEFAULT_STATS_STRIP_ITEMS} />);
    expect(
      screen.getByRole('heading', { name: /Municipios analizados/i, level: 3 })
    ).toBeInTheDocument();
    expect(screen.getByText(/Cobertura/i)).toBeInTheDocument();
  });

  it('respeta un ariaLabel personalizado', () => {
    render(<StatsStrip items={DEFAULT_STATS_STRIP_ITEMS} ariaLabel="KPIs de cabecera" />);
    expect(screen.getByRole('region', { name: 'KPIs de cabecera' })).toBeInTheDocument();
  });

  it('admite renderValue personalizado para inyectar el NumberCountup real', () => {
    render(
      <StatsStrip
        items={[
          {
            id: 'custom',
            eyebrow: 'Demo',
            label: 'Métrica personalizada',
            value: 42,
            renderValue: (value) => <span data-testid="custom-value">{Math.round(value)}</span>,
          },
        ]}
      />
    );
    expect(screen.getByTestId('custom-value')).toBeInTheDocument();
  });
});
