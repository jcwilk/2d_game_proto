/**
 * Hostile NPC walk strip — same **`character_monster_walk`** contract as **`monster-character`**;
 * visual identity: **three-nosed armadillo** with **two extra arms on its back**.
 */

import { buildRecipeId } from "../../manifest.ts";
import type { PipelinePreset } from "../../pipeline.ts";
import type { CreatePresetOptsBase } from "../../preset-contract.ts";
import {
  buildMonsterWalkFrames,
  createMonsterWalkPreset,
  MONSTER_WALK_KIND,
  MONSTER_WALK_MANIFEST_PRESET_ID,
  type MonsterWalkIdentity,
  TILE_HEIGHT,
  TILE_SIZE,
} from "../lib/monster-walk-preset.ts";
import {
  frameSheetCellsRowMajor,
  horizontalStripCrops,
  sheetDimensionsFromStrip,
  sheetLayoutFromStripCrops,
} from "../lib/sheet-spec.ts";

export const ASSET_ID = "monster-armadillo";

export const MANIFEST_PRESET_ID = MONSTER_WALK_MANIFEST_PRESET_ID;

export const KIND = MONSTER_WALK_KIND;

export const DEFAULT_STRATEGY = "sheet";

export { TILE_SIZE, TILE_HEIGHT };

export { CHROMA_TOLERANCE_DEFAULT } from "../lib/monster-walk-preset.ts";
export { CHARACTER_CHROMA_FRINGE_EDGE_DIST } from "../lib/monster-walk-preset.ts";
export { CHARACTER_CHROMA_SPILL_MAX_DIST } from "../lib/monster-walk-preset.ts";

export { DEFAULT_FAL_ENDPOINT } from "../lib/monster-walk-preset.ts";

const IDENTITY: MonsterWalkIdentity = {
  framePromptVariants: [
    `Frame 1 of 4: idle standing — bizarre armadillo-like creature with **three distinct noses** on its snout and **two extra arms emerging from its upper back** (four arms total), feet under body, not mid-stride, isometric three-quarter view — same creature as other frames.`,
    `Frame 2 of 4: walk contact left — left foot forward / weight on right, right foot back — same three-nosed armadillo with back arms as other frames.`,
    `Frame 3 of 4: walk passing / mid-stride, both feet under body — same creature as other frames.`,
    `Frame 4 of 4: walk contact right — right foot forward / weight on left, left foot back — same creature as other frames.`,
  ],
  frameStyle:
    `Illustrated ${TILE_SIZE}×${TILE_HEIGHT}px rectangular 2D **three-nosed armadillo monster** with **two extra arms on its back** in **isometric three-quarter view** — painterly or soft cel-shaded full-color art, readable at small scale, not pixel art, not photoreal, single frame. `,
  sheetSubject:
    `Illustrated full-color 2D game art (not pixel art), **isometric three-quarter view**, same per-cell framing as the pipeline mock: figure centered; **top of head ~10%** from top; **ground contact ~20%** above bottom. ` +
    `**Three-nosed armadillo** creature with **two extra arms on its back** (four arms total), armored plates, expressive triple nose — **not** the player hero. One horizontal **1×4** strip only: (1) idle; (2) walk contact left; (3) walk passing; (4) walk contact right — same identity every column.`,
  sheetRewriteUserSeed:
    "Illustrated 2D **three-nosed armadillo with two extra arms on its back** in isometric three-quarter view: consistent silhouette across four walk beats (idle, contact left, passing, contact right); compact framing like the mock; menacing fantasy enemy.",
};

export const MONSTER_WALK_FRAMES = buildMonsterWalkFrames(IDENTITY);

const _frameIds = MONSTER_WALK_FRAMES.map((f) => f.id);

export const SHEET_CROPS = horizontalStripCrops(_frameIds, TILE_SIZE, TILE_HEIGHT);

const _stripDims = sheetDimensionsFromStrip(_frameIds.length, TILE_SIZE, TILE_HEIGHT);
export const SHEET_WIDTH = _stripDims.sheetWidth;
export const SHEET_HEIGHT = _stripDims.sheetHeight;

export const MONSTER_FRAME_SHEET_CELLS = frameSheetCellsRowMajor(_frameIds, _frameIds.length);

export const MONSTER_SHEET_LAYOUT = sheetLayoutFromStripCrops(SHEET_CROPS, TILE_SIZE, TILE_HEIGHT);

export function recipeId(mode: "mock" | "generate", strategy?: "per-tile" | "sheet"): string {
  return buildRecipeId({
    preset: MANIFEST_PRESET_ID,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
  });
}

export interface CreateMonsterArmadilloPresetOpts extends CreatePresetOptsBase {
  pngFilename?: string;
}

export function createPreset(opts: CreateMonsterArmadilloPresetOpts): PipelinePreset {
  const artUrlPrefix = opts.artUrlPrefix ?? "art/monster-armadillo";
  const provenanceTool =
    opts.provenanceTool ?? "tools/sprite-generation/presets/monster-armadillo/monster-armadillo.ts";

  return createMonsterWalkPreset({
    ...opts,
    artUrlPrefix,
    provenanceTool,
    identity: IDENTITY,
    createPresetErrorLabel: "createPreset(monster-armadillo)",
  });
}
