/* eslint-disable no-undef -- localStorage es global del navegador. */
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import type { ReactNode } from 'react';
import { UserCard } from '../UserCard';
import { useAuthStore } from '../../../state/auth';

function renderInRouter(ui: ReactNode) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('UserCard', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    localStorage.clear();
  });

  it('muestra el saludo con el primer nombre del usuario explícito', () => {
    renderInRouter(<UserCard name="Alex Romero" subtitle="Cuenta personal" />);
    expect(screen.getByText('Hola, Alex')).toBeInTheDocument();
    expect(screen.getByText('Cuenta personal')).toBeInTheDocument();
  });

  it('expone el avatar con aria-label del nombre completo', () => {
    renderInRouter(<UserCard name="Ana Pérez" />);
    expect(screen.getByRole('img', { name: 'Ana Pérez' })).toBeInTheDocument();
  });

  it('muestra el enlace "Iniciar sesión" cuando no hay usuario en el store', () => {
    renderInRouter(<UserCard />);
    expect(screen.getByText('Hola, Invitado')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Iniciar sesión/i })).toHaveAttribute('href', '/login');
  });

  it('usa el usuario del store cuando no se pasa nombre explícito', () => {
    useAuthStore.getState().signUp({
      email: 'maria@example.com',
      password: 'Aaaaaa1z',
      name: 'María Castro',
    });
    renderInRouter(<UserCard />);
    expect(screen.getByText('Hola, María')).toBeInTheDocument();
  });

  it('cierra sesión al pulsar "Cerrar sesión"', async () => {
    useAuthStore.getState().signUp({
      email: 'lola@example.com',
      password: 'Aaaaaa1z',
      name: 'Lola Pérez',
    });
    const user = userEvent.setup();
    renderInRouter(<UserCard />);
    await user.click(screen.getByRole('button', { name: /Cerrar sesión/i }));
    expect(useAuthStore.getState().user).toBeNull();
  });
});
