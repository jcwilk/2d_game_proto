import { logicalGamePointToClientPoint } from './screenOverlay';

export interface HugHeartBurstOptions {
  canvas: HTMLCanvasElement;
  viewportSize: number;
  /** World-space anchor (e.g. above merchant head). */
  getAnchorLogical: () => { x: number; y: number };
}

/**
 * Spawns a short floating heart burst at the given logical anchor (DOM overlay, HiDPI-safe).
 */
export function spawnHugHeartBurst(options: HugHeartBurstOptions): void {
  const wrap = options.canvas.parentElement;
  if (!wrap) {
    return;
  }

  const rect = options.canvas.getBoundingClientRect();
  const anchor = options.getAnchorLogical();
  const base = logicalGamePointToClientPoint(anchor.x, anchor.y, rect, options.viewportSize);

  const layer = document.createElement('div');
  layer.className = 'hug-heart-burst';
  layer.setAttribute('aria-hidden', 'true');

  const offsets = [0, -10, 10];
  for (let i = 0; i < offsets.length; i++) {
    const h = document.createElement('span');
    h.className = 'hug-heart-burst__heart';
    h.textContent = '♥';
    h.style.left = `${base.x + offsets[i]!}px`;
    h.style.top = `${base.y}px`;
    h.style.animationDelay = `${i * 80}ms`;
    layer.appendChild(h);
  }

  wrap.appendChild(layer);
  window.setTimeout(() => {
    layer.remove();
  }, 900);
}
