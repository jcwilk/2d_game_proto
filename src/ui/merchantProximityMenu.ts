import type { Scene } from 'excalibur';

import { isWithinProximity } from '../proximity/worldDistance';
import { logicalGamePointToClientPoint } from './screenOverlay';

/** Pool of canned lines — each merchant instance gets one distinct phrase at startup (shuffled assignment). */
export const MERCHANT_TALK_PHRASE_POOL = [
  'Fine wares, friend!',
  'Mind the claws out east.',
  'No refunds on courage.',
  'Cold iron, warm bread.',
  'The floor remembers every step.',
  'Trade winds favor the bold.',
  'I knew you’d wander by.',
  'Keep your shadow close.',
  'Spices from the lower stair.',
  'Rest before the dark path.',
  'Coins sing; listen close.',
  'The grid has its moods.',
] as const;

/**
 * Assigns `count` distinct phrases from {@link MERCHANT_TALK_PHRASE_POOL} using a random shuffle.
 * Each index `i` in the returned array is stable for the life of the run.
 */
export function pickDistinctMerchantPhrases(count: number): string[] {
  const pool = [...MERCHANT_TALK_PHRASE_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const t = pool[i]!;
    pool[i] = pool[j]!;
    pool[j] = t;
  }
  if (count > pool.length) {
    throw new Error(
      `pickDistinctMerchantPhrases: need ${count} phrases but pool has only ${pool.length}`,
    );
  }
  return pool.slice(0, count);
}

/** Peaceful interactions only — attack is canvas click on the NPC. */
export const MERCHANT_PEACEFUL_ACTION_LABELS = ['Talk', 'Hug'] as const;
export type MerchantPeacefulActionLabel = (typeof MERCHANT_PEACEFUL_ACTION_LABELS)[number];

const TALK_BUBBLE_MS = 4200;

export interface MerchantProximityMenuOptions {
  canvas: HTMLCanvasElement;
  viewportSize: number;
  /** World-space radius for showing the menu. */
  proximityRadius: number;
  getPlayerFeet: () => { x: number; y: number };
  getMerchantFeet: () => { x: number; y: number };
  getMerchantMenuAnchorLogical: () => { x: number; y: number };
  /** Canned line for this merchant — fixed for the instance, distinct from other merchants when using {@link pickDistinctMerchantPhrases}. */
  getMerchantTalkPhrase: () => string;
  onAction: (action: MerchantPeacefulActionLabel) => void;
  /** If false, menu stays hidden (e.g. after the player has attacked the shopkeeper). */
  getPeacefulWithMerchant: () => boolean;
  /** If false, merchant is gone — hide menu. */
  getMerchantAlive: () => boolean;
}

export interface MerchantProximityMenuHandle {
  close: () => void;
}

/**
 * Horizontal row of peaceful actions above the merchant, optional speech bubble on Talk.
 * Root uses `pointer-events: none`; row uses `auto`.
 */
export function attachMerchantProximityMenu(
  scene: Scene,
  options: MerchantProximityMenuOptions,
): MerchantProximityMenuHandle {
  const overlay = document.createElement('div');
  overlay.id = 'game-canvas-overlay';
  overlay.className = 'game-canvas-overlay';
  overlay.setAttribute('aria-hidden', 'true');

  const menu = document.createElement('div');
  menu.id = 'merchant-action-menu';
  menu.className = 'merchant-action-menu';
  menu.setAttribute('role', 'toolbar');
  menu.setAttribute('aria-label', 'Merchant actions');

  const talkBubble = document.createElement('div');
  talkBubble.className = 'merchant-talk-bubble';
  talkBubble.hidden = true;
  talkBubble.setAttribute('aria-live', 'polite');

  const row = document.createElement('div');
  row.className = 'merchant-action-menu__row';

  let bubbleHideTimer: ReturnType<typeof setTimeout> | undefined;

  function hideTalkBubble(): void {
    if (bubbleHideTimer !== undefined) {
      clearTimeout(bubbleHideTimer);
      bubbleHideTimer = undefined;
    }
    talkBubble.hidden = true;
    talkBubble.textContent = '';
  }

  function showTalkBubble(text: string): void {
    hideTalkBubble();
    talkBubble.textContent = text;
    talkBubble.hidden = false;
    bubbleHideTimer = setTimeout(() => {
      bubbleHideTimer = undefined;
      talkBubble.hidden = true;
      talkBubble.textContent = '';
    }, TALK_BUBBLE_MS);
  }

  for (const label of MERCHANT_PEACEFUL_ACTION_LABELS) {
    const control = document.createElement('span');
    control.className = 'merchant-action-menu__action';
    control.textContent = label;
    control.setAttribute('role', 'button');
    control.tabIndex = -1;
    control.addEventListener('pointerdown', (ev) => {
      ev.preventDefault();
    });
    control.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      if (label === 'Talk') {
        showTalkBubble(options.getMerchantTalkPhrase());
      }
      options.onAction(label);
    });
    row.appendChild(control);
  }

  menu.appendChild(talkBubble);
  menu.appendChild(row);
  overlay.appendChild(menu);

  const wrap = options.canvas.parentElement;
  if (!wrap) {
    throw new Error('attachMerchantProximityMenu: canvas has no parent');
  }
  wrap.appendChild(overlay);

  function sync(): void {
    if (!options.getMerchantAlive()) {
      menu.hidden = true;
      hideTalkBubble();
      return;
    }
    const px = options.getPlayerFeet().x;
    const py = options.getPlayerFeet().y;
    const mx = options.getMerchantFeet().x;
    const my = options.getMerchantFeet().y;
    const near = isWithinProximity(px, py, mx, my, options.proximityRadius);

    if (!near || !options.getPeacefulWithMerchant()) {
      menu.hidden = true;
      hideTalkBubble();
      return;
    }

    menu.hidden = false;
    const rect = options.canvas.getBoundingClientRect();
    const anchor = options.getMerchantMenuAnchorLogical();
    const client = logicalGamePointToClientPoint(anchor.x, anchor.y, rect, options.viewportSize);
    menu.style.left = `${client.x}px`;
    menu.style.top = `${client.y}px`;
  }

  const sub = scene.on('preupdate', sync);

  return {
    close() {
      sub.close();
      hideTalkBubble();
      overlay.remove();
    },
  };
}
