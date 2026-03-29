/**
 * DOM-native directional chrome (d-pad) outside the canvas. Complements
 * `subscribePointerInput` in `pointer.ts` — see that module’s header for the
 * engine vs chrome split.
 *
 * One **`sheet.png`** (2×2) is loaded; each control shows a quadrant via CSS
 * **`background-position`**. Path: **`art/dpad/sheet.png`** under Vite `public/` (same rule as
 * **`publicArtUrl`** in **`atlasLoader.ts`**, inlined here to avoid pulling Excalibur in tests).
 */
import { FLOOR_FORESHORTENED_HEIGHT_PX, TILE_FOOTPRINT_WIDTH_PX } from '../dimensions';

/** Screen-space step per grid axis — matches `main.ts` floor tile offsets (`isoHalfW` / `isoHalfH`). */
const ISO_EDGE_HALF_W = TILE_FOOTPRINT_WIDTH_PX / 2;
const ISO_EDGE_HALF_H = FLOOR_FORESHORTENED_HEIGHT_PX / 2;

export type Direction = 'up' | 'down' | 'left' | 'right';

function dpadSheetPublicUrl(): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? `${base}art/dpad/sheet.png` : `${base}/art/dpad/sheet.png`;
}

/** Row-major 2×2 sheet: up | down / left | right — matches `presets/dpad/dpad.mjs` `DPAD_FRAME_SHEET_CELLS`. */
const CHROME_SHEET_BG_POSITION: Record<Direction, string> = {
  up: '0% 0%',
  down: '100% 0%',
  left: '0% 100%',
  right: '100% 100%',
};

export interface ActiveDirectionFlags {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
}

/**
 * Same half-step as the isometric floor grid in `main.ts`: one tile step in grid space is
 * `(±TILE_FOOTPRINT_WIDTH_PX/2, ±FLOOR_FORESHORTENED_HEIGHT_PX/2)` in screen space (not 45° — rhombus
 * uses **W × (W/2)** cells). D-pad directions follow those edges: **up** = −∂gy (NE), **left** = −∂gx (NW),
 * **down** = +∂gy (SW), **right** = +∂gx (SE). Opposites cancel; combined keys sum then normalize so
 * single-key speed equals `speedPxPerSec`.
 */
export function chromeMoveVelocityFromActiveDirections(
  active: ActiveDirectionFlags,
  speedPxPerSec: number
): { x: number; y: number } {
  let dx = 0;
  let dy = 0;
  if (active.up && !active.down) {
    dx += ISO_EDGE_HALF_W;
    dy -= ISO_EDGE_HALF_H;
  } else if (active.down && !active.up) {
    dx -= ISO_EDGE_HALF_W;
    dy += ISO_EDGE_HALF_H;
  }
  if (active.left && !active.right) {
    dx -= ISO_EDGE_HALF_W;
    dy -= ISO_EDGE_HALF_H;
  } else if (active.right && !active.left) {
    dx += ISO_EDGE_HALF_W;
    dy += ISO_EDGE_HALF_H;
  }

  const len = Math.hypot(dx, dy);
  if (len === 0) return { x: 0, y: 0 };
  return {
    x: (dx / len) * speedPxPerSec,
    y: (dy / len) * speedPxPerSec,
  };
}

function directionFromDataset(el: HTMLElement): Direction | null {
  const raw = el.dataset['dir'];
  if (raw === 'up' || raw === 'down' || raw === 'left' || raw === 'right') return raw;
  return null;
}

export interface DirectionalChromeHandle {
  getActiveDirections(): ActiveDirectionFlags;
  detach(): void;
}

/**
 * Wires `.game-chrome` nodes under `root`: pointer listeners, per §6.2 maps/sets,
 * and `sheet.png` slice via CSS background on `.game-chrome-img`.
 */
export function attachDirectionalChrome(root: HTMLElement): DirectionalChromeHandle {
  const pointerToDirection = new Map<number, Direction>();
  const pointersByDirection: Record<Direction, Set<number>> = {
    up: new Set(),
    down: new Set(),
    left: new Set(),
    right: new Set(),
  };

  const chromeNodes = root.querySelectorAll<HTMLElement>('.game-chrome');

  const sheetUrl = dpadSheetPublicUrl();
  for (const el of chromeNodes) {
    const dir = directionFromDataset(el);
    if (!dir) continue;
    const node = el.querySelector<HTMLElement>('.game-chrome-img');
    if (node) {
      node.style.backgroundImage = `url("${sheetUrl}")`;
      node.style.backgroundSize = '200% 200%';
      node.style.backgroundRepeat = 'no-repeat';
      node.style.backgroundPosition = CHROME_SHEET_BG_POSITION[dir];
    }
  }

  function activeFromSets(): ActiveDirectionFlags {
    return {
      up: pointersByDirection.up.size > 0,
      down: pointersByDirection.down.size > 0,
      left: pointersByDirection.left.size > 0,
      right: pointersByDirection.right.size > 0,
    };
  }

  function clearPointer(pointerId: number): void {
    const dir = pointerToDirection.get(pointerId);
    if (dir === undefined) return;
    pointerToDirection.delete(pointerId);
    pointersByDirection[dir].delete(pointerId);
  }

  function onPointerDown(ev: Event): void {
    const pointerEv = ev as PointerEvent;
    const target = pointerEv.currentTarget;
    if (!(target instanceof HTMLElement)) return;
    const dir = directionFromDataset(target);
    if (!dir) return;
    pointerEv.preventDefault();
    try {
      target.setPointerCapture(pointerEv.pointerId);
    } catch {
      /* ignore if capture unsupported */
    }
    const pid = pointerEv.pointerId;
    clearPointer(pid);
    pointerToDirection.set(pid, dir);
    pointersByDirection[dir].add(pid);
  }

  function onPointerEnd(ev: Event): void {
    clearPointer((ev as PointerEvent).pointerId);
  }

  const listeners: Array<{ el: HTMLElement; type: string; fn: EventListener }> = [];

  for (const el of chromeNodes) {
    if (!directionFromDataset(el)) continue;
    const down: EventListener = onPointerDown;
    const end: EventListener = onPointerEnd;
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    listeners.push(
      { el, type: 'pointerdown', fn: down },
      { el, type: 'pointerup', fn: end },
      { el, type: 'pointercancel', fn: end },
      { el, type: 'lostpointercapture', fn: end }
    );
  }

  return {
    getActiveDirections: () => activeFromSets(),
    detach() {
      for (const { el, type, fn } of listeners) {
        el.removeEventListener(type, fn);
      }
      pointerToDirection.clear();
      for (const d of Object.keys(pointersByDirection) as Direction[]) {
        pointersByDirection[d].clear();
      }
    },
  };
}
