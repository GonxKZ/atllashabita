import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  REDUCED_MOTION_QUERY,
  prefersReducedMotion,
  resolveDuration,
  resolveDurationWithFallback,
} from '../reducedMotion';

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

describe('reducedMotion helpers', () => {
  const originalMatchMedia = window.matchMedia;

  afterEach(() => {
    // Restaurar matchMedia para no contaminar otros tests.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    vi.restoreAllMocks();
  });

  it('expone la media query canónica', () => {
    expect(REDUCED_MOTION_QUERY).toBe('(prefers-reduced-motion: reduce)');
  });

  it('prefersReducedMotion devuelve false cuando matchMedia no marca reduce', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(false),
    });
    expect(prefersReducedMotion()).toBe(false);
  });

  it('prefersReducedMotion devuelve true cuando matchMedia marca reduce', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(true),
    });
    expect(prefersReducedMotion()).toBe(true);
  });

  it('resolveDuration devuelve la duración original cuando no hay reducción', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(false),
    });
    expect(resolveDuration(0.6)).toBe(0.6);
  });

  it('resolveDuration colapsa a 0 cuando se pide reducir movimiento', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(true),
    });
    expect(resolveDuration(0.6)).toBe(0);
  });

  it('resolveDurationWithFallback aplica el fallback solicitado', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(true),
    });
    expect(resolveDurationWithFallback(0.6, 0.05)).toBe(0.05);
  });

  it('resolveDurationWithFallback mantiene la duración base si no hay preferencia', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(false),
    });
    expect(resolveDurationWithFallback(0.6, 0.05)).toBe(0.6);
  });
});
