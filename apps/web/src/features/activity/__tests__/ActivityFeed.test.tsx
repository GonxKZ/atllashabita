import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ActivityFeed } from '../ActivityFeed';
import { mockActivity } from '@/data/mock';

describe('ActivityFeed', () => {
  it('muestra la cantidad exacta de entradas provistas', () => {
    render(<ActivityFeed items={mockActivity} />);

    const list = screen.getByRole('list');
    expect(within(list).getAllByRole('listitem')).toHaveLength(mockActivity.length);
  });

  it('renderiza el primer título de actividad', () => {
    render(<ActivityFeed items={mockActivity} />);
    expect(screen.getByText(mockActivity[0].title)).toBeInTheDocument();
  });
});
