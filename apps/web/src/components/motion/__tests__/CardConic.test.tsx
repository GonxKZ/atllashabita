import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { CardConic } from '../CardConic';

describe('CardConic', () => {
  it('renderiza el wrapper con la capa decorativa aria-hidden', () => {
    render(
      <CardConic aria-label="card-conic">
        <span>contenido</span>
      </CardConic>
    );
    const wrapper = screen.getByLabelText('card-conic');
    expect(wrapper).toHaveAttribute('data-motion', 'card-conic');
    const overlay = screen.getByTestId('card-conic-overlay');
    expect(overlay).toHaveAttribute('aria-hidden', 'true');
  });

  it('inicializa el gradiente con la variable CSS de ángulo', () => {
    render(
      <CardConic aria-label="conic">
        <span>x</span>
      </CardConic>
    );
    const overlay = screen.getByTestId('card-conic-overlay');
    expect(overlay.style.getPropertyValue('--card-conic-angle')).toBe('0deg');
    expect(overlay.style.background).toContain('conic-gradient');
  });

  it('reacciona a hover/focus sin alterar el contenido renderizado', () => {
    render(
      <CardConic aria-label="hoverable">
        <button type="button">CTA</button>
      </CardConic>
    );
    const wrapper = screen.getByLabelText('hoverable');
    fireEvent.pointerEnter(wrapper);
    fireEvent.focus(wrapper);
    fireEvent.pointerLeave(wrapper);
    fireEvent.blur(wrapper);
    expect(screen.getByRole('button', { name: 'CTA' })).toBeInTheDocument();
  });

  it('expone data-conic-disabled cuando se desactiva el efecto', () => {
    render(
      <CardConic aria-label="locked" disabled>
        <span>locked</span>
      </CardConic>
    );
    expect(screen.getByLabelText('locked')).toHaveAttribute('data-conic-disabled', 'true');
  });
});
