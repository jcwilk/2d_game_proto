/**
 * Monster / hostile NPC walk-cycle preset — same strip geometry and frame ids as **`avatar-character`**
 * (`walk_0`…`walk_3`), distinct **`kind`** / **`preset`** for manifests and recipes.
 *
 * Subject: **fluffy dark fairy** with **giant claws** — readable small-scale isometric three-quarter view.
 *
 * @see `../merchant-character/merchant-character.ts`
 * @see `../../pipeline.ts`
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

export const ASSET_ID = "monster-character";

/** Manifest `preset` field and `buildRecipeId` segment. */
export const MANIFEST_PRESET_ID = MONSTER_WALK_MANIFEST_PRESET_ID;

export const CHARACTER_MONSTER_PRESET_ID = MANIFEST_PRESET_ID;

/** Manifest `kind` for this walk sprite set (distinct from avatar / merchant). */
export const KIND = MONSTER_WALK_KIND;

export const CHARACTER_MONSTER_KIND = KIND;

export const DEFAULT_STRATEGY = "sheet";

export { TILE_SIZE };
export { TILE_HEIGHT };

export { CHROMA_TOLERANCE_DEFAULT } from "../lib/monster-walk-preset.ts";
export { CHARACTER_CHROMA_FRINGE_EDGE_DIST } from "../lib/monster-walk-preset.ts";
export { CHARACTER_CHROMA_SPILL_MAX_DIST } from "../lib/monster-walk-preset.ts";

export { DEFAULT_FAL_ENDPOINT } from "../lib/monster-walk-preset.ts";

const FAIRY_IDENTITY: MonsterWalkIdentity = {
  framePromptVariants: [
    `Frame 1 of 4: idle standing — fluffy dark fairy creature with huge exaggerated claws, feet under body, not walking, isometric three-quarter view — same character as other frames.`,
    `Frame 2 of 4: walk contact left — left foot forward / weight on right, right foot back — same dark fairy monster as other frames.`,
    `Frame 3 of 4: walk passing / mid-stride, both feet under body — same dark fairy monster as other frames.`,
    `Frame 4 of 4: walk contact right — right foot forward / weight on left, left foot back — same dark fairy monster as other frames.`,
  ],
  frameStyle:
    `Illustrated ${TILE_SIZE}×${TILE_HEIGHT}px rectangular 2D **fluffy dark fairy** with **giant claws** in **isometric three-quarter view** — painterly or soft cel-shaded full-color art, readable at small scale, not pixel art or blocky pixels, not photoreal, not flat side-profile only, single frame. `,
  sheetSubject:
    `Illustrated full-color 2D game art (not pixel art), **isometric three-quarter view** with the same per-cell framing everywhere: figure centered on the vertical midline; **top of head 10%** down from top; **soles / ground contact 20%** above bottom (**W/4** clearance, same as mock); head/torso/leg proportions **~10/64**, **12/64**, **5/64** vs cell. ` +
    `**Fluffy dark fairy monster** (wings, shadowy fur or mane, **oversized clawed hands** — not the player hero): panel order **left to right** in **one** horizontal row only (1×4 strip — **not** a 2×4 grid, **not** two stacked rows of four): (1) idle standing — feet under hips, relaxed menacing pose, not mid-stride; ` +
    `(2) walk contact left; (3) walk passing / mid-stride; (4) walk contact right — one full-height pose per column, same creature identity.`,
  sheetRewriteUserSeed:
    "Illustrated 2D **fluffy dark fairy with giant claws** in isometric three-quarter view (painterly or cel-shaded, not pixel art): centered in frame; head top **10%** from top edge, feet ground line **20%** from bottom (mock pipeline / W/4 clearance); compact proportions like the reference mock; first beat is idle standing; then a three-step walk loop (contact left, passing, contact right) — single consistent monster silhouette, not the player avatar.",
};

/**
 * Same frame count, order, and ids as **`avatar-character`**.
 *
 * Identity strings for **`--mode live`** regen: fluffy dark fairy, oversized clawed hands, same silhouette in every frame.
 */
export const MONSTER_WALK_FRAMES = buildMonsterWalkFrames(FAIRY_IDENTITY);

const _frameIds = MONSTER_WALK_FRAMES.map((f) => f.id);

export const SHEET_CROPS = horizontalStripCrops(_frameIds, TILE_SIZE, TILE_HEIGHT);

const _stripDims = sheetDimensionsFromStrip(_frameIds.length, TILE_SIZE, TILE_HEIGHT);
export const SHEET_WIDTH = _stripDims.sheetWidth;
export const SHEET_HEIGHT = _stripDims.sheetHeight;

export const MONSTER_FRAME_SHEET_CELLS = frameSheetCellsRowMajor(_frameIds, _frameIds.length);

export const MONSTER_SHEET_LAYOUT = sheetLayoutFromStripCrops(SHEET_CROPS, TILE_SIZE, TILE_HEIGHT);

export const MONSTER_WALK_FRAME_STYLE = FAIRY_IDENTITY.frameStyle;

export const MONSTER_FALSPRITE_SHEET_SUBJECT = FAIRY_IDENTITY.sheetSubject;

export const MONSTER_WALK_SHEET_REWRITE_USER_SEED = FAIRY_IDENTITY.sheetRewriteUserSeed;

export { MONSTER_WALK_SHEET_REWRITE_SYSTEM_PROMPT as MONSTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT } from "../lib/monster-walk-preset.ts";

export function recipeId(mode: "mock" | "generate", strategy?: "per-tile" | "sheet"): string {
  return buildRecipeId({
    preset: MANIFEST_PRESET_ID,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
  });
}

export interface CreateMonsterCharacterPresetOpts extends CreatePresetOptsBase {
  pngFilename?: string;
}

export function createPreset(opts: CreateMonsterCharacterPresetOpts): PipelinePreset {
  const artUrlPrefix = opts.artUrlPrefix ?? "art/monster-character";
  const provenanceTool =
    opts.provenanceTool ?? "tools/sprite-generation/presets/monster-character/monster-character.ts";

  return createMonsterWalkPreset({
    ...opts,
    artUrlPrefix,
    provenanceTool,
    identity: FAIRY_IDENTITY,
    createPresetErrorLabel: "createPreset(monster-character)",
  });
}
