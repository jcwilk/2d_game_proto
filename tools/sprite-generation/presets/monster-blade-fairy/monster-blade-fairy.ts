/**
 * Hostile NPC walk strip — same **`character_monster_walk`** contract as **`monster-character`**;
 * visual identity: **elderly fairy woman** whose **face is composed of blades / knife edges** (unsettling, readable).
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

export const ASSET_ID = "monster-blade-fairy";

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
    `Frame 1 of 4: idle standing — **old fairy woman**, hunched elegant silhouette, **face made of overlapping metal blades / knife facets** (still readable eyes), small fairy wings, feet under body, not mid-stride, isometric three-quarter view — same character as other frames.`,
    `Frame 2 of 4: walk contact left — left foot forward — same blade-faced fairy as other frames.`,
    `Frame 3 of 4: walk passing / mid-stride — same character as other frames.`,
    `Frame 4 of 4: walk contact right — right foot forward — same blade-faced fairy as other frames.`,
  ],
  frameStyle:
    `Illustrated ${TILE_SIZE}×${TILE_HEIGHT}px rectangular 2D **elderly fairy** with a **face constructed from blades** in **isometric three-quarter view** — painterly or cel-shaded, fantasy-horror tone, readable at small scale, not gore, not photoreal, single frame. `,
  sheetSubject:
    `Illustrated full-color 2D game art (not pixel art), **isometric three-quarter view**, mock framing: **top of head ~10%**, **soles ~20%** above bottom. ` +
    `**Old fairy woman** antagonist: **facial features formed from blades / sharpened metal planes** (stylized, not explicit injury), fairy wings, tattered elegant dress — **not** the player hero. One **1×4** strip: (1) idle; (2–4) walk loop — same identity each column.`,
  sheetRewriteUserSeed:
    "Illustrated 2D **old fairy woman with a blade-made face** in isometric three-quarter view: four-beat walk; unsettling but game-appropriate; consistent silhouette; dark fantasy enemy.",
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

export interface CreateMonsterBladeFairyPresetOpts extends CreatePresetOptsBase {
  pngFilename?: string;
}

export function createPreset(opts: CreateMonsterBladeFairyPresetOpts): PipelinePreset {
  const artUrlPrefix = opts.artUrlPrefix ?? "art/monster-blade-fairy";
  const provenanceTool =
    opts.provenanceTool ?? "tools/sprite-generation/presets/monster-blade-fairy/monster-blade-fairy.ts";

  return createMonsterWalkPreset({
    ...opts,
    artUrlPrefix,
    provenanceTool,
    identity: IDENTITY,
    createPresetErrorLabel: "createPreset(monster-blade-fairy)",
  });
}
