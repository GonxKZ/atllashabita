/* eslint-disable no-undef -- localStorage es global del navegador. */
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider, useSearchParams } from 'react-router-dom';
import { RequireAuth } from '../RequireAuth';
import { useAuthStore } from '../../../state/auth';

function LoginStub() {
  const [params] = useSearchParams();
  return <div role="main">login::next={params.get('next') ?? ''}</div>;
}

function renderAt(initialPath: string) {
  const router = createMemoryRouter(
    [
      {
        path: '/cuenta',
        element: (
          <RequireAuth>
            <div role="main">contenido protegido</div>
          </RequireAuth>
        ),
      },
      { path: '/login', element: <LoginStub /> },
    ],
    { initialEntries: [initialPath] }
  );
  return render(<RouterProvider router={router} />);
}

describe('RequireAuth', () => {
  beforeEach(() => {
    useAuthStore.getState().reset();
    localStorage.clear();
  });

  it('redirige a /login con ?next cuando no hay usuario', () => {
    renderAt('/cuenta');
    expect(screen.getByText(/login::next=\/cuenta/)).toBeInTheDocument();
  });

  it('renderiza el contenido protegido cuando existe sesión', () => {
    useAuthStore.getState().signUp({
      email: 'guard@example.com',
      password: 'Aaaaaa1z',
      name: 'Guard',
    });
    renderAt('/cuenta');
    expect(screen.getByText(/contenido protegido/i)).toBeInTheDocument();
  });
});
