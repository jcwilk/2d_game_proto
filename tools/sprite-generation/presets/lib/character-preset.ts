/**
 * Factory for **character walk** presets: **1×N** horizontal strip, **frames** authoritative for
 * order and count. Derives **`sheet.columns`**, **`sheet.rows`**, **`sheetGridSize`**, crop map,
 * **`frameSheetCells`**, and mock **`sheetLayout`** via **`sheet-spec.ts`**.
 */

import type { GeneratorFrame, TileBufferForFrameFn } from "../../generators/types.ts";
import type { PipelinePreset, PipelinePresetPrompt } from "../../pipeline.ts";
import type { CreatePresetOptsBase } from "../../preset-contract.ts";
import {
  characterWalkStripCellDimensions,
  defaultCharacterWalkQaSpriteSize,
} from "./character-defaults.ts";
import {
  frameSheetCellsRowMajor,
  horizontalStripCrops,
  sheetDimensionsFromStrip,
  sheetLayoutFromStripCrops,
  validateFrameCropCellCoverage,
} from "./sheet-spec.ts";

export type CharacterWalkPromptBundle = Pick<
  PipelinePresetPrompt,
  "frameStyle" | "frameComposition" | "sheetSubject"
> &
  Partial<
    Pick<
      PipelinePresetPrompt,
      | "framePromptSuffix"
      | "sheetRewriteUserPrompt"
      | "sheetPromptBuilder"
      | "sheetStyle"
      | "sheetComposition"
    >
  >;

export type CreateCharacterStripPresetOpts = CreatePresetOptsBase & {
  presetId: string;
  kind: string;
  frames: readonly GeneratorFrame[];
  prompt: CharacterWalkPromptBundle;
  renderMockTileBuffer: TileBufferForFrameFn;
  spriteRef: PipelinePreset["spriteRef"];
  /** Override strip cell size (default: {@link characterWalkStripCellDimensions}). */
  cellWidth?: number;
  cellHeight?: number;
  sheetOnlyOutput?: boolean;
  sheetNativeRaster?: boolean;
  fal?: PipelinePreset["fal"];
  qa?: PipelinePreset["qa"];
  postprocessSteps?: PipelinePreset["postprocessSteps"];
  specsNaming?: string;
};

/**
 * Assembles a **`PipelinePreset`** for a **1×N** horizontal character walk strip.
 */
export function createCharacterStripPreset(opts: CreateCharacterStripPresetOpts): PipelinePreset {
  const outBase = opts.outBase;
  if (typeof outBase !== "string" || !outBase.trim()) {
    throw new Error(
      "createCharacterStripPreset: outBase (non-empty string, absolute output directory) is required",
    );
  }

  const frames = opts.frames;
  if (!Array.isArray(frames) || frames.length === 0) {
    throw new Error("createCharacterStripPreset: frames must be a non-empty array");
  }

  const { cellWidth: defaultW, cellHeight: defaultH } = characterWalkStripCellDimensions();
  const cellWidth = opts.cellWidth ?? defaultW;
  const cellHeight = opts.cellHeight ?? defaultH;

  const frameIds = frames.map((f) => f.id);
  const crops = horizontalStripCrops(frameIds, cellWidth, cellHeight);
  const frameSheetCells = frameSheetCellsRowMajor(frameIds, frameIds.length);
  validateFrameCropCellCoverage(frameIds, crops, frameSheetCells);

  const { sheetWidth, sheetHeight } = sheetDimensionsFromStrip(frames.length, cellWidth, cellHeight);
  const sheetLayout = sheetLayoutFromStripCrops(crops, cellWidth, cellHeight);

  const provenanceTool =
    opts.provenanceTool ?? "tools/sprite-generation/presets/lib/character-preset.ts";
  const provenanceVersion = opts.provenanceVersion ?? 1;

  const qa =
    opts.qa ??
    ({
      ...defaultCharacterWalkQaSpriteSize(cellWidth, cellHeight),
    } satisfies PipelinePreset["qa"]);

  const prompt: PipelinePresetPrompt = {
    frameStyle: opts.prompt.frameStyle,
    frameComposition: opts.prompt.frameComposition,
    sheetSubject: opts.prompt.sheetSubject,
    ...(opts.prompt.sheetStyle != null ? { sheetStyle: opts.prompt.sheetStyle } : {}),
    ...(opts.prompt.sheetComposition != null ? { sheetComposition: opts.prompt.sheetComposition } : {}),
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
