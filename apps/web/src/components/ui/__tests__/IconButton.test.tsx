import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { IconButton } from '../IconButton';

describe('IconButton', () => {
  it('usa label como aria-label', () => {
    render(<IconButton label="Notificaciones" icon={<span data-testid="icon" />} />);
    const button = screen.getByRole('button', { name: 'Notificaciones' });
    expect(button).toBeInTheDocument();
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
