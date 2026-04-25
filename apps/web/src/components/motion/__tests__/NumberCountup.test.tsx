import { afterEach, describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { NumberCountup } from '../NumberCountup';

type MatchMediaStub = typeof window.matchMedia;

function mockMatchMedia(matches: boolean): MatchMediaStub {
  return ((query: string) => ({
    matches,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
    dispatchEvent: () => false,
    onchange: null,
  })) as unknown as MatchMediaStub;
}

const ORIGINAL_MATCH_MEDIA = window.matchMedia;

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: ORIGINAL_MATCH_MEDIA,
  });
});

describe('NumberCountup', () => {
  it('formatea con Intl.NumberFormat es-ES por defecto y expone aria-label', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(true),
    });
    render(<NumberCountup value={1234567} suffix=" hab." aria-label="poblacion total" />);
    const wrapper = screen.getByLabelText('poblacion total');
    expect(wrapper).toHaveAttribute('data-motion', 'number-countup');
    expect(wrapper).toHaveAttribute('data-target-value', '1234567');
    expect(wrapper.textContent).toContain('1.234.567');
    expect(wrapper.textContent).toContain('hab.');
  });

  it('aplica prefijo y respeta opciones de formato decimal', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(true),
    });
    render(
      <NumberCountup
        value={42.5}
        prefix="+"
        aria-label="positivo"
        formatOptions={{ minimumFractionDigits: 1, maximumFractionDigits: 1 }}
      />
    );
    const wrapper = screen.getByLabelText('positivo');
    expect(wrapper.textContent).toContain('+');
    expect(wrapper.textContent).toContain('42,5');
  });

  it('genera un aria-label de fallback con prefijo y sufijo', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(true),
    });
    render(<NumberCountup value={50} prefix="+" suffix="%" />);
    const wrapper = screen.getByLabelText('+50%');
    expect(wrapper).toBeInTheDocument();
  });
});
