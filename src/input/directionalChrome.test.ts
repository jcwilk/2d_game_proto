import { describe, expect, it } from 'vitest';

import { chromeMoveVelocityFromActiveDirections } from './directionalChrome';

const S = 200;

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

  it('single-axis directions use full speed (y-up is negative)', () => {
    expect(chromeMoveVelocityFromActiveDirections({ up: true, down: false, left: false, right: false }, S)).toEqual({
      x: 0,
      y: -S,
    });
    expect(chromeMoveVelocityFromActiveDirections({ up: false, down: true, left: false, right: false }, S)).toEqual({
      x: 0,
      y: S,
    });
    expect(chromeMoveVelocityFromActiveDirections({ up: false, down: false, left: true, right: false }, S)).toEqual({
      x: -S,
      y: 0,
    });
    expect(chromeMoveVelocityFromActiveDirections({ up: false, down: false, left: false, right: true }, S)).toEqual({
      x: S,
      y: 0,
    });
  });

  it('normalizes diagonals so speed matches single-axis (not √2×)', () => {
    const v = chromeMoveVelocityFromActiveDirections(
      { up: true, down: false, left: true, right: false },
      S
    );
    const mag = Math.hypot(v.x, v.y);
    expect(mag).toBeCloseTo(S, 5);
    expect(v.x).toBeCloseTo(-S / Math.SQRT2, 5);
    expect(v.y).toBeCloseTo(-S / Math.SQRT2, 5);
  });

  it('returns zero when no direction is active', () => {
    expect(chromeMoveVelocityFromActiveDirections({ up: false, down: false, left: false, right: false }, S)).toEqual({
      x: 0,
      y: 0,
    });
  });
});
