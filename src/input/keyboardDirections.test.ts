// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { mergeActiveDirections } from './directionalChrome';
import {
  activeDirectionsFromMovementKeys,
  attachKeyboardDirections,
  isInteractiveFocusedElement,
} from './keyboardDirections';

describe('mergeActiveDirections', () => {
  it('ORs per direction with chrome and keyboard samples', () => {
    const chromeOnly = { up: true, down: false, left: false, right: false };
    const keysOnly = { up: false, down: false, left: true, right: false };
    expect(mergeActiveDirections(chromeOnly, keysOnly)).toEqual({
      up: true,
      down: false,
      left: true,
      right: false,
    });
  });
});

describe('activeDirectionsFromMovementKeys', () => {
  it('maps WASD and arrows', () => {
    expect(activeDirectionsFromMovementKeys(new Set(['w']))).toEqual({
      up: true,
      down: false,
      left: false,
      right: false,
    });
    expect(activeDirectionsFromMovementKeys(new Set(['a', 'ArrowRight']))).toEqual({
      up: false,
      down: false,
      left: true,
      right: true,
    });
  });
});

describe('attachKeyboardDirections', () => {
  it('returns no directions when desktop predicate is false', () => {
    const kb = attachKeyboardDirections({ isKeyboardMoveEnabled: () => false });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
    expect(kb.getActiveDirections()).toEqual({
      up: false,
      down: false,
      left: false,
      right: false,
    });
    kb.detach();
  });

  it('tracks keys when predicate is true', () => {
    const kb = attachKeyboardDirections({ isKeyboardMoveEnabled: () => true });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
    expect(kb.getActiveDirections().up).toBe(true);
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w', bubbles: true }));
    expect(kb.getActiveDirections().up).toBe(false);
    kb.detach();
  });

  it('ignores keydown repeat for movement state', () => {
    const kb = attachKeyboardDirections({ isKeyboardMoveEnabled: () => true });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', repeat: true, bubbles: true }));
    expect(kb.getActiveDirections()).toEqual({
      up: false,
      down: false,
      left: false,
      right: false,
    });
    kb.detach();
  });

  it('does not apply movement when an interactive element is focused', () => {
    const kb = attachKeyboardDirections({ isKeyboardMoveEnabled: () => true });
    const btn = document.createElement('button');
    btn.textContent = 'Act';
    document.body.append(btn);
    btn.focus();
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
    expect(kb.getActiveDirections().up).toBe(false);
    btn.remove();
    kb.detach();
  });

  it('detach removes listeners and clears state', () => {
    const kb = attachKeyboardDirections({ isKeyboardMoveEnabled: () => true });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'd', bubbles: true }));
    expect(kb.getActiveDirections().right).toBe(true);
    kb.detach();
    window.dispatchEvent(new KeyboardEvent('keyup', { key: 'd', bubbles: true }));
    const kb2 = attachKeyboardDirections({ isKeyboardMoveEnabled: () => true });
    expect(kb2.getActiveDirections()).toEqual({
      up: false,
      down: false,
      left: false,
      right: false,
    });
    kb2.detach();
  });
});

describe('isInteractiveFocusedElement', () => {
  it('is true for role=button', () => {
    const el = document.createElement('div');
    el.setAttribute('role', 'button');
    expect(isInteractiveFocusedElement(el)).toBe(true);
  });

  it('is false for plain canvas wrapper', () => {
    const el = document.createElement('div');
    expect(isInteractiveFocusedElement(el)).toBe(false);
  });
});
