import { afterEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import {
  MAPLIBRE_MARKER_SELECTOR,
  MarkerRevealRadial,
  createIdleMapPan,
  performMarkerReveal,
  tweenMarkerColors,
} from '../MarkerRevealRadial';

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
  vi.useRealTimers();
});

describe('MarkerRevealRadial', () => {
  it('renderiza el subárbol y aplica data-motion="marker-reveal-radial"', () => {
    render(
      <MarkerRevealRadial aria-label="reveal">
        <button type="button" className="maplibregl-marker">
          A
        </button>
        <button type="button" className="maplibregl-marker">
          B
        </button>
      </MarkerRevealRadial>
    );
    const wrapper = screen.getByLabelText('reveal');
    expect(wrapper).toHaveAttribute('data-motion', 'marker-reveal-radial');
    expect(wrapper.querySelectorAll(MAPLIBRE_MARKER_SELECTOR)).toHaveLength(2);
  });

  it('performMarkerReveal devuelve null cuando no hay markers', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(false),
    });
    const empty = document.createElement('div');
    expect(performMarkerReveal({ scope: empty })).toBeNull();
  });

  it('performMarkerReveal acepta overrides cuando hay markers', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(false),
    });
    const root = document.createElement('div');
    document.body.appendChild(root);
    const m1 = document.createElement('div');
    m1.className = 'maplibregl-marker';
    const m2 = document.createElement('div');
    m2.className = 'maplibregl-marker';
    root.append(m1, m2);
    const tween = performMarkerReveal({ scope: root, overrides: { delay: 0.1 } });
    expect(tween).not.toBeNull();
    document.body.removeChild(root);
  });

  it('tweenMarkerColors devuelve null cuando no hay nodos con data-bubble-color', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(false),
    });
    const root = document.createElement('div');
    expect(tweenMarkerColors(root)).toBeNull();
  });
});

describe('createIdleMapPan', () => {
  it('llama a easeTo con las coordenadas del hot municipio', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(false),
    });
    const easeTo = vi.fn();
    const map = { easeTo };
    const ctrl = createIdleMapPan({
      map,
      getHotPoint: () => ({ id: 'm1', lat: 40, lon: -3, score: 80 }),
      intervalMs: 1000,
      easeDurationS: 1,
    });
    ctrl.panNow();
    expect(easeTo).toHaveBeenCalledTimes(1);
    expect(easeTo.mock.calls[0][0]).toMatchObject({
      center: [-3, 40],
      duration: 1000,
    });
    ctrl.destroy();
  });

  it('respeta prefers-reduced-motion: no programa intervalos ni paneos', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(true),
    });
    const easeTo = vi.fn();
    const ctrl = createIdleMapPan({
      map: { easeTo },
      getHotPoint: () => ({ id: 'm1', lat: 40, lon: -3, score: 80 }),
      intervalMs: 1000,
      easeDurationS: 1,
    });
    ctrl.panNow();
    expect(easeTo).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('panNow no falla cuando no hay hot point disponible', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(false),
    });
    const easeTo = vi.fn();
    const ctrl = createIdleMapPan({
      map: { easeTo },
      getHotPoint: () => null,
      intervalMs: 1000,
    });
    ctrl.panNow();
    expect(easeTo).not.toHaveBeenCalled();
    ctrl.destroy();
  });

  it('dispara easeTo en cada tick del scheduler inyectado', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: mockMatchMedia(false),
    });
    const easeTo = vi.fn();
    const handlerHolder: { fn: (() => void) | null } = { fn: null };
    const setIntervalMock = vi.fn().mockImplementation((handler: () => void) => {
      handlerHolder.fn = handler;
      return 42;
    });
    const clearIntervalMock = vi.fn();
    const ctrl = createIdleMapPan({
      map: { easeTo },
      getHotPoint: () => ({ id: 'a', lat: 40, lon: -3, score: 50 }),
      intervalMs: 100,
      scheduler: {
        setInterval: setIntervalMock as unknown as typeof globalThis.setInterval,
        clearInterval: clearIntervalMock as unknown as typeof globalThis.clearInterval,
      },
    });
    expect(setIntervalMock).toHaveBeenCalledTimes(1);
    handlerHolder.fn?.();
    expect(easeTo).toHaveBeenCalledTimes(1);
    ctrl.destroy();
    expect(clearIntervalMock).toHaveBeenCalledWith(42);
  });
});
