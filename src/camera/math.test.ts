import { describe, expect, it } from 'vitest';

import { clampCameraToWorldBounds, screenToWorld, worldToScreen } from './math';

describe('worldToScreen / screenToWorld', () => {
  it('maps world origin to screen origin when the camera is at the world origin', () => {
    const s = worldToScreen(0, 0, 0, 0);
    expect(s.x).toBe(0);
    expect(s.y).toBe(0);
  });

  it('maps negative world coordinates relative to the camera', () => {
    const s = worldToScreen(-32, 64, 0, 0);
    expect(s.x).toBe(-32);
    expect(s.y).toBe(64);
    const s2 = worldToScreen(0, 0, 100, 50);
    expect(s2.x).toBe(-100);
    expect(s2.y).toBe(-50);
  });

  it('round-trips screen ↔ world for a non-origin camera', () => {
    const camX = 120;
    const camY = 80;
    const w = screenToWorld(40, 25, camX, camY);
    expect(w.x).toBe(160);
    expect(w.y).toBe(105);
    const back = worldToScreen(w.x, w.y, camX, camY);
    expect(back.x).toBe(40);
    expect(back.y).toBe(25);
  });
});

describe('clampCameraToWorldBounds', () => {
  it('pins the camera when the viewport is larger than the world', () => {
    const c = clampCameraToWorldBounds(50, 60, 800, 600, 400, 300);
    expect(c.x).toBe(0);
    expect(c.y).toBe(0);
  });

  it('clamps camera position so the viewport stays inside the world', () => {
    const c = clampCameraToWorldBounds(999, -10, 200, 150, 500, 400);
    expect(c.x).toBe(300);
    expect(c.y).toBe(0);
  });
});
