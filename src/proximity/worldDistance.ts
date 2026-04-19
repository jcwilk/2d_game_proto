/**
 * World-space proximity helpers (center-to-center using the same `Actor.pos` points as gameplay).
 * Keeps semantics aligned with monster proximity UI (2gp-real) and merchant proximity menu (2gp-v4mi).
 */

/** Squared distance between two world points (avoids sqrt when only comparing to a radius). */
export function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

/**
 * True when `a` is within `radius` of `b` in world space (Euclidean, center-to-center).
 */
export function isWithinProximity(ax: number, ay: number, bx: number, by: number, radius: number): boolean {
  const r2 = radius * radius;
  return distanceSquared(ax, ay, bx, by) <= r2;
}
