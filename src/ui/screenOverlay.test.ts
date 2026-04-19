import { describe, expect, it } from 'vitest';

import { logicalGamePointToClientPoint } from './screenOverlay';

function rect(left: number, top: number, width: number, height: number): DOMRectReadOnly {
  return { left, top, width, height, right: left + width, bottom: top + height, x: left, y: top, toJSON() {} };
}

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
