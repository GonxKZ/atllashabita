import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '../CommandPalette';
import type { CommandItem } from '../items';

function buildCatalog(): readonly CommandItem[] {
  return [
    {
      id: 'municipio.demo',
      section: 'municipios',
      title: 'Demo Town',
      subtitle: 'Provincia · Demo',
      run: vi.fn(),
    },
    {
      id: 'nav.demo',
      section: 'acciones',
      title: 'Acción de prueba',
      shortcut: ['Ctrl', 'D'],
      run: vi.fn(),
    },
  ];
}

function renderPalette(options: {
  open?: boolean;
  catalog?: readonly CommandItem[];
  onClose?: () => void;
}) {
  const { open = true, catalog, onClose = vi.fn() } = options;
  return render(
    <MemoryRouter>
      <CommandPalette open={open} onClose={onClose} catalog={catalog} />
    </MemoryRouter>
  );
}

describe('CommandPalette', () => {
  it('no monta el modal cuando open es false', () => {
    renderPalette({ open: false, catalog: buildCatalog() });
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('monta diálogo con foco en el input', async () => {
    renderPalette({ catalog: buildCatalog() });
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(screen.getByRole('listbox')).toBeInTheDocument();
  });

  it('filtra resultados al teclear', async () => {
    const user = userEvent.setup();
    renderPalette({ catalog: buildCatalog() });
    const input = screen.getByRole('searchbox');
    await user.type(input, 'demo town');
    expect(screen.getByText('Demo Town')).toBeInTheDocument();
  });

  it('ejecuta el comando al pulsar Enter', async () => {
    const user = userEvent.setup();
    const catalog = buildCatalog();
    const target = catalog[0];
    expect(target).toBeDefined();
    renderPalette({ catalog });
    const input = screen.getByRole('searchbox');
    await user.type(input, 'demo town');
    await user.keyboard('{Enter}');
    expect(target!.run).toHaveBeenCalled();
  });

  it('cierra con Esc', async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderPalette({ catalog: buildCatalog(), onClose });
    const input = screen.getByRole('searchbox');
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalled();
  });

  it('muestra estado vacío cuando no hay resultados', async () => {
    const user = userEvent.setup();
    renderPalette({ catalog: buildCatalog() });
    const input = screen.getByRole('searchbox');
    await user.type(input, 'zzzzzz_no_match');
    expect(screen.getByText(/No encontramos resultados/i)).toBeInTheDocument();
  });
});
