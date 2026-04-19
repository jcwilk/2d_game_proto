/**
 * Numeric layout constants shared with **`src/dimensions.ts`**.
 *
 * **Keep in sync** — `src/dimensions.sync.test.ts` asserts parity with the TypeScript module.
 *
 * @see ../../../../src/dimensions.ts
 *
 * Deduplication with **`src/dimensions`** is deferred to **`2gp-y4cn`**.
 */

export const TILE_WORLD_M = 1;
export const FULL_VERTICAL_WORLD_M = 2;
export const HALF_VERTICAL_WORLD_M = 1;
export const FLOOR_ONLY_DECORATION_BAND_WORLD_M = 0.5;

export const TILE_FOOTPRINT_WIDTH_PX = 64;
export const PX_PER_WORLD_M = TILE_FOOTPRINT_WIDTH_PX;
export const FLOOR_FORESHORTENED_HEIGHT_PX = TILE_FOOTPRINT_WIDTH_PX / 2;

export const HALF_HEIGHT_CELL_SCALE =
  (FLOOR_FORESHORTENED_HEIGHT_PX + PX_PER_WORLD_M * HALF_VERTICAL_WORLD_M) / TILE_FOOTPRINT_WIDTH_PX;
export const FULL_HEIGHT_CELL_SCALE =
  (FLOOR_FORESHORTENED_HEIGHT_PX + PX_PER_WORLD_M * FULL_VERTICAL_WORLD_M) / TILE_FOOTPRINT_WIDTH_PX;

export const FLOOR_ONLY_CELL_PX = TILE_FOOTPRINT_WIDTH_PX;
export const HALF_HEIGHT_CELL_PX = Math.round(TILE_FOOTPRINT_WIDTH_PX * HALF_HEIGHT_CELL_SCALE);
export const FULL_HEIGHT_CELL_PX = Math.round(TILE_FOOTPRINT_WIDTH_PX * FULL_HEIGHT_CELL_SCALE);

export const ISO_FLOOR_ANCHOR_INSET_PX = FLOOR_FORESHORTENED_HEIGHT_PX / 2;
export const FLOOR_SURFACE_CENTER_OFFSET_FROM_CELL_BOTTOM_PX = ISO_FLOOR_ANCHOR_INSET_PX;
export const COLUMN_TOP_CENTER_OFFSET_FROM_CELL_TOP_PX = ISO_FLOOR_ANCHOR_INSET_PX;

export const ISO_FLOOR_TEXTURE_WIDTH_PX = TILE_FOOTPRINT_WIDTH_PX;
export const ISO_FLOOR_TEXTURE_HEIGHT_PX = FLOOR_FORESHORTENED_HEIGHT_PX;

/** Walk frame width (px) — same as {@link ISO_FLOOR_TEXTURE_WIDTH_PX} / one isometric footprint. */
export const CHARACTER_WALK_FRAME_WIDTH_PX = ISO_FLOOR_TEXTURE_WIDTH_PX;
/** Walk frame height (px) — **width:height = 2:5** (height = 2.5× width). */
export const CHARACTER_WALK_FRAME_HEIGHT_PX = Math.round(CHARACTER_WALK_FRAME_WIDTH_PX * 2.5);
/** @deprecated Prefer {@link CHARACTER_WALK_FRAME_WIDTH_PX} — width only (was square edge before tall frames). */
export const CHARACTER_WALK_FRAME_PX = CHARACTER_WALK_FRAME_WIDTH_PX;
export const CHARACTER_WALK_SHEET_WIDTH_PX = CHARACTER_WALK_FRAME_WIDTH_PX * 4;
export const CHARACTER_WALK_SHEET_HEIGHT_PX = CHARACTER_WALK_FRAME_HEIGHT_PX;

export const CHARACTER_WALK_FRAME_FEET_INSET_FROM_BOTTOM_PX = ISO_FLOOR_ANCHOR_INSET_PX;
