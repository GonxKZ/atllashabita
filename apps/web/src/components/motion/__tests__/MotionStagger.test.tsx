import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MotionStagger } from '../MotionStagger';

describe('MotionStagger', () => {
  it('renderiza todos los hijos y marca data-motion="stagger"', () => {
    render(
      <MotionStagger as="ul" aria-label="lista">
        <li>Uno</li>
        <li>Dos</li>
        <li>Tres</li>
      </MotionStagger>
    );

    const wrapper = screen.getByLabelText('lista');
    expect(wrapper).toHaveAttribute('data-motion', 'stagger');
    expect(wrapper.tagName.toLowerCase()).toBe('ul');
    const items = within(wrapper).getAllByRole('listitem');
    expect(items).toHaveLength(3);
    expect(items.map((item) => item.textContent)).toEqual(['Uno', 'Dos', 'Tres']);
  });

  it('respeta la prop disabled sin eliminar contenido', () => {
    render(
      <MotionStagger aria-label="group" disabled>
        <span>Primero</span>
        <span>Segundo</span>
      </MotionStagger>
    );

    const wrapper = screen.getByLabelText('group');
    expect(wrapper).toHaveAttribute('data-motion', 'stagger');
    expect(wrapper.children).toHaveLength(2);
  });
});
