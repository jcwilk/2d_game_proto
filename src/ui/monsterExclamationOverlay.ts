import type { Actor } from 'excalibur';

import { isWithinProximity } from '../proximity/worldDistance';
import { logicalGamePointToClientPoint } from './screenOverlay';

/**
 * Trigger radius in **world / logical pixels** — distance between player and monster {@link Actor.pos}
 * (feet anchors). Tunable with gameplay; semantics match {@link isWithinProximity} / merchant menu.
 */
export const MONSTER_PROXIMITY_RANGE_WORLD_PX = 140;

/**
 * DOM layer for monster “!” — **below** `#game-canvas-overlay` (merchant UI, **z-index** 20 in `styles.css`).
 */
export const Z_INDEX_MONSTER_EXCLAMATION_OVERLAY = 10;

export interface MonsterExclamationOverlayOptions {
  readonly canvas: HTMLCanvasElement;
  /** Logical square edge — same as {@link VIEWPORT_SIZE}. */
  readonly viewportSize: number;
  readonly rangeWorldPx: number;
  getPlayerPos: () => { x: number; y: number };
  getMonster: () => Actor | undefined;
  /** World Y increases downward; place the label above the sprite (smaller Y). */
  getMonsterLabelWorldPos: () => { x: number; y: number } | null;
}

/**
 * Creates a fixed-position “!” over the monster when the player is within range. Call **`sync()`** each frame while
 * the scene runs; removes the node on **`close()`**.
 */
export function attachMonsterExclamationOverlay(options: MonsterExclamationOverlayOptions): {
  close: () => void;
  sync: () => void;
} {
  const wrap = options.canvas.parentElement;
  if (!wrap) {
    throw new Error('attachMonsterExclamationOverlay: canvas has no parent');
  }

  const el = document.createElement('div');
  el.className = 'monster-exclamation-overlay';
  el.textContent = '!';
  el.setAttribute('role', 'presentation');
  el.setAttribute('aria-hidden', 'true');
  wrap.appendChild(el);

  function sync(): void {
    const monster = options.getMonster();
    if (!monster) {
      el.hidden = true;
      return;
    }
    const p = options.getPlayerPos();
    if (!isWithinProximity(p.x, p.y, monster.pos.x, monster.pos.y, options.rangeWorldPx)) {
      el.hidden = true;
      return;
    }
    const labelPos = options.getMonsterLabelWorldPos();
    if (!labelPos) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const rect = options.canvas.getBoundingClientRect();
    const client = logicalGamePointToClientPoint(labelPos.x, labelPos.y, rect, options.viewportSize);
    el.style.left = `${client.x}px`;
    el.style.top = `${client.y}px`;
  }

  return {
    close: () => {
      el.remove();
    },
    sync,
  };
}
