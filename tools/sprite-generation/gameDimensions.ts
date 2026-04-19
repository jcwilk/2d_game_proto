/**
 * Sprite-generation entry for layout constants — re-exports from **`src/dimensions.ts`** (canonical).
 *
 * **`FLOOR_*_CELL_PX`** are legacy aliases equal to {@link floorOnlyCell} / {@link halfHeightCell} / {@link fullHeightCell}
 * `sizePx` (kept for call sites that used the pre-stitch flat names).
 *
 * @see ../../src/dimensions.ts
 */

import {
  floorOnlyCell,
  fullHeightCell,
  halfHeightCell,
} from "../../src/dimensions.ts";

export * from "../../src/dimensions.ts";

export const FLOOR_ONLY_CELL_PX = floorOnlyCell.sizePx;
export const HALF_HEIGHT_CELL_PX = halfHeightCell.sizePx;
export const FULL_HEIGHT_CELL_PX = fullHeightCell.sizePx;
