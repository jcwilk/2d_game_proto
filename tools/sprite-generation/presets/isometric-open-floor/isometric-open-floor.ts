/**
 * Isometric open-floor tile preset — **1×4** horizontal strip of rhombus floor variants (`gridFrameKeys` under `public/art/isometric-open-floor/`).
 *
 * Each cell is **W×(W/2)** px (width = footprint **1m**, height = foreshortened band) — see **`ISO_FLOOR_TEXTURE_WIDTH_PX`** /
 * **`ISO_FLOOR_TEXTURE_HEIGHT_PX`** in **`src/dimensions.ts`** (via **`gameDimensions.ts`**). The rhombus is **flush to all four
 * cell edges** (vertices on edge midpoints); see **`isoFloorRhombusVerticesRect`** in **`generators/mock.ts`**.
 *
 * **Live T2I:** **`fal-ai/nano-banana-2`** with **8∶1** + **`0.5K`**. **`sheet.png`** is stored at **native** fal/BRIA pixel dimensions (no pipeline resize); **`sprite-ref.json`** grid cell size is derived from the raster. The game scales to logical layout with smooth filtering.
 *
 * @see `../../README.md`
 * @see `../../pipeline.ts`
 */

import {
  NANO_BANANA2_DEFAULT_RESOLUTION,
  NANO_BANANA2_FLOOR_STRIP_ASPECT_RATIO,
  NANO_BANANA2_LOW_RESOLUTION,
} from "../../generators/fal.ts";
import type { GeneratorFrame } from "../../generators/types.ts";
import { renderIsometricFloorMockTileBuffer } from "../../generators/mock.ts";
import { buildRecipeId } from "../../manifest.ts";
import type { PipelinePreset } from "../../pipeline.ts";
import type { CreatePresetOptsBase } from "../../preset-contract.ts";
import {
  buildIsometricFloorStripSpritePrompt,
  interpolatePromptTemplate,
  ISO_FLOOR_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
  ISO_FLOOR_FALSPRITE_SHEET_SUBJECT,
  ISO_FLOOR_FRAME_COMPOSITION,
  ISO_FLOOR_FRAME_PROMPT_SUFFIX,
  ISO_FLOOR_FRAME_STYLE,
  ISO_FLOOR_SHEET_REWRITE_USER_SEED,
} from "../../prompt.ts";
import { ISO_FLOOR_TEXTURE_HEIGHT_PX, ISO_FLOOR_TEXTURE_WIDTH_PX } from "../../gameDimensions.ts";
import { sheetLayoutFromCropsRect } from "../../sheet-layout.ts";

export const ASSET_ID = "isometric-open-floor";

export const MANIFEST_PRESET_ID = "isometric_open_floor";

export const KIND = "isometric_floor_tile_set";

export const DEFAULT_STRATEGY = "sheet";

/** Cell width (px) — 1m footprint. */
export const TILE_WIDTH = ISO_FLOOR_TEXTURE_WIDTH_PX;

/** Cell height (px) — half of width; matches foreshortened floor band. */
export const TILE_HEIGHT = ISO_FLOOR_TEXTURE_HEIGHT_PX;

/** Pipeline **`tileSize`** = cell width (Excalibur scales from native width to {@link TILE_WIDTH} at runtime). */
export const TILE_SIZE = TILE_WIDTH;

export const SHEET_WIDTH = TILE_WIDTH * 4;
export const SHEET_HEIGHT = TILE_HEIGHT;

export const DEFAULT_FAL_ENDPOINT = "fal-ai/nano-banana-2";

export const ISO_FLOOR_FAL_EXTRAS_SHEET = {
  aspect_ratio: NANO_BANANA2_FLOOR_STRIP_ASPECT_RATIO,
  resolution: NANO_BANANA2_LOW_RESOLUTION,
  expand_prompt: true,
  safety_tolerance: 2,
};

export const ISO_FLOOR_FAL_EXTRAS_PER_TILE = {
  aspect_ratio: "1:1",
  resolution: NANO_BANANA2_DEFAULT_RESOLUTION,
};

export const QA_SPRITE_W = 16;
export const QA_SPRITE_H = Math.max(8, Math.round(TILE_HEIGHT / 4));

export const ISO_FLOOR_FRAMES: readonly GeneratorFrame[] = Object.freeze([
  {
    id: "floor_0",
    outSubdir: "floor_0",
    promptVariant:
      `Variation A of 4: clean open floor with only fine grain — same flush-edge rhombus as other cells (${TILE_WIDTH}×${TILE_HEIGHT}px cell).`,
  },
  {
    id: "floor_1",
    outSubdir: "floor_1",
    promptVariant:
      `Variation B of 4: a few short hairline cracks — same rhombus footprint and palette family as other cells.`,
  },
  {
    id: "floor_2",
    outSubdir: "floor_2",
    promptVariant:
      `Variation C of 4: light scattered grit or tiny pebbles — same geometry, no raised objects.`,
  },
  {
    id: "floor_3",
    outSubdir: "floor_3",
    promptVariant:
      `Variation D of 4: slightly darker worn patch toward the bottom of the rhombus — same outline for tiling.`,
  },
]);

export const SHEET_CROPS: Readonly<Record<string, { x: number; y: number }>> = Object.freeze({
  floor_0: { x: 0, y: 0 },
  floor_1: { x: TILE_WIDTH, y: 0 },
  floor_2: { x: TILE_WIDTH * 2, y: 0 },
  floor_3: { x: TILE_WIDTH * 3, y: 0 },
});

export const ISO_FLOOR_FRAME_SHEET_CELLS: Readonly<Record<string, { column: number; row: number }>> = Object.freeze({
  floor_0: { column: 0, row: 0 },
  floor_1: { column: 1, row: 0 },
  floor_2: { column: 2, row: 0 },
  floor_3: { column: 3, row: 0 },
});

export const ISO_FLOOR_SHEET_LAYOUT: Readonly<Record<string, { x: number; y: number }>> = Object.freeze(
  sheetLayoutFromCropsRect(SHEET_CROPS, TILE_WIDTH, TILE_HEIGHT),
);

export function recipeId(mode: "mock" | "generate", strategy?: "per-tile" | "sheet"): string {
  return buildRecipeId({
    preset: MANIFEST_PRESET_ID,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
  });
}

export type CreateIsoFloorPresetOpts = CreatePresetOptsBase;

export function createPreset(opts: CreateIsoFloorPresetOpts): PipelinePreset {
  const outBase = opts?.outBase;
  if (typeof outBase !== "string" || !outBase.trim()) {
    throw new Error("createPreset(isometric-open-floor): outBase (non-empty string, absolute output directory) is required");
  }

  const artUrlPrefix = opts.artUrlPrefix ?? "art/isometric-open-floor";
  const spriteRefJsonRelativePath = opts.spriteRefJsonRelativePath ?? "sprite-ref.json";
  const provenanceTool =
    opts.provenanceTool ?? "tools/sprite-generation/presets/isometric-open-floor/isometric-open-floor.ts";
  const provenanceVersion = opts.provenanceVersion ?? 1;

  for (const f of ISO_FLOOR_FRAMES) {
    if (!(f.id in SHEET_CROPS)) {
      throw new Error(`createPreset(isometric-open-floor): SHEET_CROPS missing entry for frame id "${f.id}"`);
    }
  }

  return {
    presetId: MANIFEST_PRESET_ID,
    kind: KIND,
    frames: [...ISO_FLOOR_FRAMES],
    outBase,
    tileSize: TILE_SIZE,
    tileHeight: TILE_HEIGHT,
    sheetGridSize: 4,
    sheetOnlyOutput: true,
    sheetNativeRaster: true,
    frameSheetCells: { ...ISO_FLOOR_FRAME_SHEET_CELLS },
    specsNaming: "sheet.png + sprite-ref.json (gridFrameKeys); no per-frame floor PNGs",
    sheet: {
      width: SHEET_WIDTH,
      height: SHEET_HEIGHT,
      crops: { ...SHEET_CROPS },
      rows: 1,
      columns: 4,
      spriteWidth: TILE_WIDTH,
      spriteHeight: TILE_HEIGHT,
    },
    prompt: {
      frameStyle: ISO_FLOOR_FRAME_STYLE,
      frameComposition: ISO_FLOOR_FRAME_COMPOSITION,
      sheetSubject: ISO_FLOOR_FALSPRITE_SHEET_SUBJECT,
      sheetRewriteUserPrompt: ISO_FLOOR_SHEET_REWRITE_USER_SEED,
      sheetPromptBuilder: (ctx) => {
        const cellW = Math.round(ctx.sheetWidth / 4);
        const cellH = Math.round(ctx.sheetHeight);
        const subject = interpolatePromptTemplate(ISO_FLOOR_FALSPRITE_SHEET_SUBJECT, {
          tileSize: cellW,
          chromaKeyHex: ctx.chromaKeyHex,
          cellWidth: cellW,
          cellHeight: cellH,
          sheetWidth: ctx.sheetWidth,
          sheetHeight: ctx.sheetHeight,
        });
        const base = ctx.rewrittenBase && String(ctx.rewrittenBase).trim() ? String(ctx.rewrittenBase).trim() : subject;
        return buildIsometricFloorStripSpritePrompt(base, ctx.sheetWidth, ctx.sheetHeight);
      },
      framePromptSuffix: ISO_FLOOR_FRAME_PROMPT_SUFFIX,
    },
    fal: {
      defaultEndpoint: DEFAULT_FAL_ENDPOINT,
      falExtrasPerTile: { ...ISO_FLOOR_FAL_EXTRAS_PER_TILE },
      falExtrasSheet: { ...ISO_FLOOR_FAL_EXTRAS_SHEET },
      chromaAfterBria: false,
      sheetRewrite: {
        enabled: true,
        systemPrompt: ISO_FLOOR_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
      },
    },
    qa: { spriteWidth: QA_SPRITE_W, spriteHeight: QA_SPRITE_H },
    provenance: { tool: provenanceTool, version: provenanceVersion },
    generatorConfig: {
      tileBufferForFrame: (frame, c) =>
        renderIsometricFloorMockTileBuffer(frame, c.tileWidth ?? TILE_WIDTH, c.tileHeight ?? TILE_HEIGHT),
      sheetLayout: ISO_FLOOR_SHEET_LAYOUT,
    },
    postprocessSteps: [],
    spriteRef: {
      kind: "gridFrameKeys",
      jsonRelativePath: spriteRefJsonRelativePath,
      sheetImageRelativePath: `${artUrlPrefix.replace(/\/$/, "")}/sheet.png`,
    },
  };
}
