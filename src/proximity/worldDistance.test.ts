import { describe, expect, it } from 'vitest';

import { distanceSquared, isWithinProximity } from './worldDistance';

describe('worldDistance', () => {
  it('distanceSquared matches Euclidean', () => {
    expect(distanceSquared(0, 0, 3, 4)).toBe(25);
  });

  it('isWithinProximity is inclusive on the radius boundary', () => {
    expect(isWithinProximity(0, 0, 10, 0, 10)).toBe(true);
    expect(isWithinProximity(0, 0, 10, 0, 9.999)).toBe(false);
  });

  it('isWithinProximity is symmetric', () => {
    expect(isWithinProximity(1, 2, 4, 6, 50)).toBe(isWithinProximity(4, 6, 1, 2, 50));
  });
});
