import { describe, expect, it } from 'vitest';

import { logicalGamePointToClientPoint, worldPointToOverlayLogical } from './screenOverlay';

function rect(left: number, top: number, width: number, height: number): DOMRectReadOnly {
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} };
}

describe('worldPointToOverlayLogical', () => {
  it('maps world origin to top-left when the camera focus is at viewport center', () => {
    const p = worldPointToOverlayLogical(0, 0, 480, 480, 960);
    expect(p.x).toBe(0);
    expect(p.y).toBe(0);
  });

  it('maps the camera focus to the logical center of the viewport', () => {
    const p = worldPointToOverlayLogical(100, 200, 100, 200, 960);
    expect(p.x).toBe(480);
    expect(p.y).toBe(480);
  });
});

describe('logicalGamePointToClientPoint', () => {
  it('maps logical origin to canvas top-left in client space', () => {
    const p = logicalGamePointToClientPoint(0, 0, rect(100, 50, 960, 960), 960);
    expect(p.x).toBe(100);
    expect(p.y).toBe(50);
  });

  it('scales uniformly with canvasRect / viewportSize', () => {
    const p = logicalGamePointToClientPoint(480, 240, rect(0, 0, 1920, 1920), 960);
    expect(p.x).toBe(960);
    expect(p.y).toBe(480);
  });
});
