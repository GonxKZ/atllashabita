import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('usa el nombre como aria-label', () => {
    render(<Avatar name="Alex Romero" />);
    expect(screen.getByRole('img', { name: 'Alex Romero' })).toBeInTheDocument();
  });

  it('muestra iniciales cuando no hay imagen', () => {
    render(<Avatar name="Ana Pérez" />);
    expect(screen.getByText('AP')).toBeInTheDocument();
  });

  it('renderiza la imagen cuando se proporciona src', () => {
    render(<Avatar name="Alex" src="/avatar.png" />);
    const img = screen.getByRole('img', { name: 'Alex' }).querySelector('img');
    expect(img).not.toBeNull();
    expect(img).toHaveAttribute('src', '/avatar.png');
  });
});
