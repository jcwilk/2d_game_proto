/**
 * DOM-native WASD / arrow movement on `window`, merged with d-pad state via
 * {@link mergeActiveDirections} + {@link chromeMoveVelocityFromActiveDirections} in `main.ts`.
 * Keyboard does **not** use tap-latch (chrome-only); repeat keydown is ignored for movement.
 */
import type { ActiveDirectionFlags } from './directionalChrome';

/**
 * Default: enable keyboard movement when the UA reports a fine pointer (typical mouse / trackpad).
 * Hybrid laptop/tablet + mouse may still report `fine` while a mouse is connected — inject a custom
 * predicate if you need stricter touch-only gating.
 */
export function defaultIsKeyboardMoveEnabled(): boolean {
  if (typeof globalThis.matchMedia !== 'function') return false;
  return globalThis.matchMedia('(pointer: fine)').matches;
}

/** Map held movement keys to direction flags (no opposite-axis cancellation here — velocity fn does that). */
export function activeDirectionsFromMovementKeys(pressed: ReadonlySet<string>): ActiveDirectionFlags {
  const has = (ch: string) => pressed.has(ch);
  return {
    up: has('w') || has('ArrowUp'),
    down: has('s') || has('ArrowDown'),
    left: has('a') || has('ArrowLeft'),
    right: has('d') || has('ArrowRight'),
  };
}

const MOVEMENT_KEYS = new Set([
  'w',
  'a',
  's',
  'd',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

function normalizeMovementKey(key: string): string | null {
  if (key.length === 1) {
    const lower = key.toLowerCase();
    if (lower === 'w' || lower === 'a' || lower === 's' || lower === 'd') return lower;
    return null;
  }
  if (
    key === 'ArrowUp' ||
    key === 'ArrowDown' ||
    key === 'ArrowLeft' ||
    key === 'ArrowRight'
  ) {
    return key;
  }
  return null;
}

/**
 * When focus is on a typical interactive control, do not treat WASD/arrows as game movement
 * (e.g. typing or activating merchant UI).
 */
export function isInteractiveFocusedElement(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || tag === 'BUTTON') return true;
  if (tag === 'A' && el instanceof HTMLAnchorElement && el.href) return true;
  const role = el.getAttribute('role');
  if (role === 'button' || role === 'menuitem' || role === 'option' || role === 'tab') return true;
  if (el.tabIndex >= 0) return true;
  return false;
}

export interface KeyboardDirectionsHandle {
  getActiveDirections(): ActiveDirectionFlags;
  detach(): void;
}

export interface KeyboardDirectionsAttachOptions {
  isKeyboardMoveEnabled?: () => boolean;
  /** @default internal default using `(pointer: fine)` */
  targetWindow?: Window;
  /** @default `targetWindow.document` — used for `activeElement` gating */
  ownerDocument?: Document;
}

export function attachKeyboardDirections(
  options: KeyboardDirectionsAttachOptions = {}
): KeyboardDirectionsHandle {
  const isKeyboardMoveEnabled = options.isKeyboardMoveEnabled ?? defaultIsKeyboardMoveEnabled;
  const win = options.targetWindow ?? (typeof window !== 'undefined' ? window : undefined);
  if (!win) {
    throw new Error('attachKeyboardDirections: no window (pass targetWindow in tests)');
  }
  const doc = options.ownerDocument ?? win.document;

  const pressedKeys = new Set<string>();

  function getActiveDirections(): ActiveDirectionFlags {
    if (!isKeyboardMoveEnabled()) {
      return { up: false, down: false, left: false, right: false };
    }
    return activeDirectionsFromMovementKeys(pressedKeys);
  }

  function onKeyDown(ev: Event): void {
    const ke = ev as KeyboardEvent;
    const norm = normalizeMovementKey(ke.key);
    if (norm === null || !MOVEMENT_KEYS.has(norm)) return;
    if (ke.repeat) return;
    if (isInteractiveFocusedElement(doc.activeElement)) return;
    if (!isKeyboardMoveEnabled()) return;

    pressedKeys.add(norm);

    if (norm.startsWith('Arrow')) {
      ke.preventDefault();
    }
  }

  function onKeyUp(ev: Event): void {
    const ke = ev as KeyboardEvent;
    const norm = normalizeMovementKey(ke.key);
    if (norm === null || !MOVEMENT_KEYS.has(norm)) return;

    pressedKeys.delete(norm);
  }

  win.addEventListener('keydown', onKeyDown);
  win.addEventListener('keyup', onKeyUp);

  return {
    getActiveDirections,
    detach() {
      win.removeEventListener('keydown', onKeyDown);
      win.removeEventListener('keyup', onKeyUp);
      pressedKeys.clear();
    },
  };
}
