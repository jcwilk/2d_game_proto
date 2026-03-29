/**
 * Pixel layout for isometric **1m × 1m** floor tiles and **2m** verticals (walls, figures, pillars).
 * Runtime and sprite generators share numbers with **`tools/sprite-generation/gameDimensions.mjs`** (`dimensions.sync.test.ts`).
 *
 * **Square art cells** — `TILE_FOOTPRINT_WIDTH_PX` (**W**) is the **1m footprint** width in px. Tier **square side lengths** are **W**, **1.5W**, **2.5W** (half/full cells are larger than W on purpose).
 * - Foreshortened floor diamond height = **W/2** (`FLOOR_FORESHORTENED_HEIGHT_PX`).
 * - **halfHeight** / **fullHeight** scales below = `(floor band + N·px/m) / W` with N = {@link HALF_VERTICAL_WORLD_M} or {@link FULL_VERTICAL_WORLD_M}.
 * - **floorOnly** **W×W**: bottom **W/2** is the floor; upper band ≈ **0.5m** world for decals (`FLOOR_ONLY_DECORATION_BAND_WORLD_M` — world-space label for prompts, not a px input here).
 *
 * **Anchors** (cell **bottom center**, +Y down): floor stand and column-top reference are **W/4** from bottom / top — the **midpoint of the foreshortened floor band** `(W/2)/2`, not a separate fudge factor.
 *
 * **Runtime placement (Excalibur, +Y down):** use a fixed world **`cellBottomCenter`** for the tile’s bottom-middle corner. Draw the floor texture with graphic anchor **bottom-center** `(0.5, 1)` at `cellBottomCenter`. Place characters (anchor bottom-center) at **`cellBottomCenter.y − {@link FLOOR_SURFACE_CENTER_OFFSET_FROM_CELL_BOTTOM_PX}`** so feet sit on the floor stand point — do not align sprite image centers to each other.
 */

/** Ground tile width in world space (meters). */
export const TILE_WORLD_M = 1;

/** Typical full-height vertical (human, wall, pillar) in world space (meters). */
export const FULL_VERTICAL_WORLD_M = 2;

/** Max vertical extent (meters) for props that fit in {@link halfHeightCell}. */
export const HALF_VERTICAL_WORLD_M = 1;

/** World height (meters) of the upper band in a floor-only cell (above the foreshortened floor). */
export const FLOOR_ONLY_DECORATION_BAND_WORLD_M = 0.5;

/**
 * Horizontal span (px) of one **1m** isometric floor footprint — sets px/m for art and runtime.
 */
export const TILE_FOOTPRINT_WIDTH_PX = 64;

/** Pixels per world meter on axes aligned to the footprint (1m ≡ this many px). */
export const PX_PER_WORLD_M = TILE_FOOTPRINT_WIDTH_PX;

/**
 * Vertical extent (px) of the **foreshortened** floor diamond — half of {@link TILE_FOOTPRINT_WIDTH_PX}.
 */
export const FLOOR_FORESHORTENED_HEIGHT_PX = TILE_FOOTPRINT_WIDTH_PX / 2;

/**
 * `(foreshortened floor + HALF_VERTICAL_WORLD_M·px/m) / footprint` → **1.5** at current literals.
 */
export const HALF_HEIGHT_CELL_SCALE =
  (FLOOR_FORESHORTENED_HEIGHT_PX + PX_PER_WORLD_M * HALF_VERTICAL_WORLD_M) / TILE_FOOTPRINT_WIDTH_PX;

/**
 * `(foreshortened floor + FULL_VERTICAL_WORLD_M·px/m) / footprint` → **2.5** at current literals.
 */
export const FULL_HEIGHT_CELL_SCALE =
  (FLOOR_FORESHORTENED_HEIGHT_PX + PX_PER_WORLD_M * FULL_VERTICAL_WORLD_M) / TILE_FOOTPRINT_WIDTH_PX;

export type IsoCellTier = 'floorOnly' | 'halfHeight' | 'fullHeight';

export interface IsoSquareCell {
  readonly tier: IsoCellTier;
  /** Square side length in px (width = height). */
  readonly sizePx: number;
}

/**
 * Square side length (px) for a tier — single source for {@link floorOnlyCell} / {@link halfHeightCell} / {@link fullHeightCell}.
 */
export function isoSquareCellSizePx(tier: IsoCellTier): number {
  switch (tier) {
    case 'floorOnly':
      return TILE_FOOTPRINT_WIDTH_PX;
    case 'halfHeight':
      return Math.round(TILE_FOOTPRINT_WIDTH_PX * HALF_HEIGHT_CELL_SCALE);
    case 'fullHeight':
      return Math.round(TILE_FOOTPRINT_WIDTH_PX * FULL_HEIGHT_CELL_SCALE);
  }
}

export const floorOnlyCell: IsoSquareCell = {
  tier: 'floorOnly',
  sizePx: isoSquareCellSizePx('floorOnly'),
};

export const halfHeightCell: IsoSquareCell = {
  tier: 'halfHeight',
  sizePx: isoSquareCellSizePx('halfHeight'),
};

export const fullHeightCell: IsoSquareCell = {
  tier: 'fullHeight',
  sizePx: isoSquareCellSizePx('fullHeight'),
};

/**
 * Half the foreshortened floor band: **floor surface center** from cell bottom, and **column top reference**
 * from cell top (symmetric). Equals {@link FLOOR_FORESHORTENED_HEIGHT_PX} `/ 2`.
 */
export const ISO_FLOOR_ANCHOR_INSET_PX = FLOOR_FORESHORTENED_HEIGHT_PX / 2;

/** Distance from cell bottom center to floor stand / rhombus centroid. Same as {@link ISO_FLOOR_ANCHOR_INSET_PX}. */
export const FLOOR_SURFACE_CENTER_OFFSET_FROM_CELL_BOTTOM_PX = ISO_FLOOR_ANCHOR_INSET_PX;

/** Distance from cell top center down to full-column top reference. Same as {@link ISO_FLOOR_ANCHOR_INSET_PX}. */
export const COLUMN_TOP_CENTER_OFFSET_FROM_CELL_TOP_PX = ISO_FLOOR_ANCHOR_INSET_PX;

/** One walk frame edge: **2×2** sheet inscribed in {@link fullHeightCell}. */
export const CHARACTER_WALK_FRAME_PX = fullHeightCell.sizePx / 2;

/** Nominal walk sheet (2×2 frames). */
export const CHARACTER_WALK_SHEET_PX = CHARACTER_WALK_FRAME_PX * 2;

/**
 * Leave this many px **empty below the feet** in each walk frame bitmap so the figure sits in the cell volume,
 * not on the texture edge — matches {@link ISO_FLOOR_ANCHOR_INSET_PX} (same **W/4** as floor stand offset from cell bottom).
 * Live T2I / hand art should follow the same inset for grid alignment with {@link FLOOR_SURFACE_CENTER_OFFSET_FROM_CELL_BOTTOM_PX}.
 */
export const CHARACTER_WALK_FRAME_FEET_INSET_FROM_BOTTOM_PX = ISO_FLOOR_ANCHOR_INSET_PX;

/** Square floor texture cell (rhombus drawn inside); same as footprint width. */
export const ISO_FLOOR_TEXTURE_CELL_PX = TILE_FOOTPRINT_WIDTH_PX;

/**
 * Side-view / walk sprite: feet offset from graphic center (fraction of sprite height); tune per art.
 */
export const CHARACTER_FEET_OFFSET_FRACTION_OF_SPRITE_HEIGHT = 0.48;

export function characterFeetOffsetFromSpriteCenterPx(spriteHeightPx: number): number {
  return spriteHeightPx * CHARACTER_FEET_OFFSET_FRACTION_OF_SPRITE_HEIGHT;
}

/**
 * Uniform scale so a loaded graphic’s **width** matches `targetWidthPx` (native width from texture).
 */
export function scaleToTargetWidthPx(nativeWidthPx: number, targetWidthPx: number): number {
  if (nativeWidthPx <= 0) {
    throw new Error(`scaleToTargetWidthPx: nativeWidthPx must be positive, got ${nativeWidthPx}`);
  }
  return targetWidthPx / nativeWidthPx;
}
