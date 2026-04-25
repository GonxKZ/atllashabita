import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { usePrefersReducedMotion } from '../usePrefersReducedMotion';

type MediaQueryListEvent = globalThis.MediaQueryListEvent;

interface ListenerSet {
  fire: (matches: boolean) => void;
  removed: boolean;
}

interface MockMediaQuery {
  matches: boolean;
  media: string;
  addEventListener?: (type: string, listener: (event: MediaQueryListEvent) => void) => void;
  removeEventListener?: (type: string, listener: (event: MediaQueryListEvent) => void) => void;
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  dispatchEvent: () => boolean;
  onchange: null;
  __set: ListenerSet;
}

function createMockMediaQuery(initial: boolean, supportsModern: boolean): MockMediaQuery {
  const set: ListenerSet = {
    fire: () => undefined,
    removed: false,
  };

  const mq = {
    matches: initial,
    media: '(prefers-reduced-motion: reduce)',
    dispatchEvent: () => true,
    onchange: null,
    __set: set,
  } as MockMediaQuery;

  if (supportsModern) {
    mq.addEventListener = (_type, listener) => {
      set.fire = (matches: boolean) => {
        mq.matches = matches;
        listener({ matches, media: mq.media } as unknown as MediaQueryListEvent);
      };
    };
    mq.removeEventListener = () => {
      set.removed = true;
    };
  } else {
    // Forzamos a que `addEventListener` sea undefined para reproducir
    // navegadores antiguos donde sólo existe `addListener`.
    (mq as unknown as { addEventListener: undefined }).addEventListener = undefined;
    (mq as unknown as { removeEventListener: undefined }).removeEventListener = undefined;
    mq.addListener = (listener) => {
      set.fire = (matches: boolean) => {
        mq.matches = matches;
        listener({ matches, media: mq.media } as unknown as MediaQueryListEvent);
      };
    };
    mq.removeListener = () => {
      set.removed = true;
    };
  }
  return mq;
}

const ORIGINAL_MATCH_MEDIA = window.matchMedia;

afterEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: ORIGINAL_MATCH_MEDIA,
  });
  vi.restoreAllMocks();
});

describe('usePrefersReducedMotion', () => {
  it('devuelve el valor inicial expuesto por matchMedia', () => {
    const mq = createMockMediaQuery(true, true);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => mq,
    });

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(true);
  });

  it('reacciona al cambio en caliente usando addEventListener', () => {
    const mq = createMockMediaQuery(false, true);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => mq,
    });

    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      mq.__set.fire(true);
    });
    expect(result.current).toBe(true);
  });

  it('compatibiliza con APIs antiguas (addListener) y limpia al desmontar', () => {
    const mq = createMockMediaQuery(false, false);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: () => mq,
    });

    const { result, unmount } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);

    act(() => {
      mq.__set.fire(true);
    });
    expect(result.current).toBe(true);

    unmount();
    expect(mq.__set.removed).toBe(true);
  });

  it('devuelve false cuando matchMedia no está disponible', () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: undefined,
    });
    const { result } = renderHook(() => usePrefersReducedMotion());
    expect(result.current).toBe(false);
  });
});
