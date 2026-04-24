/* eslint-disable no-undef -- localStorage es global del navegador. */
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { LoginPage } from '../LoginPage';
import { useAuthStore } from '../../../state/auth';

function renderAt(initialPath: string) {
  const router = createMemoryRouter(
    [
      { path: '/login', element: <LoginPage /> },
      { path: '/', element: <div role="main">Inicio</div> },
      { path: '/cuenta', element: <div role="main">Cuenta</div> },
    ],
    { initialEntries: [initialPath] }
  );
  return render(<RouterProvider router={router} />);
}

describe('LoginPage', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    localStorage.clear();
  });

  it('renderiza formulario accesible con etiquetas explícitas', () => {
    renderAt('/login');
    expect(screen.getByRole('heading', { name: /Iniciar sesión/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Correo electrónico/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Contraseña/i)).toBeInTheDocument();
  });

  it('marca errores cuando los campos están vacíos', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));
    expect(screen.getByText(/Introduce tu correo/i)).toBeInTheDocument();
    expect(screen.getByText(/Introduce tu contraseña/i)).toBeInTheDocument();
  });

  it('muestra error si la cuenta no existe', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'nope@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'Aaaaaa1z');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));
    expect(screen.getByText(/No existe una cuenta/i)).toBeInTheDocument();
  });

  it('inicia sesión y redirige al destino indicado por ?next', async () => {
    useAuthStore.getState().signUp({
      email: 'ok@example.com',
      password: 'Aaaaaa1z',
      name: 'Persona OK',
    });
    useAuthStore.getState().signOut();

    const user = userEvent.setup();
    renderAt('/login?next=%2Fcuenta');
    await user.type(screen.getByLabelText(/Correo electrónico/i), 'ok@example.com');
    await user.type(screen.getByLabelText(/Contraseña/i), 'Aaaaaa1z');
    await user.click(screen.getByRole('button', { name: /Entrar/i }));
    expect(await screen.findByText('Cuenta')).toBeInTheDocument();
    expect(useAuthStore.getState().user?.email).toBe('ok@example.com');
  });
});
