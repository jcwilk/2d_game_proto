/**
 * Factory for **isometric tile** presets (horizontal strip): footprint width **W** from
 * {@link TILE_FOOTPRINT_WIDTH_PX}, cell height from {@link IsoCellTier} per **`src/dimensions.ts`**
 * (re-exported by **`gameDimensions.ts`**).
 *
 * - **floorOnly:** texture cell **W×(W/2)** (open-floor rhombus band).
 * - **halfHeight** / **fullHeight:** **W×isoSquareCellSizePx(tier)** — same horizontal footprint as floor strips, taller square cells for walls / verticals.
 *
 * @see `../../../../src/dimensions.ts`
 */

import type { GeneratorFrame, TileBufferForFrameFn } from "../../generators/types.ts";
import {
  ISO_FLOOR_TEXTURE_HEIGHT_PX,
  type IsoCellTier,
  TILE_FOOTPRINT_WIDTH_PX,
  isoSquareCellSizePx,
} from "../../gameDimensions.ts";
import type { PipelinePreset, PipelinePresetPrompt } from "../../pipeline.ts";
import type { CreatePresetOptsBase } from "../../preset-contract.ts";
import {
  frameSheetCellsRowMajor,
  horizontalStripCrops,
  sheetDimensionsFromStrip,
  sheetLayoutFromStripCrops,
  validateFrameCropCellCoverage,
} from "./sheet-spec.ts";

/** Pixel size of one strip cell: width = 1m footprint, height from tier. */
export function isoTileStripCellDimensions(tier: IsoCellTier): { cellWidth: number; cellHeight: number } {
  const cellWidth = TILE_FOOTPRINT_WIDTH_PX;
  const cellHeight =
    tier === "floorOnly" ? ISO_FLOOR_TEXTURE_HEIGHT_PX : isoSquareCellSizePx(tier);
  return { cellWidth, cellHeight };
}

export type IsoTilePromptBundle = Pick<
  PipelinePresetPrompt,
  "frameStyle" | "frameComposition" | "sheetSubject"
> &
  Partial<Pick<PipelinePresetPrompt, "framePromptSuffix" | "sheetRewriteUserPrompt" | "sheetPromptBuilder">>;

export type CreateIsoTileStripPresetOpts = CreatePresetOptsBase & {
  presetId: string;
  kind: string;
  tier: IsoCellTier;
  frames: readonly GeneratorFrame[];
  prompt: IsoTilePromptBundle;
  renderMockTileBuffer: TileBufferForFrameFn;
  spriteRef: PipelinePreset["spriteRef"];
  /** Defaults to open-floor-style sheet generate (single raster, crops). */
  sheetOnlyOutput?: boolean;
  sheetNativeRaster?: boolean;
  fal?: PipelinePreset["fal"];
  qa?: PipelinePreset["qa"];
  postprocessSteps?: PipelinePreset["postprocessSteps"];
  specsNaming?: string;
};

/**
 * Assembles a **`PipelinePreset`** for a **1×N** horizontal strip of isometric tile frames.
 */
export function createIsoTileStripPreset(opts: CreateIsoTileStripPresetOpts): PipelinePreset {
  const outBase = opts.outBase;
  if (typeof outBase !== "string" || !outBase.trim()) {
    throw new Error("createIsoTileStripPreset: outBase (non-empty string, absolute output directory) is required");
  }

  const frames = opts.frames;
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error("createIsoTileStripPreset: frames must be a non-empty array");
  }

  const { cellWidth, cellHeight } = isoTileStripCellDimensions(opts.tier);
  const frameIds = frames.map((f) => f.id);
  const crops = horizontalStripCrops(frameIds, cellWidth, cellHeight);
  const frameSheetCells = frameSheetCellsRowMajor(frameIds, frameIds.length);
  validateFrameCropCellCoverage(frameIds, crops, frameSheetCells);

  const { sheetWidth, sheetHeight } = sheetDimensionsFromStrip(frames.length, cellWidth, cellHeight);
  const sheetLayout = sheetLayoutFromStripCrops(crops, cellWidth, cellHeight);

  const provenanceTool =
    opts.provenanceTool ?? "tools/sprite-generation/presets/lib/iso-tile-preset.ts";
  const provenanceVersion = opts.provenanceVersion ?? 1;

  const qa =
    opts.qa ??
    ({
      spriteWidth: 16,
      spriteHeight: Math.max(8, Math.round(cellHeight / 4)),
    } satisfies PipelinePreset["qa"]);

  const prompt: PipelinePresetPrompt = {
    frameStyle: opts.prompt.frameStyle,
    frameComposition: opts.prompt.frameComposition,
    sheetSubject: opts.prompt.sheetSubject,
    ...(opts.prompt.framePromptSuffix != null ? { framePromptSuffix: opts.prompt.framePromptSuffix } : {}),
    ...(opts.prompt.sheetRewriteUserPrompt != null
      ? { sheetRewriteUserPrompt: opts.prompt.sheetRewriteUserPrompt }
      : {}),
    ...(opts.prompt.sheetPromptBuilder != null ? { sheetPromptBuilder: opts.prompt.sheetPromptBuilder } : {}),
  };

  return {
    presetId: opts.presetId,
    kind: opts.kind,
    frames: [...frames],
    outBase,
    tileSize: cellWidth,
    tileHeight: cellHeight,
    sheetGridSize: frames.length,
    sheetOnlyOutput: opts.sheetOnlyOutput ?? true,
    sheetNativeRaster: opts.sheetNativeRaster ?? true,
    frameSheetCells: { ...frameSheetCells },
    specsNaming: opts.specsNaming,
    sheet: {
      width: sheetWidth,
      height: sheetHeight,
      crops: { ...crops },
      rows: 1,
      columns: frames.length,
      spriteWidth: cellWidth,
      spriteHeight: cellHeight,
    },
    prompt,
    ...(opts.fal != null ? { fal: opts.fal } : {}),
    qa,
    provenance: { tool: provenanceTool, version: provenanceVersion },
    generatorConfig: {
      tileBufferForFrame: (frame, c) =>
        opts.renderMockTileBuffer(frame, {
          tileSize: c.tileSize ?? cellWidth,
          tileWidth: c.tileWidth ?? cellWidth,
          tileHeight: c.tileHeight ?? cellHeight,
        }),
      sheetLayout,
    },
    postprocessSteps: opts.postprocessSteps ?? [],
    spriteRef: opts.spriteRef,
  };
}
