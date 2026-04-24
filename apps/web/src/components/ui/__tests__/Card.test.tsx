import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card, CardHeader } from '../Card';

describe('Card', () => {
  it('renderiza children en un contenedor con esquinas redondeadas', () => {
    render(
      <Card data-testid="card">
        <p>Contenido</p>
      </Card>
    );
    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
    expect(card.className).toMatch(/rounded-3xl/);
    expect(screen.getByText('Contenido')).toBeInTheDocument();
  });

  it('CardHeader muestra título y subtítulo semánticos', () => {
    render(
      <Card>
        <CardHeader title="Tendencias" subtitle="Últimos 12 meses" />
      </Card>
    );
    expect(screen.getByRole('heading', { level: 3, name: 'Tendencias' })).toBeInTheDocument();
    expect(screen.getByText('Últimos 12 meses')).toBeInTheDocument();
  });
});
