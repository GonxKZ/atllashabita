import { afterEach, describe, expect, it } from 'vitest';

import {
  CARD_CONIC_ROTATION_S,
  DURATIONS,
  EASINGS,
  MAGNETIC_RADIUS_PX,
  MAGNETIC_STRENGTH,
  MAP_IDLE_INTERVAL_S,
  STAGGERS,
  buildMarkerRevealVars,
  motionPresets,
  resolveAtelierDuration,
  resolveAtelierDurationOrSkip,
  resolveConicDuration,
} from '../atelier';

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

function setReducedMotion(value: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: mockMatchMedia(value),
  });
}

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: ORIGINAL_MATCH_MEDIA,
  });
});

describe('atelier motion tokens', () => {
  it('expone duraciones canónicas alineadas con el spec', () => {
    expect(DURATIONS.instant).toBe(0.12);
    expect(DURATIONS.base).toBe(0.32);
    expect(DURATIONS.lush).toBe(0.55);
    expect(DURATIONS.hero).toBe(0.9);
  });

  it('expone curvas Bézier nombradas', () => {
    expect(EASINGS.enter).toBe('cubic-bezier(0.22, 0.84, 0.34, 1)');
    expect(EASINGS.exit).toBe('cubic-bezier(0.55, 0.03, 0.71, 0.32)');
    expect(EASINGS.smooth).toBe('cubic-bezier(0.36, 0.66, 0.04, 1)');
  });

  it('define staggers tight/normal/lush', () => {
    expect(STAGGERS).toEqual({ tight: 0.04, normal: 0.07, lush: 0.12 });
  });

  it('exporta constantes auxiliares para microinteracciones', () => {
    expect(MAGNETIC_RADIUS_PX).toBe(24);
    expect(MAGNETIC_STRENGTH).toBeGreaterThan(0);
    expect(MAGNETIC_STRENGTH).toBeLessThanOrEqual(1);
    expect(MAP_IDLE_INTERVAL_S).toBe(30);
    expect(CARD_CONIC_ROTATION_S).toBe(8);
  });

  it('motionPresets.markerRevealRadial respeta los valores GSAP esperados', () => {
    expect(motionPresets.markerRevealRadial).toMatchObject({
      scale: 0,
      opacity: 0,
      duration: DURATIONS.lush,
      ease: EASINGS.enter,
      transformOrigin: '50% 50%',
    });
    const stagger = motionPresets.markerRevealRadial.stagger as { from: string; amount: number };
    expect(stagger.from).toBe('center');
    expect(stagger.amount).toBeCloseTo(0.6, 5);
  });
});

describe('resolveAtelierDuration helpers', () => {
  it('devuelve la duración exacta cuando no hay prefers-reduced-motion', () => {
    setReducedMotion(false);
    expect(resolveAtelierDuration('base')).toBe(DURATIONS.base);
    expect(resolveAtelierDurationOrSkip('lush')).toBe(DURATIONS.lush);
    expect(resolveConicDuration()).toBe(CARD_CONIC_ROTATION_S);
  });

  it('colapsa a instant (o 0) cuando se solicita movimiento reducido', () => {
    setReducedMotion(true);
    expect(resolveAtelierDuration('hero')).toBe(DURATIONS.instant);
    expect(resolveAtelierDurationOrSkip('hero')).toBe(0);
    expect(resolveConicDuration()).toBe(0);
  });
});

describe('buildMarkerRevealVars', () => {
  it('replica los presets y aplica resolveAtelierDurationOrSkip', () => {
    setReducedMotion(false);
    const vars = buildMarkerRevealVars();
    expect(vars.duration).toBe(DURATIONS.lush);
    expect(vars.ease).toBe(EASINGS.enter);

    setReducedMotion(true);
    const reducedVars = buildMarkerRevealVars();
    expect(reducedVars.duration).toBe(0);
  });
});
