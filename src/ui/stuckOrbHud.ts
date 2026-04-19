/**
 * Draggable stuck-ability orb (DOM). See specs/drag-stun-hud.md — pointer path, sprite-ref-driven frames.
 */
import type { TryApplyStuckAtWorldCoordsResult } from '../game/stuckAbility';
import { clientPointToWorldPoint } from './screenOverlay';

/** Matches manifest `wallMs`-scale feel; 3 activation frames → ~270ms total. */
export const STUCK_ORB_ACTIVATION_FRAME_MS = 90;

type GridRefJson = {
  rows: number;
  columns: number;
  spriteWidth: number;
  spriteHeight: number;
};

type SpriteRefJson = {
  grid: GridRefJson;
  frames: Record<string, { column: number; row: number }>;
  image: string;
};

const FRAME_KEYS = ['idle', 'activate_1', 'activate_2', 'activate_3'] as const;

function publicArtUrl(pathFromArt: string): string {
  const base = import.meta.env.BASE_URL;
  const trimmed = pathFromArt.replace(/^\//, '');
  return base.endsWith('/') ? `${base}${trimmed}` : `${base}/${trimmed}`;
}

function backgroundPositionForCell(column: number, row: number, columns: number, rows: number): string {
  const xPct = columns <= 1 ? 0 : (column / (columns - 1)) * 100;
  const yPct = rows <= 1 ? 0 : (row / (rows - 1)) * 100;
  return `${xPct}% ${yPct}%`;
}

function backgroundSizeForGrid(columns: number, rows: number): string {
  return `${columns * 100}% ${rows * 100}%`;
}

export interface AttachStuckOrbHudOptions {
  /** Large hit target; receives pointer capture. */
  hitTarget: HTMLElement;
  /** Inner node that displays the sheet (background-*). */
  spriteElement: HTMLElement;
  getCanvas: () => HTMLCanvasElement;
  viewportSize: number;
  /** Scene camera focal point (Excalibur `camera.pos`) — maps canvas picks to world space when the camera moves. */
  getCameraFocus: () => { x: number; y: number };
  /** Gate drag start + visual “ready” state; must match tryApply cooldown (API source of truth). */
  isAbilityReady: () => boolean;
  onDrop: (worldX: number, worldY: number) => TryApplyStuckAtWorldCoordsResult;
}

export interface StuckOrbHudHandle {
  detach(): void;
}

export async function loadStuckOrbSpriteRef(): Promise<SpriteRefJson> {
  const url = publicArtUrl('art/hud-drag-orb/sprite-ref.json');
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`stuck orb sprite-ref fetch failed: ${res.status} ${url}`);
  }
  return (await res.json()) as SpriteRefJson;
}

function applyFrameToElement(
  el: HTMLElement,
  ref: SpriteRefJson,
  frameKey: (typeof FRAME_KEYS)[number],
  sheetUrl: string,
): void {
  const cell = ref.frames[frameKey];
  if (!cell) {
    throw new Error(`stuck orb sprite-ref missing frame ${JSON.stringify(frameKey)}`);
  }
  const { columns, rows } = ref.grid;
  el.style.backgroundImage = `url("${sheetUrl}")`;
  el.style.backgroundRepeat = 'no-repeat';
  el.style.backgroundSize = backgroundSizeForGrid(columns, rows);
  el.style.backgroundPosition = backgroundPositionForCell(cell.column, cell.row, columns, rows);
}

/**
 * Wires pointer handlers, optional floating ghost during drag, and activation strip (frames 1–3 on `'ok'` only).
 */
export function attachStuckOrbHud(ref: SpriteRefJson, options: AttachStuckOrbHudOptions): StuckOrbHudHandle {
  const { hitTarget, spriteElement, getCanvas, viewportSize, getCameraFocus, isAbilityReady, onDrop } = options;
  const sheetUrl = publicArtUrl(ref.image);

  const ghost = document.createElement('div');
  ghost.className = 'game-stuck-orb-drag-ghost';
  ghost.setAttribute('aria-hidden', 'true');
  document.body.appendChild(ghost);

  let dragPointerId: number | null = null;
  const activationTimers: ReturnType<typeof setTimeout>[] = [];
  let activationPhase: 'idle' | '1' | '2' | '3' = 'idle';

  function clearActivationTimers(): void {
    for (const t of activationTimers) {
      clearTimeout(t);
    }
    activationTimers.length = 0;
  }

  function scheduleActivationTimer(fn: () => void, ms: number): void {
    const t = setTimeout(() => {
      const i = activationTimers.indexOf(t);
      if (i >= 0) {
        activationTimers.splice(i, 1);
      }
      fn();
    }, ms);
    activationTimers.push(t);
  }

  function setOrbVisualFrame(key: (typeof FRAME_KEYS)[number]): void {
    applyFrameToElement(spriteElement, ref, key, sheetUrl);
    if (key === 'idle') {
      ghost.style.backgroundImage = spriteElement.style.backgroundImage;
      ghost.style.backgroundRepeat = spriteElement.style.backgroundRepeat;
      ghost.style.backgroundSize = spriteElement.style.backgroundSize;
      ghost.style.backgroundPosition = spriteElement.style.backgroundPosition;
    }
  }

  function refreshReadyAppearance(): void {
    const ready = isAbilityReady() && activationPhase === 'idle' && dragPointerId === null;
    hitTarget.style.opacity = ready ? '1' : '0.42';
    hitTarget.setAttribute('aria-disabled', ready ? 'false' : 'true');
  }

  function syncGhostSize(): void {
    const r = hitTarget.getBoundingClientRect();
    const size = Math.max(r.width, r.height, 44);
    ghost.style.width = `${size}px`;
    ghost.style.height = `${size}px`;
  }

  function showGhostAt(clientX: number, clientY: number): void {
    syncGhostSize();
    ghost.style.display = 'block';
    const r = hitTarget.getBoundingClientRect();
    const w = parseFloat(ghost.style.width) || r.width;
    const h = parseFloat(ghost.style.height) || r.height;
    ghost.style.left = `${clientX - w / 2}px`;
    ghost.style.top = `${clientY - h / 2}px`;
  }

  function hideGhost(): void {
    ghost.style.display = 'none';
  }

  function runActivationStrip(): void {
    clearActivationTimers();
    activationPhase = '1';
    setOrbVisualFrame('activate_1');
    refreshReadyAppearance();

    scheduleActivationTimer(() => {
      activationPhase = '2';
      setOrbVisualFrame('activate_2');
      refreshReadyAppearance();
      scheduleActivationTimer(() => {
        activationPhase = '3';
        setOrbVisualFrame('activate_3');
        refreshReadyAppearance();
        scheduleActivationTimer(() => {
          activationPhase = 'idle';
          setOrbVisualFrame('idle');
          refreshReadyAppearance();
        }, STUCK_ORB_ACTIVATION_FRAME_MS);
      }, STUCK_ORB_ACTIVATION_FRAME_MS);
    }, STUCK_ORB_ACTIVATION_FRAME_MS);
  }

  setOrbVisualFrame('idle');
  refreshReadyAppearance();

  const rafSync = (): void => {
    refreshReadyAppearance();
    requestAnimationFrame(rafSync);
  };
  const rafId = requestAnimationFrame(rafSync);

  function onPointerDown(ev: Event): void {
    const e = ev as PointerEvent;
    if (e.button !== 0 && e.button !== -1) {
      return;
    }
    if (dragPointerId !== null) {
      return;
    }
    if (activationPhase !== 'idle') {
      return;
    }
    if (!isAbilityReady()) {
      e.preventDefault();
      return;
    }
    e.preventDefault();
    try {
      hitTarget.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    dragPointerId = e.pointerId;
    showGhostAt(e.clientX, e.clientY);
    hitTarget.style.opacity = '0.25';
  }

  function onPointerMove(ev: Event): void {
    const e = ev as PointerEvent;
    if (dragPointerId !== e.pointerId) {
      return;
    }
    e.preventDefault();
    showGhostAt(e.clientX, e.clientY);
  }

  function endDrag(e: PointerEvent, apply: boolean): void {
    if (dragPointerId !== e.pointerId) {
      return;
    }
    dragPointerId = null;
    hideGhost();
    hitTarget.style.opacity = '';

    if (apply) {
      const canvas = getCanvas();
      const cam = getCameraFocus();
      const w = clientPointToWorldPoint(e.clientX, e.clientY, canvas, viewportSize, cam.x, cam.y);
      if (w) {
        const result = onDrop(w.x, w.y);
        if (result.result === 'ok') {
          runActivationStrip();
        } else {
          refreshReadyAppearance();
        }
      } else {
        refreshReadyAppearance();
      }
    } else {
      refreshReadyAppearance();
    }
  }

  function onPointerUp(ev: Event): void {
    endDrag(ev as PointerEvent, true);
  }

  function onPointerCancelOrLost(ev: Event): void {
    endDrag(ev as PointerEvent, false);
  }

  hitTarget.addEventListener('pointerdown', onPointerDown);
  hitTarget.addEventListener('pointermove', onPointerMove);
  hitTarget.addEventListener('pointerup', onPointerUp);
  hitTarget.addEventListener('pointercancel', onPointerCancelOrLost);
  hitTarget.addEventListener('lostpointercapture', onPointerCancelOrLost);

  return {
    detach() {
      cancelAnimationFrame(rafId);
      clearActivationTimers();
      activationPhase = 'idle';
      hitTarget.removeEventListener('pointerdown', onPointerDown);
      hitTarget.removeEventListener('pointermove', onPointerMove);
      hitTarget.removeEventListener('pointerup', onPointerUp);
      hitTarget.removeEventListener('pointercancel', onPointerCancelOrLost);
      hitTarget.removeEventListener('lostpointercapture', onPointerCancelOrLost);
      ghost.remove();
    },
  };
}
