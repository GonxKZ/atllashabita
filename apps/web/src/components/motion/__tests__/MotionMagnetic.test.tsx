import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { MotionMagnetic } from '../MotionMagnetic';

describe('MotionMagnetic', () => {
  it('renderiza los hijos y expone data-motion="magnetic"', () => {
    render(
      <MotionMagnetic aria-label="cta">
        <button type="button">Explorar</button>
      </MotionMagnetic>
    );

    const wrapper = screen.getByLabelText('cta');
    expect(wrapper).toHaveAttribute('data-motion', 'magnetic');
    expect(screen.getByRole('button', { name: 'Explorar' })).toBeInTheDocument();
  });

  it('procesa pointermove y pointerleave sin romperse', () => {
    render(
      <MotionMagnetic as="section" aria-label="card">
        <span>contenido</span>
      </MotionMagnetic>
    );
    const wrapper = screen.getByLabelText('card');
    fireEvent.pointerMove(wrapper, { clientX: 5, clientY: 5 });
    fireEvent.pointerLeave(wrapper);
    fireEvent.blur(wrapper);
    expect(wrapper).toContainHTML('<span>contenido</span>');
  });

  it('respeta la prop disabled marcando data-magnetic-disabled', () => {
    render(
      <MotionMagnetic aria-label="off" disabled>
        <span>off</span>
      </MotionMagnetic>
    );
    expect(screen.getByLabelText('off')).toHaveAttribute('data-magnetic-disabled', 'true');
  });
});
