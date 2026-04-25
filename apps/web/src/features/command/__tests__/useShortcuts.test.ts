/* eslint-disable no-undef -- KeyboardEvent y document son globales del navegador y jsdom. */
import { describe, expect, it, vi } from 'vitest';
import { bindShortcuts, isPrimaryModifier, isTypingTarget } from '../useShortcuts';

function dispatchKey(init: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', { bubbles: true, ...init });
  document.dispatchEvent(event);
  return event;
}

describe('isPrimaryModifier', () => {
  it('reconoce tanto Cmd como Ctrl', () => {
    expect(isPrimaryModifier({ metaKey: true, ctrlKey: false })).toBe(true);
    expect(isPrimaryModifier({ metaKey: false, ctrlKey: true })).toBe(true);
    expect(isPrimaryModifier({ metaKey: false, ctrlKey: false })).toBe(false);
  });
});

describe('isTypingTarget', () => {
  it('detecta inputs y textareas', () => {
    const input = document.createElement('input');
    expect(isTypingTarget(input)).toBe(true);
    const div = document.createElement('div');
    expect(isTypingTarget(div)).toBe(false);
  });
});

describe('bindShortcuts', () => {
  it('dispara onTogglePalette con Ctrl+K', () => {
    const onTogglePalette = vi.fn();
    const cleanup = bindShortcuts({ onTogglePalette });
    dispatchKey({ key: 'k', ctrlKey: true });
    expect(onTogglePalette).toHaveBeenCalled();
    cleanup();
  });

  it('dispara onToggleSidebar con Ctrl+B', () => {
    const onToggleSidebar = vi.fn();
    const cleanup = bindShortcuts({ onToggleSidebar });
    dispatchKey({ key: 'b', metaKey: true });
    expect(onToggleSidebar).toHaveBeenCalled();
    cleanup();
  });

  it('dispara onSelectLayer con Ctrl+N', () => {
    const onSelectLayer = vi.fn();
    const cleanup = bindShortcuts({ onSelectLayer });
    dispatchKey({ key: '3', ctrlKey: true });
    expect(onSelectLayer).toHaveBeenCalledWith(3);
    cleanup();
  });

  it('ignora "/" cuando el foco está en un input', () => {
    const onFocusSearch = vi.fn();
    const cleanup = bindShortcuts({ onFocusSearch });
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    const event = new KeyboardEvent('keydown', { key: '/', bubbles: true });
    Object.defineProperty(event, 'target', { value: input });
    document.dispatchEvent(event);
    expect(onFocusSearch).not.toHaveBeenCalled();
    document.body.removeChild(input);
    cleanup();
  });

  it('escucha ? para mostrar atajos cuando no hay input activo', () => {
    const onShowShortcuts = vi.fn();
    const cleanup = bindShortcuts({ onShowShortcuts });
    dispatchKey({ key: '?' });
    expect(onShowShortcuts).toHaveBeenCalled();
    cleanup();
  });

  it('cleanup detiene los listeners', () => {
    const onTogglePalette = vi.fn();
    const cleanup = bindShortcuts({ onTogglePalette });
    cleanup();
    dispatchKey({ key: 'k', ctrlKey: true });
    expect(onTogglePalette).not.toHaveBeenCalled();
  });
});
