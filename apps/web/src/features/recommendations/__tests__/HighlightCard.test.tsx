import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { HighlightCard } from '../HighlightCard';
import { mockHighlight } from '@/data/mock';

describe('HighlightCard', () => {
  it('incluye el botón "Ver análisis" y dispara el callback', async () => {
    const onOpen = vi.fn();
    render(<HighlightCard highlight={mockHighlight} onOpen={onOpen} />);

    const button = screen.getByRole('button', { name: /ver análisis/i });
    expect(button).toBeInTheDocument();

    await userEvent.click(button);
    expect(onOpen).toHaveBeenCalledWith(mockHighlight.id);
  });

  it('muestra los atributos destacados del territorio', () => {
    render(<HighlightCard highlight={mockHighlight} />);

    for (const attribute of mockHighlight.attributes) {
      expect(screen.getByText(new RegExp(attribute.value, 'i'))).toBeInTheDocument();
    }
  });
});
