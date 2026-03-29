/**
 * Pointer-based input facade for Excalibur (normative: `.cursor/plans/project-implementation-deep-dive.md` §D.2).
 *
 * **Engine vs chrome (see `specs/viewport-square-dpad-chrome.md` §2):** Canvas-relative gameplay input uses
 * **this** module (`subscribePointerInput` → Excalibur’s pointer pipeline). **HTML d-pad / directional chrome**
 * outside the canvas uses a **separate** DOM path (`attachDirectionalChrome` in `directionalChrome.ts`) so hit
 * targets stay stable regardless of canvas scaling. Both are intentional; do not merge without revisiting the spec.
 *
 * **Lifecycle:** `subscribePointerInput` returns `{ unsubscribe }`. Call `unsubscribe()` when tearing down
 * the owning surface (e.g. engine stop, scene change) so handlers are removed. This module is the single place
 * that attaches to `engine.input.pointers.events`; gameplay should use this API instead of reaching into the
 * receiver directly.
 *
 * **Scroll / zoom (§D.2):** Excalibur’s `PointerEventReceiver` invokes `preventDefault()` on the native
 * pointer/touch pipeline (`_handle` in the engine build) so the page does not scroll or pinch-zoom instead of
 * delivering input to the game. Complement that with `touch-action: none` on the game layout root (`#game-root`
 * in `styles.css`, canvas + chrome). Wheel events use a separate path; the engine’s `pageScrollPreventionMode` controls whether
 * wheel `preventDefault` runs for canvas vs document—see Excalibur `Engine` options if you need to tune that.
 */
import type { Engine, PointerEvent, WheelEvent } from 'excalibur';

/** Subscription handle returned by Excalibur’s event emitter (`close()` removes the listener). */
interface EventSubscription {
  close(): void;
}

export interface PointerInputHandlers {
  onDown?: (event: PointerEvent) => void;
  onMove?: (event: PointerEvent) => void;
  onUp?: (event: PointerEvent) => void;
  /** Emitted when the browser cancels a pointer (e.g. touch interrupted). */
  onCancel?: (event: PointerEvent) => void;
  onWheel?: (event: WheelEvent) => void;
}

export interface PointerInputSubscription {
  unsubscribe(): void;
}

/**
 * Maps a DOM event `type` string to a coarse pointer phase. Pure helper for tests and for inspecting
 * `PointerEvent.nativeEvent.type` without scattering string literals.
 */
export function pointerPhaseFromDomEventType(domEventType: string): PointerEvent['type'] | null {
  switch (domEventType) {
    case 'pointerdown':
    case 'mousedown':
    case 'touchstart':
      return 'down';
    case 'pointerup':
    case 'mouseup':
    case 'touchend':
      return 'up';
    case 'pointermove':
    case 'mousemove':
    case 'touchmove':
      return 'move';
    case 'pointercancel':
    case 'touchcancel':
      return 'cancel';
    default:
      return null;
  }
}

export function subscribePointerInput(
  engine: Engine,
  handlers: PointerInputHandlers
): PointerInputSubscription {
  const events = engine.input.pointers.events;
  const subs: EventSubscription[] = [];

  if (handlers.onDown) subs.push(events.on('down', handlers.onDown));
  if (handlers.onMove) subs.push(events.on('move', handlers.onMove));
  if (handlers.onUp) subs.push(events.on('up', handlers.onUp));
  if (handlers.onCancel) {
    const onCancel = handlers.onCancel;
    subs.push(
      events.on('cancel', (e: unknown) => {
        onCancel(e as PointerEvent);
      })
    );
  }
  if (handlers.onWheel) subs.push(events.on('wheel', handlers.onWheel));

  return {
    unsubscribe() {
      for (const s of subs) s.close();
    },
  };
}
