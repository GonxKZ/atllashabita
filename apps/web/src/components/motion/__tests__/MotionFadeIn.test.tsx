import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MotionFadeIn } from '../MotionFadeIn';

describe('MotionFadeIn', () => {
  it('renderiza los hijos y expone data-motion="fade-in"', () => {
    render(
      <MotionFadeIn aria-label="hero">
        <p>Hola AtlasHabita</p>
      </MotionFadeIn>
    );

    const wrapper = screen.getByLabelText('hero');
    expect(wrapper).toBeInTheDocument();
    expect(wrapper).toHaveAttribute('data-motion', 'fade-in');
    expect(screen.getByText('Hola AtlasHabita')).toBeInTheDocument();
  });

  it('permite renderizar con otro tag y conserva los hijos', () => {
    render(
      <MotionFadeIn as="section" aria-label="section" disabled>
        <span>contenido</span>
      </MotionFadeIn>
    );

    const wrapper = screen.getByLabelText('section');
    expect(wrapper.tagName.toLowerCase()).toBe('section');
    expect(wrapper).toHaveAttribute('data-motion', 'fade-in');
    expect(wrapper).toContainHTML('<span>contenido</span>');
  });
});
