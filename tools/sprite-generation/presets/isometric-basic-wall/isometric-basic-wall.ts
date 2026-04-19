/**
 * Isometric **basic wall** tile preset — **1×4** horizontal strip (`gridFrameKeys` under `public/art/isometric-basic-wall/`).
 *
 * Same **W** footprint as {@link isometric-open-floor} (**`ISO_FLOOR_TEXTURE_WIDTH_PX`**); cell height **`isoSquareCellSizePx("fullHeight")`** (**~2m** vertical — tall as a character / two stacked blocks). Uses **`createIsoTileStripPreset`**.
 *
 * **fal:** **`4:1`** is the widest supported strip ratio; **`sheetNormalizeToPreset`** + **`fit: 'contain'`** letterboxes to nominal sheet so **four** cells are not side-cropped.
 *
 * @see `../../README.md`
 */

import {
  NANO_BANANA2_DEFAULT_RESOLUTION,
  NANO_BANANA2_ISO_WALL_STRIP_ASPECT_RATIO,
  NANO_BANANA2_LOW_RESOLUTION,
} from "../../generators/fal.ts";
import type { GeneratorFrame } from "../../generators/types.ts";
import { renderIsometricWallMockTileBuffer } from "../../generators/mock.ts";
import { buildRecipeId } from "../../manifest.ts";
import type { PipelinePreset } from "../../pipeline.ts";
import type { CreatePresetOptsBase } from "../../preset-contract.ts";
import {
  ISO_WALL_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
  ISO_WALL_FALSPRITE_SHEET_SUBJECT,
  ISO_WALL_FRAME_COMPOSITION,
  ISO_WALL_FRAME_PROMPT_SUFFIX,
  ISO_WALL_FRAME_STYLE,
  ISO_WALL_SHEET_REWRITE_USER_SEED,
  buildIsometricWallStripSpritePrompt,
  interpolatePromptTemplate,
} from "../../prompt.ts";
import {
  ISO_FLOOR_TEXTURE_WIDTH_PX,
  TILE_FOOTPRINT_WIDTH_PX,
  isoSquareCellSizePx,
} from "../../gameDimensions.ts";
import { createIsoTileStripPreset } from "../lib/iso-tile-preset.ts";

export const ASSET_ID = "isometric-basic-wall";

export const MANIFEST_PRESET_ID = "isometric_basic_wall";

export const KIND = "isometric_wall_tile_set";

export const DEFAULT_STRATEGY = "sheet";

/** Cell width (px) — 1m footprint, same as open-floor. */
export const TILE_WIDTH = ISO_FLOOR_TEXTURE_WIDTH_PX;

/** Cell height (px) — fullHeight tier (**~2m** vertical above floor band). */
export const TILE_HEIGHT = isoSquareCellSizePx("fullHeight");

export const TILE_SIZE = TILE_WIDTH;

export const DEFAULT_FAL_ENDPOINT = "fal-ai/nano-banana-2";

export const ISO_WALL_FAL_EXTRAS_SHEET = {
  aspect_ratio: NANO_BANANA2_ISO_WALL_STRIP_ASPECT_RATIO,
  resolution: NANO_BANANA2_LOW_RESOLUTION,
  expand_prompt: true,
  safety_tolerance: 2,
};

export const ISO_WALL_FAL_EXTRAS_PER_TILE = {
  aspect_ratio: "1:1",
  resolution: NANO_BANANA2_DEFAULT_RESOLUTION,
};

export const QA_SPRITE_W = 16;
export const QA_SPRITE_H = Math.max(8, Math.round(TILE_HEIGHT / 4));

export const ISO_WALL_FRAMES: readonly GeneratorFrame[] = Object.freeze([
  {
    id: "wall_0",
    outSubdir: "wall_0",
    promptVariant:
      `Variation A of 4: clean cut stone blocks — solid ~2m block, front-facing mass (${TILE_WIDTH}×${TILE_HEIGHT}px cell).`,
  },
  {
    id: "wall_1",
    outSubdir: "wall_1",
    promptVariant:
      `Variation B of 4: a few short cracks in the mortar — same footprint and palette family as other cells.`,
  },
  {
    id: "wall_2",
    outSubdir: "wall_2",
    promptVariant:
      `Variation C of 4: faint moss in the grout lines — same geometry, no props on the wall.`,
  },
  {
    id: "wall_3",
    outSubdir: "wall_3",
    promptVariant:
      `Variation D of 4: slightly chipped corner read on the vertical face — same bottom anchor for tiling.`,
  },
]);

export function recipeId(mode: "mock" | "generate", strategy?: "per-tile" | "sheet"): string {
  return buildRecipeId({
    preset: MANIFEST_PRESET_ID,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
  });
}

export type CreateIsoWallPresetOpts = CreatePresetOptsBase;

export function createPreset(opts: CreateIsoWallPresetOpts): PipelinePreset {
  const outBase = opts?.outBase;
  if (typeof outBase !== "string" || !outBase.trim()) {
    throw new Error(
      "createPreset(isometric-basic-wall): outBase (non-empty string, absolute output directory) is required",
    );
  }

  const artUrlPrefix = opts.artUrlPrefix ?? "art/isometric-basic-wall";
  const spriteRefJsonRelativePath = opts.spriteRefJsonRelativePath ?? "sprite-ref.json";
  const provenanceTool =
    opts.provenanceTool ?? "tools/sprite-generation/presets/isometric-basic-wall/isometric-basic-wall.ts";
  const provenanceVersion = opts.provenanceVersion ?? 1;

  if (TILE_WIDTH !== TILE_FOOTPRINT_WIDTH_PX) {
    throw new Error("isometric-basic-wall: TILE_WIDTH must match TILE_FOOTPRINT_WIDTH_PX");
  }

  return createIsoTileStripPreset({
    outBase,
    presetId: MANIFEST_PRESET_ID,
    kind: KIND,
    tier: "fullHeight",
    sheetNormalizeToPreset: true,
    sheetNormalizeFit: "contain",
    frames: ISO_WALL_FRAMES,
    prompt: {
      frameStyle: ISO_WALL_FRAME_STYLE,
      frameComposition: ISO_WALL_FRAME_COMPOSITION,
      sheetSubject: ISO_WALL_FALSPRITE_SHEET_SUBJECT,
      sheetRewriteUserPrompt: ISO_WALL_SHEET_REWRITE_USER_SEED,
      sheetPromptBuilder: (ctx) => {
        const cellW = Math.round(ctx.sheetWidth / 4);
        const cellH = Math.round(ctx.sheetHeight);
        const subject = interpolatePromptTemplate(ISO_WALL_FALSPRITE_SHEET_SUBJECT, {
          tileSize: cellW,
          chromaKeyHex: ctx.chromaKeyHex,
          cellWidth: cellW,
          cellHeight: cellH,
          sheetWidth: ctx.sheetWidth,
          sheetHeight: ctx.sheetHeight,
        });
        const base = ctx.rewrittenBase && String(ctx.rewrittenBase).trim() ? String(ctx.rewrittenBase).trim() : subject;
        return buildIsometricWallStripSpritePrompt(base, ctx.sheetWidth, ctx.sheetHeight);
      },
      framePromptSuffix: ISO_WALL_FRAME_PROMPT_SUFFIX,
    },
    renderMockTileBuffer: (frame, c) =>
      renderIsometricWallMockTileBuffer(frame, c.tileWidth ?? TILE_WIDTH, c.tileHeight ?? TILE_HEIGHT),
    specsNaming: "sheet.png + sprite-ref.json (gridFrameKeys); no per-frame wall PNGs",
    fal: {
      defaultEndpoint: DEFAULT_FAL_ENDPOINT,
      falExtrasPerTile: { ...ISO_WALL_FAL_EXTRAS_PER_TILE },
      falExtrasSheet: { ...ISO_WALL_FAL_EXTRAS_SHEET },
      chromaAfterBria: false,
      sheetRewrite: {
        enabled: true,
        systemPrompt: ISO_WALL_FALSPRITE_SHEET_REWRITE_SYSTEM_PROMPT,
      },
    },
    qa: { spriteWidth: QA_SPRITE_W, spriteHeight: QA_SPRITE_H },
    provenanceTool,
    provenanceVersion,
    postprocessSteps: [],
    spriteRef: {
      kind: "gridFrameKeys",
      jsonRelativePath: spriteRefJsonRelativePath,
      sheetImageRelativePath: `${artUrlPrefix.replace(/\/$/, "")}/sheet.png`,
    },
  });
}
