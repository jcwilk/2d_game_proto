/**
 * **Drag-to-stuck HUD orb** — **1×4** horizontal strip (`gridFrameKeys` under `public/art/hud-drag-orb/`).
 *
 * ## Layout (normative)
 *
 * - **Sheet:** one row × four columns — **row-major** cells for strip indices **0–3**.
 * - **`sprite-ref.json` `frames`** (stable keys, match `specs/drag-stun-hud.md` §10):
 *   - **`idle`** — column 0, row 0 — idle / drag ghost (frame 0).
 *   - **`activate_1`** — column 1 — activation beat 1.
 *   - **`activate_2`** — column 2 — activation beat 2.
 *   - **`activate_3`** — column 3 — activation beat 3.
 *
 * **`MANIFEST_PRESET_ID`** is **`hud_drag_orb`**; directory / **`ASSET_ID`** is **`hud-drag-orb`** (registry slug).
 *
 * @see `../../../../specs/drag-stun-hud.md`
 * @see `../../README.md`
 */

import { NANO_BANANA2_DEFAULT_ASPECT_RATIO } from "../../generators/fal.ts";
import type { GeneratorFrame } from "../../generators/types.ts";
import { renderHudDragOrbMockTileBuffer } from "../../generators/mock.ts";
import { buildRecipeId } from "../../manifest.ts";
import type { PipelinePreset } from "../../pipeline.ts";
import type { CreatePresetOptsBase } from "../../preset-contract.ts";
import {
  DRAG_ORB_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
  DRAG_ORB_FALSPRITE_SHEET_SUBJECT,
  DRAG_ORB_FRAME_COMPOSITION,
  DRAG_ORB_FRAME_STYLE,
  DRAG_ORB_SHEET_REWRITE_USER_SEED,
  buildHudDragOrbStripSpritePrompt,
  interpolatePromptTemplate,
} from "../../prompt.ts";
import { nanoBanana2FalExtrasPerTile, nanoBanana2FalExtrasSheet } from "../lib/fal-nano-banana.ts";
import {
  frameSheetCellsRowMajor,
  horizontalStripCrops,
  sheetDimensionsFromStrip,
  sheetLayoutFromStripCrops,
  validateFrameCropCellCoverage,
} from "../lib/sheet-spec.ts";

export const ASSET_ID = "hud-drag-orb";

/** Manifest `preset` / `buildRecipeId` segment — underscores, stable. */
export const MANIFEST_PRESET_ID = "hud_drag_orb";

export const KIND = "hud_drag_orb_strip";

export const DEFAULT_STRATEGY = "sheet";

/** Square HUD cell edge (px); sheet = **4 × TILE_SIZE** wide. */
export const TILE_SIZE = 100;

export const DEFAULT_FAL_ENDPOINT = "fal-ai/nano-banana-2";

export const HUD_DRAG_ORB_FAL_EXTRAS_SHEET = nanoBanana2FalExtrasSheet({
  aspectRatio: NANO_BANANA2_DEFAULT_ASPECT_RATIO,
});

export const HUD_DRAG_ORB_FAL_EXTRAS_PER_TILE = nanoBanana2FalExtrasPerTile();

export const QA_SPRITE_W = 20;
export const QA_SPRITE_H = 20;

/**
 * Frames in **strip order** (left → right): idle, then activation **1–3**.
 * Ids are the stable **`sprite-ref.json`** keys.
 */
export const HUD_DRAG_ORB_FRAMES: readonly GeneratorFrame[] = Object.freeze([
  {
    id: "idle",
    outSubdir: "idle",
    promptVariant:
      `Frame 1 of 4 (**idle**): calm dormant orb — centered disk, subtle inner highlight, no burst or ring yet — draggable HUD affordance.`,
  },
  {
    id: "activate_1",
    outSubdir: "activate_1",
    promptVariant:
      `Frame 2 of 4 (**activate_1**): same orb; first activation beat — faint outer ring or brighter core, still compact.`,
  },
  {
    id: "activate_2",
    outSubdir: "activate_2",
    promptVariant:
      `Frame 3 of 4 (**activate_2**): same orb; stronger energy — clearer ring or glow, readable “charging” read.`,
  },
  {
    id: "activate_3",
    outSubdir: "activate_3",
    promptVariant:
      `Frame 4 of 4 (**activate_3**): same orb; peak flourish — brief burst / brightest ring before settling (still one centered glyph).`,
  },
]);

const FRAME_IDS = HUD_DRAG_ORB_FRAMES.map((f) => f.id);

const CROPS = horizontalStripCrops(FRAME_IDS, TILE_SIZE, TILE_SIZE);
const FRAME_SHEET_CELLS = frameSheetCellsRowMajor(FRAME_IDS, FRAME_IDS.length);
validateFrameCropCellCoverage(FRAME_IDS, CROPS, FRAME_SHEET_CELLS);

const { sheetWidth, sheetHeight } = sheetDimensionsFromStrip(FRAME_IDS.length, TILE_SIZE, TILE_SIZE);
const SHEET_LAYOUT = sheetLayoutFromStripCrops(CROPS, TILE_SIZE, TILE_SIZE);

export const SHEET_WIDTH = sheetWidth;
export const SHEET_HEIGHT = sheetHeight;
export const SHEET_CROPS: Readonly<Record<string, { x: number; y: number }>> = CROPS;

export function recipeId(mode: "mock" | "generate", strategy?: "per-tile" | "sheet"): string {
  return buildRecipeId({
    preset: MANIFEST_PRESET_ID,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
  });
}

export type CreateHudDragOrbPresetOpts = CreatePresetOptsBase;

export function createPreset(opts: CreateHudDragOrbPresetOpts): PipelinePreset {
  const outBase = opts?.outBase;
  if (typeof outBase !== "string" || !outBase.trim()) {
    throw new Error(
      "createPreset(hud-drag-orb): outBase (non-empty string, absolute output directory) is required",
    );
  }

  const artUrlPrefix = opts.artUrlPrefix ?? "art/hud-drag-orb";
  const spriteRefJsonRelativePath = opts.spriteRefJsonRelativePath ?? "sprite-ref.json";
  const provenanceTool = opts.provenanceTool ?? "tools/sprite-generation/presets/hud-drag-orb/hud-drag-orb.ts";
  const provenanceVersion = opts.provenanceVersion ?? 1;

  for (const f of HUD_DRAG_ORB_FRAMES) {
    if (!(f.id in SHEET_CROPS)) {
      throw new Error(`createPreset(hud-drag-orb): SHEET_CROPS missing entry for frame id "${f.id}"`);
    }
  }

  return {
    presetId: MANIFEST_PRESET_ID,
    kind: KIND,
    frames: [...HUD_DRAG_ORB_FRAMES],
    outBase,
    tileSize: TILE_SIZE,
    sheetGridSize: FRAME_IDS.length,
    sheetOnlyOutput: true,
    sheetNativeRaster: true,
    frameSheetCells: { ...FRAME_SHEET_CELLS },
    specsNaming: "sheet.png + sprite-ref.json (gridFrameKeys); drag orb 1×4 strip",
    sheet: {
      width: SHEET_WIDTH,
      height: SHEET_HEIGHT,
      crops: { ...SHEET_CROPS },
      rows: 1,
      columns: FRAME_IDS.length,
      spriteWidth: TILE_SIZE,
      spriteHeight: TILE_SIZE,
    },
    prompt: {
      frameStyle: DRAG_ORB_FRAME_STYLE,
      frameComposition: DRAG_ORB_FRAME_COMPOSITION,
      sheetSubject: DRAG_ORB_FALSPRITE_SHEET_SUBJECT,
      sheetRewriteUserPrompt: DRAG_ORB_SHEET_REWRITE_USER_SEED,
      sheetPromptBuilder: (ctx) => {
        const subject = interpolatePromptTemplate(DRAG_ORB_FALSPRITE_SHEET_SUBJECT, {
          tileSize: TILE_SIZE,
          chromaKeyHex: ctx.chromaKeyHex,
          sheetWidth: ctx.sheetWidth,
          sheetHeight: ctx.sheetHeight,
          cellWidth: Math.round(ctx.sheetWidth / 4),
          cellHeight: Math.round(ctx.sheetHeight),
        });
        const base =
          ctx.rewrittenBase && String(ctx.rewrittenBase).trim() ? String(ctx.rewrittenBase).trim() : subject;
        return buildHudDragOrbStripSpritePrompt(base, ctx.sheetWidth, ctx.sheetHeight);
      },
    },
    fal: {
      defaultEndpoint: DEFAULT_FAL_ENDPOINT,
      falExtrasPerTile: { ...HUD_DRAG_ORB_FAL_EXTRAS_PER_TILE },
      falExtrasSheet: { ...HUD_DRAG_ORB_FAL_EXTRAS_SHEET },
      chromaAfterBria: false,
      sheetRewrite: {
        enabled: true,
        systemPrompt: DRAG_ORB_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
      },
    },
    qa: { spriteWidth: QA_SPRITE_W, spriteHeight: QA_SPRITE_H },
    provenance: { tool: provenanceTool, version: provenanceVersion },
    generatorConfig: {
      tileBufferForFrame: (frame, c) =>
        renderHudDragOrbMockTileBuffer(frame, c.tileWidth ?? TILE_SIZE, c.tileHeight ?? TILE_SIZE),
      sheetLayout: SHEET_LAYOUT,
    },
    postprocessSteps: [],
    spriteRef: {
      kind: "gridFrameKeys",
      jsonRelativePath: spriteRefJsonRelativePath,
      sheetImageRelativePath: `${artUrlPrefix.replace(/\/$/, "")}/sheet.png`,
    },
  };
}
