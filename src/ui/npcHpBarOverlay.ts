import { logicalGamePointToClientPoint, worldPointToOverlayLogical } from './screenOverlay';

export interface NpcHpBarEntry {
  id: string;
  getHp: () => number;
  getMaxHp: () => number;
  /** World position for the center of the bar (e.g. above sprite head). */
  getAnchorLogical: () => { x: number; y: number };
  /** Skip bar when false (e.g. NPC defeated / removed). */
  isActive?: () => boolean;
}

export interface NpcHpBarOverlayOptions {
  canvas: HTMLCanvasElement;
  viewportSize: number;
  /** When the scene camera moves, pass focal point so world anchors map to the canvas. */
  getCameraFocus?: () => { x: number; y: number };
  entries: NpcHpBarEntry[];
}

/**
 * Thin DOM HP strips above NPCs; hidden at full HP. Pointer-events none — clicks pass to the canvas.
 */
export function attachNpcHpBarOverlay(options: NpcHpBarOverlayOptions): { close: () => void; sync: () => void } {
  const wrap = options.canvas.parentElement;
  if (!wrap) {
    throw new Error('attachNpcHpBarOverlay: canvas has no parent');
  }

  const layer = document.createElement('div');
  layer.className = 'npc-hp-overlay-layer';
  layer.setAttribute('aria-hidden', 'true');

  const barEls = new Map<string, HTMLDivElement>();

  for (const e of options.entries) {
    const row = document.createElement('div');
    row.className = 'npc-hp-bar';
    row.dataset['npcId'] = e.id;

    const inner = document.createElement('div');
    inner.className = 'npc-hp-bar__track';

    row.appendChild(inner);
    layer.appendChild(row);
    barEls.set(e.id, inner);
  }

  wrap.appendChild(layer);

  function sync(): void {
    const rect = options.canvas.getBoundingClientRect();
    for (const e of options.entries) {
      const track = barEls.get(e.id);
      if (!track) continue;
      const row = track.parentElement as HTMLDivElement;
      if (e.isActive && !e.isActive()) {
        row.hidden = true;
        continue;
      }
      const hp = e.getHp();
      const max = Math.max(1, e.getMaxHp());
      if (hp >= max || hp <= 0) {
        row.hidden = true;
        continue;
      }
      row.hidden = false;
      const t = Math.max(0, Math.min(1, hp / max));
      const pct = Math.round(t * 1000) / 10;
      track.style.background = `linear-gradient(to right, #22c55e 0%, #22c55e ${pct}%, #dc2626 ${pct}%, #dc2626 100%)`;
      const anchor = e.getAnchorLogical();
      const cam = options.getCameraFocus?.();
      const logical = cam
        ? worldPointToOverlayLogical(anchor.x, anchor.y, cam.x, cam.y, options.viewportSize)
        : anchor;
      const client = logicalGamePointToClientPoint(logical.x, logical.y, rect, options.viewportSize);
      row.style.left = `${client.x}px`;
      row.style.top = `${client.y}px`;
    }
  }

  return {
    close: () => {
      layer.remove();
    },
    sync,
  };
}
