/**
 * Monster / hostile NPC walk-cycle preset — same strip geometry and frame ids as **`avatar-character`**
 * (`walk_0`…`walk_3`), distinct **`kind`** / **`preset`** for manifests and recipes.
 *
 * Subject: **fluffy dark fairy** with **giant claws** — readable small-scale isometric three-quarter view.
 *
 * @see `../merchant-character/merchant-character.ts`
 * @see `../../pipeline.ts`
 */

import type { GeneratorFrame } from "../../generators/types.ts";
import { renderCharacterWalkMockTileBuffer } from "../../generators/mock.ts";
import { buildRecipeId } from "../../manifest.ts";
import type { PipelinePreset } from "../../pipeline.ts";
import type { CreatePresetOptsBase } from "../../preset-contract.ts";
import {
  buildCharacterWalkStripSpritePrompt,
  CHARACTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT as CHARACTER_WALK_REWRITE_SYSTEM_BASE,
  CHARACTER_WALK_FRAME_COMPOSITION,
  CHARACTER_WALK_FRAME_PROMPT_SUFFIX,
  CHARACTER_WALK_SHEET_COMPOSITION,
  CHARACTER_WALK_SHEET_STYLE,
} from "../../prompt.ts";
import {
  CHARACTER_WALK_FRAME_HEIGHT_PX,
  CHARACTER_WALK_FRAME_PX,
  CHROMA_TOLERANCE_DEFAULT,
  CHARACTER_CHROMA_FRINGE_EDGE_DIST,
  CHARACTER_CHROMA_SPILL_MAX_DIST,
  DEFAULT_CHARACTER_FAL_ENDPOINT,
  defaultCharacterFalPipelinePartial,
} from "../lib/character-defaults.ts";
import { createCharacterStripPreset } from "../lib/character-preset.ts";
import {
  frameSheetCellsRowMajor,
  horizontalStripCrops,
  sheetDimensionsFromStrip,
  sheetLayoutFromStripCrops,
} from "../lib/sheet-spec.ts";

export const ASSET_ID = "monster-character";

/** Manifest `preset` field and `buildRecipeId` segment. */
export const MANIFEST_PRESET_ID = "character_monster_walk";

export const CHARACTER_MONSTER_PRESET_ID = MANIFEST_PRESET_ID;

/** Manifest `kind` for this walk sprite set (distinct from avatar / merchant). */
export const KIND = "character_monster_walk";

export const CHARACTER_MONSTER_KIND = KIND;

export const DEFAULT_STRATEGY = "sheet";

export const TILE_SIZE = CHARACTER_WALK_FRAME_PX;

export const TILE_HEIGHT = CHARACTER_WALK_FRAME_HEIGHT_PX;

export { CHROMA_TOLERANCE_DEFAULT };
export { CHARACTER_CHROMA_FRINGE_EDGE_DIST };
export { CHARACTER_CHROMA_SPILL_MAX_DIST };

/**
 * Same frame count, order, and ids as **`avatar-character`**.
 *
 * Identity strings for **`--mode live`** regen: fluffy dark fairy, oversized clawed hands, same silhouette in every frame.
 */
export const MONSTER_WALK_FRAMES: readonly GeneratorFrame[] = Object.freeze([
  {
    id: "walk_0",
    outSubdir: "walk_0",
    promptVariant:
      `Frame 1 of 4: idle standing — fluffy dark fairy creature with huge exaggerated claws, feet under body, not walking, isometric three-quarter view — same character as other frames.`,
  },
  {
    id: "walk_1",
    outSubdir: "walk_1",
    promptVariant:
      `Frame 2 of 4: walk contact left — left foot forward / weight on right, right foot back — same dark fairy monster as other frames.`,
  },
  {
    id: "walk_2",
    outSubdir: "walk_2",
    promptVariant:
      `Frame 3 of 4: walk passing / mid-stride, both feet under body — same dark fairy monster as other frames.`,
  },
  {
    id: "walk_3",
    outSubdir: "walk_3",
    promptVariant:
      `Frame 4 of 4: walk contact right — right foot forward / weight on left, left foot back — same dark fairy monster as other frames.`,
  },
]);

const _frameIds = MONSTER_WALK_FRAMES.map((f) => f.id);

export const SHEET_CROPS = horizontalStripCrops(_frameIds, TILE_SIZE, TILE_HEIGHT);

const _stripDims = sheetDimensionsFromStrip(_frameIds.length, TILE_SIZE, TILE_HEIGHT);
export const SHEET_WIDTH = _stripDims.sheetWidth;
export const SHEET_HEIGHT = _stripDims.sheetHeight;

export const MONSTER_FRAME_SHEET_CELLS = frameSheetCellsRowMajor(_frameIds, _frameIds.length);

export const MONSTER_SHEET_LAYOUT = sheetLayoutFromStripCrops(SHEET_CROPS, TILE_SIZE, TILE_HEIGHT);

export const DEFAULT_FAL_ENDPOINT = DEFAULT_CHARACTER_FAL_ENDPOINT;

export const MONSTER_WALK_FRAME_STYLE =
  `Illustrated ${TILE_SIZE}×${TILE_HEIGHT}px rectangular 2D **fluffy dark fairy** with **giant claws** in **isometric three-quarter view** — painterly or soft cel-shaded full-color art, readable at small scale, not pixel art or blocky pixels, not photoreal, not flat side-profile only, single frame. `;

export const MONSTER_FALSPRITE_SHEET_SUBJECT =
  `Illustrated full-color 2D game art (not pixel art), **isometric three-quarter view** with the same per-cell framing everywhere: figure centered on the vertical midline; **top of head 10%** down from top; **soles / ground contact 20%** above bottom (**W/4** clearance, same as mock); head/torso/leg proportions **~10/64**, **12/64**, **5/64** vs cell. ` +
  `**Fluffy dark fairy monster** (wings, shadowy fur or mane, **oversized clawed hands** — not the player hero): panel order **left to right** in **one** horizontal row only (1×4 strip — **not** a 2×4 grid, **not** two stacked rows of four): (1) idle standing — feet under hips, relaxed menacing pose, not mid-stride; ` +
  `(2) walk contact left; (3) walk passing / mid-stride; (4) walk contact right — one full-height pose per column, same creature identity.`;

export const MONSTER_WALK_SHEET_REWRITE_USER_SEED =
  "Illustrated 2D **fluffy dark fairy with giant claws** in isometric three-quarter view (painterly or cel-shaded, not pixel art): centered in frame; head top **10%** from top edge, feet ground line **20%** from bottom (mock pipeline / W/4 clearance); compact proportions like the reference mock; first beat is idle standing; then a three-step walk loop (contact left, passing, contact right) — single consistent monster silhouette, not the player avatar.";

/** OpenRouter system prompt: base falsprite four-beat rules plus isometric 3/4 staging (aligned with merchant preset). */
export const MONSTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT =
  CHARACTER_WALK_REWRITE_SYSTEM_BASE +
  " Staging: describe the character and motion as seen from a fixed isometric three-quarter camera (oblique, front plus one side readable — not a flat side profile). The performer should occupy the frame as if centered on the vertical midline: **top of head** near **10%** down from the top, **ground contact** near **20%** up from the bottom (same vertical bands as the pipeline mock, not equal 10% top and bottom)." +
  " Backdrop (match isometric floor strip rewrites): do **not** mention chroma keys, greenscreen, matting, or bright magenta/fuchsia as the background — one calm uniform flat backdrop only; **no** gutters, divider lines, or vertical bands between columns; **no** pink/purple glow or colored halos at the figure outline or along interior vertical boundaries." +
  " Layout: all four beats are **side by side** in one horizontal line — never choreograph as two horizontal rows of four poses (no upper/lower register).";

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
  if (typeof opts?.outBase !== "string" || !opts.outBase.trim()) {
    throw new Error(
      "createPreset(monster-character): outBase (non-empty string, absolute output directory) is required",
    );
  }

  const artUrlPrefix = opts.artUrlPrefix ?? "art/monster-character";
  const spriteRefJsonRelativePath = opts.spriteRefJsonRelativePath ?? "sprite-ref.json";
  const provenanceTool =
    opts.provenanceTool ?? "tools/sprite-generation/presets/monster-character/monster-character.ts";
  const provenanceVersion = opts.provenanceVersion ?? 1;

  const falBase = defaultCharacterFalPipelinePartial();

  return createCharacterStripPreset({
    outBase: opts.outBase,
    presetId: MANIFEST_PRESET_ID,
    kind: KIND,
    frames: MONSTER_WALK_FRAMES,
    prompt: {
      frameStyle: MONSTER_WALK_FRAME_STYLE,
      frameComposition: CHARACTER_WALK_FRAME_COMPOSITION,
      sheetStyle: CHARACTER_WALK_SHEET_STYLE,
      sheetComposition: CHARACTER_WALK_SHEET_COMPOSITION,
      sheetSubject: MONSTER_FALSPRITE_SHEET_SUBJECT,
      sheetRewriteUserPrompt: MONSTER_WALK_SHEET_REWRITE_USER_SEED,
      sheetPromptBuilder: (ctx) =>
        buildCharacterWalkStripSpritePrompt(
          ctx.rewrittenBase ?? MONSTER_FALSPRITE_SHEET_SUBJECT,
          ctx.sheetWidth,
          ctx.sheetHeight,
        ),
      framePromptSuffix: CHARACTER_WALK_FRAME_PROMPT_SUFFIX,
    },
    renderMockTileBuffer: (frame, ctx) =>
      renderCharacterWalkMockTileBuffer(
        frame,
        ctx.tileWidth ?? TILE_SIZE,
        ctx.tileHeight ?? TILE_HEIGHT,
      ),
    spriteRef: {
      kind: "gridFrameKeys",
      jsonRelativePath: spriteRefJsonRelativePath,
      sheetImageRelativePath: `${artUrlPrefix.replace(/\/$/, "")}/sheet.png`,
    },
    specsNaming: "sheet.png + sprite-ref.json (gridFrameKeys); no per-frame walk_* tiles",
    provenanceTool,
    provenanceVersion,
    fal: {
      ...falBase,
      sheetRewrite: {
        enabled: true,
        systemPrompt: MONSTER_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
      },
    },
  });
}
