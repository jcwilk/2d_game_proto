/**
 * Hostile NPC walk strip — same **`character_monster_walk`** contract as **`monster-character`**;
 * visual identity: **gliding jellyfish** built from **strawberries**, drifting through the air.
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

export const ASSET_ID = "monster-strawberry-jellyfish";

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
    `Frame 1 of 4: idle **floating / gliding** — jellyfish bell and tentacles made of **strawberries and strawberry seeds**, calm aerial hover (not walking on ground), lowest vertical bob, isometric three-quarter view — same creature as other frames.`,
    `Frame 2 of 4: glide beat left — body shifted as if drifting left while airborne, tentacle motion — same strawberry jellyfish as other frames.`,
    `Frame 3 of 4: glide mid-bob — neutral drift pose between beats — same creature as other frames.`,
    `Frame 4 of 4: glide beat right — body shifted as if drifting right while airborne — same strawberry jellyfish as other frames.`,
  ],
  frameStyle:
    `Illustrated ${TILE_SIZE}×${TILE_HEIGHT}px rectangular 2D **airborne jellyfish made of strawberries** in **isometric three-quarter view** — glossy fruit segments, translucent jelly cues, painterly full-color, readable at small scale, not pixel art, single frame. `,
  sheetSubject:
    `Illustrated full-color 2D game art (not pixel art), **isometric three-quarter view**, same vertical bands as mock (**head/top ~10%**, **lowest tentacle / body mass ~20%** above bottom). ` +
    `**Gliding jellyfish** whose bell, lobes, and tendrils read as **strawberries** (red fruit, seeds, leafy hints), **flying through air** — **not** the player. One **1×4** horizontal strip: (1) idle hover; (2–4) three-beat **aerial glide loop** mapped to walk timing — same silhouette and material every column.`,
  sheetRewriteUserSeed:
    "Illustrated 2D **strawberry jellyfish gliding in the air** in isometric three-quarter view: four-frame motion loop (idle float + glide phases); fruity jellyfish body, readable at small scale; consistent fantasy enemy.",
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

export interface CreateMonsterStrawberryJellyfishPresetOpts extends CreatePresetOptsBase {
  pngFilename?: string;
}

export function createPreset(opts: CreateMonsterStrawberryJellyfishPresetOpts): PipelinePreset {
  const artUrlPrefix = opts.artUrlPrefix ?? "art/monster-strawberry-jellyfish";
  const provenanceTool =
    opts.provenanceTool ??
    "tools/sprite-generation/presets/monster-strawberry-jellyfish/monster-strawberry-jellyfish.ts";

  return createMonsterWalkPreset({
    ...opts,
    artUrlPrefix,
    provenanceTool,
    identity: IDENTITY,
    createPresetErrorLabel: "createPreset(monster-strawberry-jellyfish)",
  });
}
