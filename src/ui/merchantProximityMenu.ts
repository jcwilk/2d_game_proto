import type { Scene } from 'excalibur';

import { isWithinProximity } from '../proximity/worldDistance';
import { logicalGamePointToClientPoint, worldPointToOverlayLogical } from './screenOverlay';

/** Peaceful interactions only — attack is canvas click on the NPC. */
export const MERCHANT_PEACEFUL_ACTION_LABELS = ['Talk', 'Trade', 'Hug'] as const;
export type MerchantPeacefulActionLabel = (typeof MERCHANT_PEACEFUL_ACTION_LABELS)[number];

export interface MerchantProximityMenuOptions {
  canvas: HTMLCanvasElement;
  viewportSize: number;
  getCameraFocus?: () => { x: number; y: number };
  /** World-space radius for showing the menu. */
  proximityRadius: number;
  getPlayerFeet: () => { x: number; y: number };
  getMerchantFeet: () => { x: number; y: number };
  getMerchantMenuAnchorLogical: () => { x: number; y: number };
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
 * Horizontal row of peaceful actions above the merchant. Root uses `pointer-events: none`; row uses `auto`.
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
    if (!options.getMerchantAlive()) {
      menu.hidden = true;
      return;
    }
    const px = options.getPlayerFeet().x;
    const py = options.getPlayerFeet().y;
    const mx = options.getMerchantFeet().x;
    const my = options.getMerchantFeet().y;
    const near = isWithinProximity(px, py, mx, my, options.proximityRadius);

    if (!near || !options.getPeacefulWithMerchant()) {
      menu.hidden = true;
      return;
    }

    menu.hidden = false;
    const rect = options.canvas.getBoundingClientRect();
    const anchor = options.getMerchantMenuAnchorLogical();
    const cam = options.getCameraFocus?.();
    const logical = cam
      ? worldPointToOverlayLogical(anchor.x, anchor.y, cam.x, cam.y, options.viewportSize)
      : anchor;
    const client = logicalGamePointToClientPoint(logical.x, logical.y, rect, options.viewportSize);
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
