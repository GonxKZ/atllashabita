import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination, buildPageRange } from '../Pagination';

describe('buildPageRange', () => {
  it('devuelve todas las páginas cuando entran en la ventana visible', () => {
    expect(buildPageRange(3, 5, 3)).toEqual([1, 2, 3, 4, 5]);
  });

  it('incluye elipsis cuando el total supera la ventana', () => {
    const range = buildPageRange(8, 20, 3);
    expect(range[0]).toBe(1);
    expect(range[range.length - 1]).toBe(20);
    expect(range).toContain('dots');
  });
});

describe('Pagination', () => {
  it('no renderiza nada si sólo hay una página', () => {
    const { container } = render(
      <Pagination page={1} totalPages={1} onPageChange={() => undefined} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('dispara onPageChange al navegar hacia la página siguiente', async () => {
    const user = userEvent.setup();
    const handle = vi.fn();
    render(<Pagination page={2} totalPages={5} onPageChange={handle} />);

    await user.click(screen.getByRole('button', { name: 'Página siguiente' }));
    expect(handle).toHaveBeenCalledWith(3);
  });

  it('marca la página activa con aria-current', () => {
    render(<Pagination page={3} totalPages={5} onPageChange={() => undefined} />);
    const activeButton = screen.getByRole('button', { name: '3' });
    expect(activeButton).toHaveAttribute('aria-current', 'page');
  });
});
