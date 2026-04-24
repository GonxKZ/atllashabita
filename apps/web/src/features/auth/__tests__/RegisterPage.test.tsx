/* eslint-disable no-undef -- localStorage es global del navegador. */
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { RegisterPage } from '../RegisterPage';
import { useAuthStore } from '../../../state/auth';

function renderAt(initialPath: string) {
  const router = createMemoryRouter(
    [
      { path: '/registro', element: <RegisterPage /> },
      { path: '/cuenta', element: <div role="main">Cuenta</div> },
      { path: '/', element: <div role="main">Inicio</div> },
    ],
    { initialEntries: [initialPath] }
  );
  return render(<RouterProvider router={router} />);
}

describe('RegisterPage', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    localStorage.clear();
  });

  it('valida nombre, correo, contraseña y confirmación', async () => {
    const user = userEvent.setup();
    renderAt('/registro');
    await user.click(screen.getByRole('button', { name: /Crear cuenta/i }));
    expect(screen.getByText(/El nombre debe tener al menos 2 caracteres/i)).toBeInTheDocument();
    expect(screen.getByText(/Introduce un correo/i)).toBeInTheDocument();
    expect(screen.getByText(/al menos 8 caracteres/i)).toBeInTheDocument();
  });

  it('detecta contraseñas que no coinciden', async () => {
    const user = userEvent.setup();
    renderAt('/registro');
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Probador');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'probador@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Aaaaaa1z');
    await user.type(screen.getByLabelText(/Confirmar contraseña/i), 'Bbbbbb2y');
    await user.click(screen.getByRole('button', { name: /Crear cuenta/i }));
    expect(screen.getByText(/contraseñas no coinciden/i)).toBeInTheDocument();
  });

  it('crea cuenta válida y redirige a /cuenta', async () => {
    const user = userEvent.setup();
    renderAt('/registro');
    await user.type(screen.getByLabelText(/Nombre completo/i), 'Lucía Plus');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'lucia@example.com');
    await user.type(screen.getByLabelText('Contraseña'), 'Aaaaaa1z');
    await user.type(screen.getByLabelText(/Confirmar contraseña/i), 'Aaaaaa1z');
    await user.click(screen.getByRole('button', { name: /Crear cuenta/i }));
    expect(await screen.findByText('Cuenta')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.email).toBe('lucia@example.com');
  });
});
