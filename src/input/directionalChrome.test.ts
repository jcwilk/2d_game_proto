import { describe, expect, it } from 'vitest';

import { FLOOR_FORESHORTENED_HEIGHT_PX, TILE_FOOTPRINT_WIDTH_PX } from '../dimensions';
import {
  activeDirectionsFromPointerCountsAndLatch,
  chromeMoveVelocityFromActiveDirections,
} from './directionalChrome';

const S = 200;

const ISO_HW = TILE_FOOTPRINT_WIDTH_PX / 2;
const ISO_HH = FLOOR_FORESHORTENED_HEIGHT_PX / 2;

function velocityAlong(dx: number, dy: number, speed: number): { x: number; y: number } {
  const len = Math.hypot(dx, dy);
  return { x: (dx / len) * speed, y: (dy / len) * speed };
}

describe('chromeMoveVelocityFromActiveDirections', () => {
  it('cancels opposite directions on each axis', () => {
    expect(
      chromeMoveVelocityFromActiveDirections(
        { up: true, down: true, left: false, right: false },
        S
      )
    ).toEqual({ x: 0, y: 0 });
    expect(
      chromeMoveVelocityFromActiveDirections(
        { up: false, down: false, left: true, right: true },
        S
      )
    ).toEqual({ x: 0, y: 0 });
  });

  it('single directions match tile-edge angles (W/2 × H/2 step, not 45°)', () => {
    expect(chromeMoveVelocityFromActiveDirections({ up: true, down: false, left: false, right: false }, S)).toEqual(
      velocityAlong(ISO_HW, -ISO_HH, S)
    );
    expect(chromeMoveVelocityFromActiveDirections({ up: false, down: true, left: false, right: false }, S)).toEqual(
      velocityAlong(-ISO_HW, ISO_HH, S)
    );
    expect(chromeMoveVelocityFromActiveDirections({ up: false, down: false, left: true, right: false }, S)).toEqual(
      velocityAlong(-ISO_HW, -ISO_HH, S)
    );
    expect(chromeMoveVelocityFromActiveDirections({ up: false, down: false, left: false, right: true }, S)).toEqual(
      velocityAlong(ISO_HW, ISO_HH, S)
    );
  });

  it('normalizes combined keys so speed matches single-key (not √2×)', () => {
    const v = chromeMoveVelocityFromActiveDirections(
      { up: true, down: false, left: true, right: false },
      S
    );
    const mag = Math.hypot(v.x, v.y);
    expect(mag).toBeCloseTo(S, 5);
    expect(v.x).toBe(0);
    expect(v.y).toBe(-S);
  });

  it('returns zero when no direction is active', () => {
    expect(chromeMoveVelocityFromActiveDirections({ up: false, down: false, left: false, right: false }, S)).toEqual({
      x: 0,
      y: 0,
    });
  });
});

describe('activeDirectionsFromPointerCountsAndLatch', () => {
  it('uses current pointer counts immediately', () => {
    expect(
      activeDirectionsFromPointerCountsAndLatch(
        { up: 0, down: 0, left: 1, right: 0 },
        { up: 0, down: 0, left: 0, right: 0 },
        500
      )
    ).toEqual({ up: false, down: false, left: true, right: false });
  });

  it('keeps direction active while latch window is not expired', () => {
    expect(
      activeDirectionsFromPointerCountsAndLatch(
        { up: 0, down: 0, left: 0, right: 0 },
        { up: 0, down: 0, left: 200, right: 0 },
        199
      )
    ).toEqual({ up: false, down: false, left: true, right: false });
  });

  it('expires direction when latch deadline is reached', () => {
    expect(
      activeDirectionsFromPointerCountsAndLatch(
        { up: 0, down: 0, left: 0, right: 0 },
        { up: 0, down: 0, left: 200, right: 0 },
        200
      )
    ).toEqual({ up: false, down: false, left: false, right: false });
  });
});
