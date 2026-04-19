/**
 * Shared defaults for **character walk** strip presets (horizontal 1×N cells): cell size from
 * {@link CHARACTER_WALK_FRAME_PX} / {@link CHARACTER_WALK_FRAME_HEIGHT_PX} in **`src/dimensions.ts`**
 * (via **`gameDimensions.ts`**), nano-banana fal extras, and typical chroma distances.
 *
 * Prompt copy and sheet-rewrite system text stay in each preset module (`avatar-character`, merchant, …).
 */

import { NANO_BANANA2_CHARACTER_WALK_STRIP_ASPECT_RATIO } from "../../generators/fal.ts";
import type { PipelinePreset } from "../../pipeline.ts";
import {
  nanoBanana2FalExtrasPerTile,
  nanoBanana2FalExtrasSheet,
} from "./fal-nano-banana.ts";

import {
  CHARACTER_WALK_FRAME_HEIGHT_PX,
  CHARACTER_WALK_FRAME_PX,
} from "../../gameDimensions.ts";

/** Re-export walk **cell** dimensions from **`src/dimensions.ts`** (sheet W×H depend on frame count). */
export {
  CHARACTER_WALK_FRAME_FEET_INSET_FROM_BOTTOM_PX,
  CHARACTER_WALK_FRAME_HEIGHT_PX,
  CHARACTER_WALK_FRAME_PX,
  CHARACTER_WALK_FRAME_WIDTH_PX,
} from "../../gameDimensions.ts";

/** Manifest / fal default for walk-style character presets. */
export const DEFAULT_CHARACTER_FAL_ENDPOINT = "fal-ai/nano-banana-2";

/**
 * Looser Euclidean distance **only** on pixels that border transparency (after main chroma).
 * Moderately above {@link CHROMA_TOLERANCE_DEFAULT}.
 */
export const CHARACTER_CHROMA_FRINGE_EDGE_DIST = 165;

/**
 * After silhouette peel: remove semi-transparent pixels within this distance of the key (opaque untouched).
 * **`0`** disables.
 */
export const CHARACTER_CHROMA_SPILL_MAX_DIST = 205;

/** Default Euclidean RGB distance for the main chroma pass (per-tile strategy). */
export const CHROMA_TOLERANCE_DEFAULT = 120;

/** Pixel size of one strip cell: **2:5** width:height walk frame. */
export function characterWalkStripCellDimensions(): { cellWidth: number; cellHeight: number } {
  return { cellWidth: CHARACTER_WALK_FRAME_PX, cellHeight: CHARACTER_WALK_FRAME_HEIGHT_PX };
}

/** png-analyze QA cell size (~¼ of frame width × height on each walk frame). */
export function defaultCharacterWalkQaSpriteSize(cellWidth: number, cellHeight: number): {
  spriteWidth: number;
  spriteHeight: number;
} {
  return {
    spriteWidth: Math.max(16, Math.round(cellWidth / 4)),
    spriteHeight: Math.max(8, Math.round(cellHeight / 4)),
  };
}

/** Sheet-side nano-banana extras: **`3:2`** strip aspect + low tier + expand/safety defaults. */
export function defaultCharacterFalExtrasSheet(): ReturnType<typeof nanoBanana2FalExtrasSheet> {
  return nanoBanana2FalExtrasSheet({
    aspectRatio: NANO_BANANA2_CHARACTER_WALK_STRIP_ASPECT_RATIO,
  });
}

/** Per-tile nano-banana extras: **1:1** + default resolution. */
export function defaultCharacterFalExtrasPerTile(): ReturnType<typeof nanoBanana2FalExtrasPerTile> {
  return nanoBanana2FalExtrasPerTile();
}

/**
 * Baseline **`fal`** block for character strips (endpoint, extras, BRIA-style chroma distances).
 * Does **not** set **`sheetRewrite`** — that stays identity-specific per preset.
 */
export function defaultCharacterFalPipelinePartial(): Pick<
  NonNullable<PipelinePreset["fal"]>,
  | "defaultEndpoint"
  | "falExtrasPerTile"
  | "falExtrasSheet"
  | "chromaAfterBria"
  | "chromaFringeEdgeDist"
  | "chromaSpillMaxDist"
> {
  return {
    defaultEndpoint: DEFAULT_CHARACTER_FAL_ENDPOINT,
    falExtrasPerTile: defaultCharacterFalExtrasPerTile(),
    falExtrasSheet: defaultCharacterFalExtrasSheet(),
    chromaAfterBria: false,
    chromaFringeEdgeDist: CHARACTER_CHROMA_FRINGE_EDGE_DIST,
    chromaSpillMaxDist: CHARACTER_CHROMA_SPILL_MAX_DIST,
  };
}
