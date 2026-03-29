/**
 * Isometric open-floor tile preset — 2×2 sheet of rhombus floor variants (`gridFrameKeys` under `public/art/isometric-open-floor/`).
 *
 * Geometry: texture cell = **`ISO_FLOOR_TEXTURE_CELL_PX`** from **`gameDimensions.mjs`** (1m footprint in
 * **`src/dimensions.ts`**). The walkable tile is a **foreshortened rhombus** in pixels — see **`isoFloorRhombusVertices`**
 * in **`generators/mock.mjs`**. Live T2I prompts match this footprint.
 *
 * @see `../../README.md`
 * @see `../../pipeline.mjs`
 */

import {
  NANO_BANANA2_DEFAULT_RESOLUTION,
  NANO_BANANA2_LOW_RESOLUTION,
  NANO_BANANA2_SQUARE_ASPECT_RATIO,
} from "../../generators/fal.mjs";
import { renderIsometricFloorMockTileBuffer } from "../../generators/mock.mjs";
import { buildRecipeId } from "../../manifest.mjs";
import {
  buildIsometricFloorGridSpritePrompt,
  ISO_FLOOR_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
  ISO_FLOOR_FALSPRITE_SHEET_SUBJECT,
  ISO_FLOOR_FRAME_COMPOSITION,
  ISO_FLOOR_FRAME_PROMPT_SUFFIX,
  ISO_FLOOR_FRAME_STYLE,
  ISO_FLOOR_SHEET_REWRITE_USER_SEED,
} from "../../prompt.mjs";
import { ISO_FLOOR_TEXTURE_CELL_PX } from "../../gameDimensions.mjs";
import { sheetLayoutFromCrops } from "../../sheet-layout.mjs";

export const ASSET_ID = "isometric-open-floor";

export const MANIFEST_PRESET_ID = "isometric_open_floor";

export const KIND = "isometric_floor_tile_set";

export const DEFAULT_STRATEGY = "sheet";

/** Square texture cell for one floor tile (1m footprint); matches **`TILE_FOOTPRINT_WIDTH_PX`**. */
export const TILE_SIZE = ISO_FLOOR_TEXTURE_CELL_PX;

export const SHEET_WIDTH = TILE_SIZE * 2;
export const SHEET_HEIGHT = TILE_SIZE * 2;

export const DEFAULT_FAL_ENDPOINT = "fal-ai/nano-banana-2";

export const ISO_FLOOR_FAL_EXTRAS_SHEET = {
  aspect_ratio: NANO_BANANA2_SQUARE_ASPECT_RATIO,
  resolution: NANO_BANANA2_LOW_RESOLUTION,
  expand_prompt: true,
  safety_tolerance: 2,
};

export const ISO_FLOOR_FAL_EXTRAS_PER_TILE = {
  aspect_ratio: "1:1",
  resolution: NANO_BANANA2_DEFAULT_RESOLUTION,
};

export const QA_SPRITE_W = 16;
export const QA_SPRITE_H = 16;

/**
 * @type {readonly import('../../generators/types.mjs').GeneratorFrame[]}
 */
export const ISO_FLOOR_FRAMES = Object.freeze([
  {
    id: "floor_0",
    outSubdir: "floor_0",
    promptVariant:
      `Variation A of 4: clean open floor with only fine grain — same foreshortened rhombus as other cells (~2:1 wide:tall, side midpoints + inset top/bottom).`,
  },
  {
    id: "floor_1",
    outSubdir: "floor_1",
    promptVariant:
      `Variation B of 4: a few short hairline cracks — same wide-low rhombus footprint and palette family as other cells.`,
  },
  {
    id: "floor_2",
    outSubdir: "floor_2",
    promptVariant:
      `Variation C of 4: light scattered grit or tiny pebbles — same foreshortened diamond geometry, no raised objects.`,
  },
  {
    id: "floor_3",
    outSubdir: "floor_3",
    promptVariant:
      `Variation D of 4: slightly darker worn patch toward the bottom of the rhombus — same outline for tiling.`,
  },
]);

export const SHEET_CROPS = Object.freeze({
  floor_0: { x: 0, y: 0 },
  floor_1: { x: TILE_SIZE, y: 0 },
  floor_2: { x: 0, y: TILE_SIZE },
  floor_3: { x: TILE_SIZE, y: TILE_SIZE },
});

export const ISO_FLOOR_FRAME_SHEET_CELLS = Object.freeze({
  floor_0: { column: 0, row: 0 },
  floor_1: { column: 1, row: 0 },
  floor_2: { column: 0, row: 1 },
  floor_3: { column: 1, row: 1 },
});

export const ISO_FLOOR_SHEET_LAYOUT = Object.freeze(sheetLayoutFromCrops(SHEET_CROPS, TILE_SIZE));

/**
 * @param {'mock'|'generate'} mode
 * @param {'per-tile'|'sheet'} [strategy]
 */
export function recipeId(mode, strategy) {
  return buildRecipeId({
    preset: MANIFEST_PRESET_ID,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
  });
}

/**
 * @typedef {object} CreateIsoFloorPresetOpts
 * @property {string} outBase
 * @property {string} [artUrlPrefix='art/isometric-open-floor']
 * @property {string} [spriteRefJsonRelativePath='sprite-ref.json']
 * @property {string} [provenanceTool]
 * @property {number} [provenanceVersion]
 */

/**
 * @param {CreateIsoFloorPresetOpts} opts
 */
export function createPreset(opts) {
  const outBase = opts?.outBase;
  if (typeof outBase !== "string" || !outBase.trim()) {
    throw new Error("createPreset(isometric-open-floor): outBase (non-empty string, absolute output directory) is required");
  }

  const artUrlPrefix = opts.artUrlPrefix ?? "art/isometric-open-floor";
  const spriteRefJsonRelativePath = opts.spriteRefJsonRelativePath ?? "sprite-ref.json";
  const provenanceTool =
    opts.provenanceTool ?? "tools/sprite-generation/presets/isometric-open-floor/isometric-open-floor.mjs";
  const provenanceVersion = opts.provenanceVersion ?? 1;

  for (const f of ISO_FLOOR_FRAMES) {
    if (!(f.id in SHEET_CROPS)) {
      throw new Error(`createPreset(isometric-open-floor): SHEET_CROPS missing entry for frame id "${f.id}"`);
    }
  }

  return {
    presetId: MANIFEST_PRESET_ID,
    kind: KIND,
    frames: ISO_FLOOR_FRAMES,
    outBase,
    tileSize: TILE_SIZE,
    sheetGridSize: 2,
    sheetOnlyOutput: true,
    sheetNativeRaster: true,
    frameSheetCells: { ...ISO_FLOOR_FRAME_SHEET_CELLS },
    specsNaming: "sheet.png + sprite-ref.json (gridFrameKeys); no per-frame floor PNGs",
    sheet: {
      width: SHEET_WIDTH,
      height: SHEET_HEIGHT,
      crops: { ...SHEET_CROPS },
      rows: 2,
      columns: 2,
      spriteWidth: TILE_SIZE,
      spriteHeight: TILE_SIZE,
    },
    prompt: {
      frameStyle: ISO_FLOOR_FRAME_STYLE,
      frameComposition: ISO_FLOOR_FRAME_COMPOSITION,
      sheetSubject: ISO_FLOOR_FALSPRITE_SHEET_SUBJECT,
      sheetRewriteUserPrompt: ISO_FLOOR_SHEET_REWRITE_USER_SEED,
      sheetPromptBuilder: (ctx) =>
        buildIsometricFloorGridSpritePrompt(ctx.rewrittenBase ?? ISO_FLOOR_FALSPRITE_SHEET_SUBJECT, 2),
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
      tileBufferForFrame: (frame, ctx) => renderIsometricFloorMockTileBuffer(frame, ctx.tileSize),
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
