import { wallKey } from './isoGrid';

/**
 * Grid cells occupied by isometric wall sprites — single source for rendering and collision (`wor-2eoc`, `wor-a25k`).
 * Coordinates are `0 … gridSize-1` on the same diamond grid as floor tiles in `main.ts`.
 * Kept away from spawn `(4, 4)` so the player can reach open cells (plus-shape through center would block all exits).
 */
export const ISO_WALL_GRID_CELLS: ReadonlyArray<readonly [number, number]> = [
  [6, 2],
  [6, 3],
  [6, 4],
  [6, 5],
  [7, 4],
];

export function createWallCellKeySet(): Set<string> {
  return new Set(ISO_WALL_GRID_CELLS.map(([gx, gy]) => wallKey(gx, gy)));
}
