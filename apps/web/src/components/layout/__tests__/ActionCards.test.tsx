import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Map as MapIcon, Sparkles } from 'lucide-react';
import { MemoryRouter } from 'react-router-dom';
import { ActionCards, type ActionCardItem } from '../ActionCards';

const ITEMS: ActionCardItem[] = [
  {
    id: 'explore',
    title: 'Explorar',
    description: 'Recorre el mapa y descubre municipios.',
    icon: <MapIcon size={18} />,
    accent: 'brand',
    href: '/mapa',
  },
  {
    id: 'recommend',
    title: 'Recomendar',
    description: 'Obtén sugerencias personalizadas.',
    icon: <Sparkles size={18} />,
    accent: 'emerald',
    href: '/ranking',
  },
];

describe('ActionCards', () => {
  it('renderiza una card por elemento provisto, con título y descripción', () => {
    render(
      <MemoryRouter>
        <ActionCards items={ITEMS} />
      </MemoryRouter>
    );

    for (const item of ITEMS) {
      expect(screen.getByRole('heading', { level: 3, name: item.title })).toBeInTheDocument();
      expect(screen.getByText(item.description)).toBeInTheDocument();
    }
  });

  it('usa enlaces accesibles cuando se proporciona href', () => {
    render(
      <MemoryRouter>
        <ActionCards items={ITEMS} />
      </MemoryRouter>
    );
    const link = screen.getByRole('link', { name: /Explorar/i });
    expect(link).toHaveAttribute('href', '/mapa');
  });
});
