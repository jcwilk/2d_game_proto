import { vec, type Vector } from 'excalibur';

/**
 * Isometric diamond grid ↔ world space (`src/main.ts` floor / character anchors).
 * {@link gridCellBottomCenter} maps integer `(gx, gy)` → feet anchor; {@link isoFractionalGridFromWorld} inverts using both axes.
 */

export interface IsoGridParams {
  readonly cellBottomCenter: Vector;
  readonly isoHalfW: number;
  readonly isoHalfH: number;
  readonly centerG: number;
}

/** Feet anchor for grid cell `(gx, gy)` — bottom-center of the floor / wall cell. */
export function gridCellBottomCenter(gx: number, gy: number, p: IsoGridParams): Vector {
  return p.cellBottomCenter.add(
    vec((gx - gy) * p.isoHalfW, (gx + gy - 2 * p.centerG) * p.isoHalfH),
  );
}

/**
 * Inverse of {@link gridCellBottomCenter}: fractional `(gx, gy)` from world feet position.
 * `isoDepthSumFromWorld` only recovers `gx + gy` from `y`; collision needs the full 2D solve.
 */
export function isoFractionalGridFromWorld(pos: Vector, p: IsoGridParams): { gx: number; gy: number } {
  const ox = pos.x - p.cellBottomCenter.x;
  const oy = pos.y - p.cellBottomCenter.y;
  const gxMinusGy = ox / p.isoHalfW;
  const gxPlusGy = oy / p.isoHalfH + 2 * p.centerG;
  const gx = (gxPlusGy + gxMinusGy) / 2;
  const gy = (gxPlusGy - gxMinusGy) / 2;
  return { gx, gy };
}

export function wallKey(gx: number, gy: number): string {
  return `${gx},${gy}`;
}

export function parseWallKey(key: string): [number, number] {
  const i = key.indexOf(',');
  if (i < 0) {
    throw new Error(`parseWallKey: expected "gx,gy", got ${JSON.stringify(key)}`);
  }
  return [Number(key.slice(0, i)), Number(key.slice(i + 1))];
}
