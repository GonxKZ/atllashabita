/* eslint-disable no-undef -- localStorage y Blob son globales DOM disponibles en navegador y jsdom. */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router-dom';
import { AccountPage } from '../AccountPage';
import { useAuthStore } from '../../../state/auth';

function renderAccount() {
  const router = createMemoryRouter(
    [
      { path: '/cuenta', element: <AccountPage /> },
      { path: '/', element: <div role="main">Inicio</div> },
    ],
    { initialEntries: ['/cuenta'] }
  );
  return render(<RouterProvider router={router} />);
}

describe('AccountPage', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    localStorage.clear();
    useAuthStore.getState().signUp({
      email: 'cuenta@example.com',
      password: 'Aaaaaa1z',
      name: 'Sam Cuenta',
    });
  });

  it('muestra los datos del usuario en sesión', () => {
    renderAccount();
    expect(screen.getByRole('heading', { name: /Mi cuenta/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/Nombre/, { selector: 'input' })).toHaveValue('Sam Cuenta');
    expect(screen.getByText('cuenta@example.com')).toBeInTheDocument();
  });

  it('actualiza el perfil al guardar cambios', async () => {
    const user = userEvent.setup();
    renderAccount();
    const nameInput = screen.getByLabelText(/Nombre/, { selector: 'input' });
    await user.clear(nameInput);
    await user.type(nameInput, 'Sam Refrescada');
    await user.selectOptions(screen.getByLabelText(/Tema/i), 'oscuro');
    await user.click(screen.getByRole('button', { name: /Guardar cambios/i }));
    expect(screen.getByRole('status')).toHaveTextContent(/Perfil actualizado/i);
    const stored = useAuthStore.getState().user;
    expect(stored?.name).toBe('Sam Refrescada');
    expect(stored?.preferences.theme).toBe('oscuro');
  });

  it('cierra sesión y redirige al inicio', async () => {
    const user = userEvent.setup();
    renderAccount();
    await user.click(screen.getByRole('button', { name: /Cerrar sesión/i }));
    await waitFor(() => expect(useAuthStore.getState().user).toBeNull());
  });

  it('exige confirmar antes de eliminar la cuenta', async () => {
    const user = userEvent.setup();
    renderAccount();
    await user.click(screen.getByRole('button', { name: /Eliminar mi cuenta/i }));
    expect(useAuthStore.getState().user?.email).toBe('cuenta@example.com');
    await user.click(screen.getByRole('button', { name: /Confirmar eliminación/i }));
    await waitFor(() => expect(useAuthStore.getState().user).toBeNull());
    await waitFor(() => expect(useAuthStore.getState().accounts).toHaveLength(0));
  });

  it('exporta los datos generando un blob de tipo application/json', async () => {
    const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:mock');
    const revokeObjectURL = vi.fn<(url: string) => void>();
    const originalCreate = URL.createObjectURL;
    const originalRevoke = URL.revokeObjectURL;
    const clickSpy = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    URL.createObjectURL = createObjectURL as typeof URL.createObjectURL;
    URL.revokeObjectURL = revokeObjectURL as typeof URL.revokeObjectURL;

    const user = userEvent.setup();
    renderAccount();
    await user.click(screen.getByRole('button', { name: /Exportar mis datos/i }));
    expect(createObjectURL).toHaveBeenCalledTimes(1);
    const firstCall = createObjectURL.mock.calls[0];
    expect(firstCall).toBeDefined();
    const blob = firstCall![0];
    expect(blob.type).toBe('application/json');

    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    clickSpy.mockRestore();
  });
});
