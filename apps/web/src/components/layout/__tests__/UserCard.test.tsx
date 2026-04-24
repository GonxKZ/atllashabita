import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserCard } from '../UserCard';

describe('UserCard', () => {
  it('muestra el saludo con el primer nombre del usuario', () => {
    render(<UserCard name="Alex Romero" subtitle="Cuenta personal" />);
    expect(screen.getByText('Hola, Alex')).toBeInTheDocument();
    expect(screen.getByText('Cuenta personal')).toBeInTheDocument();
  });

  it('expone el avatar con aria-label del nombre completo', () => {
    render(<UserCard name="Ana Pérez" />);
    expect(screen.getByRole('img', { name: 'Ana Pérez' })).toBeInTheDocument();
  });
});
