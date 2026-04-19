import type { Scene } from 'excalibur';

import { isWithinProximity } from '../proximity/worldDistance';
import { logicalGamePointToClientPoint } from './screenOverlay';

export const MERCHANT_ACTION_LABELS = ['Attack', 'Talk', 'Trade', 'Hug'] as const;
export type MerchantActionLabel = (typeof MERCHANT_ACTION_LABELS)[number];

export interface MerchantProximityMenuOptions {
  canvas: HTMLCanvasElement;
  viewportSize: number;
  /** World-space radius (same units as `Actor.pos`) for showing the menu. */
  proximityRadius: number;
  getPlayerFeet: () => { x: number; y: number };
  getMerchantFeet: () => { x: number; y: number };
  /**
   * Logical point for anchoring the menu (e.g. above the merchant’s head). Fixed camera: same space as
   * `VIEWPORT_SIZE` canvas coordinates.
   */
  getMerchantMenuAnchorLogical: () => { x: number; y: number };
  onAction: (action: MerchantActionLabel) => void;
}

export interface MerchantProximityMenuHandle {
  close: () => void;
}

/**
 * Horizontal row of actions above the merchant; only visible within {@link MerchantProximityMenuOptions.proximityRadius}.
 * The overlay root uses `pointer-events: none`; the row uses `pointer-events: auto` so the canvas stays playable.
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

  const row = document.createElement('div');
  row.className = 'merchant-action-menu__row';

  for (const label of MERCHANT_ACTION_LABELS) {
    const control = document.createElement('span');
    control.className = 'merchant-action-menu__action';
    control.textContent = label;
    control.setAttribute('role', 'button');
    control.tabIndex = -1;
    control.addEventListener('click', (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
      options.onAction(label);
    });
    row.appendChild(control);
  }

  menu.appendChild(row);
  overlay.appendChild(menu);

  const wrap = options.canvas.parentElement;
  if (!wrap) {
    throw new Error('attachMerchantProximityMenu: canvas has no parent');
  }
  wrap.appendChild(overlay);

  function sync(): void {
    const px = options.getPlayerFeet().x;
    const py = options.getPlayerFeet().y;
    const mx = options.getMerchantFeet().x;
    const my = options.getMerchantFeet().y;
    const near = isWithinProximity(px, py, mx, my, options.proximityRadius);

    if (!near) {
      menu.hidden = true;
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
      overlay.remove();
    },
  };
}
