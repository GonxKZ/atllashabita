import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MotionScale } from '../MotionScale';

describe('MotionScale', () => {
  it('renderiza los hijos y expone data-motion="scale"', () => {
    render(
      <MotionScale aria-label="card">
        <button type="button">Pulsa aquí</button>
      </MotionScale>
    );

    const wrapper = screen.getByLabelText('card');
    expect(wrapper).toHaveAttribute('data-motion', 'scale');
    expect(screen.getByRole('button', { name: 'Pulsa aquí' })).toBeInTheDocument();
  });

  it('gestiona eventos hover/focus sin romper el render', () => {
    render(
      <MotionScale as="section" aria-label="scale-section">
        <span>inner</span>
      </MotionScale>
    );

    const wrapper = screen.getByLabelText('scale-section');
    // Comprobamos que los handlers no explotan aunque GSAP no pueda
    // interpolar nada real en JSDOM.
    fireEvent.pointerEnter(wrapper);
    fireEvent.pointerLeave(wrapper);
    fireEvent.focus(wrapper);
    fireEvent.blur(wrapper);

    expect(wrapper).toContainHTML('<span>inner</span>');
  });

  it('acepta la prop popOnMount sin bloquear el render', () => {
    render(
      <MotionScale aria-label="pop" popOnMount>
        <span>pop</span>
      </MotionScale>
    );

    expect(screen.getByLabelText('pop')).toHaveAttribute('data-motion', 'scale');
  });
});
