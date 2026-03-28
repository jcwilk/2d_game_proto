import type { Engine } from 'excalibur';
import { describe, expect, it, vi } from 'vitest';

import { pointerPhaseFromDomEventType, subscribePointerInput } from './pointer';

describe('pointerPhaseFromDomEventType', () => {
  it('maps pointer and legacy mouse/touch types to Excalibur phases', () => {
    expect(pointerPhaseFromDomEventType('pointerdown')).toBe('down');
    expect(pointerPhaseFromDomEventType('mousedown')).toBe('down');
    expect(pointerPhaseFromDomEventType('touchstart')).toBe('down');
    expect(pointerPhaseFromDomEventType('pointerup')).toBe('up');
    expect(pointerPhaseFromDomEventType('pointermove')).toBe('move');
    expect(pointerPhaseFromDomEventType('touchmove')).toBe('move');
    expect(pointerPhaseFromDomEventType('pointercancel')).toBe('cancel');
    expect(pointerPhaseFromDomEventType('touchcancel')).toBe('cancel');
  });

  it('returns null for unrelated types', () => {
    expect(pointerPhaseFromDomEventType('click')).toBeNull();
    expect(pointerPhaseFromDomEventType('')).toBeNull();
  });
});

describe('subscribePointerInput', () => {
  it('registers only provided handlers and closes subscriptions on unsubscribe', () => {
    const closeDown = vi.fn();
    const closeMove = vi.fn();
    const on = vi.fn((name: string, _handler: (e: unknown) => void) => {
      if (name === 'down') return { close: closeDown };
      if (name === 'move') return { close: closeMove };
      return { close: vi.fn() };
    });

    const engine = {
      input: {
        pointers: {
          events: { on },
        },
      },
    };

    const { unsubscribe } = subscribePointerInput(engine as unknown as Engine, {
      onDown: () => {},
      onMove: () => {},
    });

    expect(on).toHaveBeenCalledWith('down', expect.any(Function));
    expect(on).toHaveBeenCalledWith('move', expect.any(Function));
    expect(on).not.toHaveBeenCalledWith('up', expect.any(Function));

    unsubscribe();
    expect(closeDown).toHaveBeenCalledTimes(1);
    expect(closeMove).toHaveBeenCalledTimes(1);
  });
});
