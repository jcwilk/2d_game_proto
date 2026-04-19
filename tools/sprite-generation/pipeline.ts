/**
 * Sprite-generation pipeline: **`runPipeline(preset, opts)`** runs **prompt → generator →
 * postprocess (ordered **`postprocessSteps`** from **`pipeline-stages.ts`**) → QA (optional) → manifest + sprite-ref writes**, with structured logs via
 * **`logging.ts`**.
 *
 * Supports **per-tile** (one `generate()` per frame) and **sheet** (`generateSheet()` then
 * deterministic crops using **`preset.sheet.size`** and **`preset.sheet.crops`**).
 *
 * **Determinism vs variance:** sheet/tile **geometry** (crops, dimensions) and the **QA cell grid**
 * (`preset.qa`) are deterministic. **T2I** output and **chroma** postprocess (tolerance, heuristics) are
 * stochastic — see **`README.md`** in this directory.
 *
 * @see `README.md` — T2I/chroma variance vs enforced grid geometry
 * @see `pipeline-stages.ts` — `applyPostprocessPipeline`, chroma and other postprocess steps
 * @see `qa/analyze-bridge.ts` — QA png-analyze bridge (`runPngAnalyzeBridge`)
 * @see `generators/types.ts` — generator contracts
 * @see `presets/dpad/dpad.mjs` — D-pad preset (`createPreset`); canonical constants + `runPipeline` config.
 *
 * ## Raster WxH (on-disk = model output)
 *
 * **Sheet generate:** **`sheet.png`** is written **without** resizing — native fal/BRIA dimensions. If they differ
 * from the preset’s nominal **`sheet`**, crops and **`sprite-ref.json`** grid use **`gridSheetFromRasterDimensions`**
 * (uniform rows×columns). **Per-tile generate:** each frame PNG is written at the postprocess output size (no
 * normalize-to-preset). The game scales with linear filtering at draw time (**`ImageFiltering.Blended`**).
 *
 * **`assertPngBufferDimensions`** guards the written buffer at **`pipeline:raster-after-sheet`** /
 * **`pipeline:raster-after-tile`**.
 */

import { fal } from "@fal-ai/client";
import type { Buffer } from "node:buffer";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";
import type { FalClient } from "@fal-ai/client";
import type { GeneratorFrame, MockGeneratorConfig, PostprocessStepId } from "./generators/types.ts";
import type { SpriteRefFrameKeyRect, SpriteRefGridFrameKeys } from "./sprite-ref.ts";

import {
  assertPngBufferDimensions,
  DEFAULT_SHEET_REWRITE_MODEL,
  DEFAULT_SHEET_REWRITE_SYSTEM_PROMPT,
  falSubscribeBriaBackgroundRemoveToBuffer,
  falSubscribeImageToUrlResult,
  falSubscribeToBuffer,
  getFalImageEndpointStrategy,
  hashPromptForLog,
  resolveFalCredentials,
  rewritePromptViaOpenRouter,
  sameImageEndpointFamily,
  shouldUseBriaSheetMatting,
} from "./generators/fal.ts";
import { generate as mockGenerate, generateSheet as mockGenerateSheet } from "./generators/mock.ts";
import { log } from "./logging.ts";
import { buildInitialManifest, buildRecipeId } from "./manifest.ts";
import { buildPrompt, buildSheetPrompt, DEFAULT_CHROMA_KEY_HEX, DPAD_FRAME_PROMPT_SUFFIX } from "./prompt.ts";
import {
  applyPostprocessPipeline,
  resolveGeneratorConfig,
  resolvePostprocessSteps,
  resolveSheetTilePostprocessSteps,
} from "./pipeline-stages.ts";
import { extractPngRegion } from "./postprocess/png-region.ts";
import { runPngAnalyzeBridge } from "./qa/analyze-bridge.ts";
import {
  DEFAULT_TILE_PNG_BASENAME,
  writeSpriteRef,
  type SpriteGenPresetGrid,
  type SpriteGenPresetTiles,
} from "./sprite-ref.ts";
import { sheetLayoutFromCrops, sheetLayoutFromCropsRect } from "./sheet-layout.ts";

export interface PipelinePresetSheet {
  width?: number;
  height?: number;
  size?: number;
  crops: Record<string, { x: number; y: number }>;
  rows?: number;
  columns?: number;
  spriteWidth?: number;
  spriteHeight?: number;
}

export interface SheetPromptBuilderCtx {
  sheetWidth: number;
  sheetHeight: number;
  chromaKeyHex: string;
  rewrittenBase?: string;
}

export interface PipelinePresetPrompt {
  frameStyle: string;
  frameComposition: string;
  sheetStyle?: string;
  sheetComposition?: string;
  sheetSubject: string;
  framePromptSuffix?: string;
  sheetPromptBuilder?: (ctx: SheetPromptBuilderCtx) => string;
  sheetRewriteUserPrompt?: string;
}

export interface PipelinePreset {
  presetId: string;
  kind: string;
  frames: GeneratorFrame[];
  outBase: string;
  tileSize: number;
  tileHeight?: number;
  sheet?: PipelinePresetSheet;
  prompt: PipelinePresetPrompt;
  fal?: {
    defaultEndpoint?: string;
    falExtrasPerTile?: Record<string, unknown> | null;
    falExtrasSheet?: Record<string, unknown> | null;
    sheetMatting?: "auto" | "bria" | "none";
    chromaAfterBria?: boolean;
    chromaFringeEdgeDist?: number;
    chromaSpillMaxDist?: number;
    sheetRewrite?: {
      enabled?: boolean;
      model?: string;
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
    };
  };
  qa: { spriteWidth: number; spriteHeight: number };
  provenance: { tool: string; version: number };
  spriteRef: SpriteRefFrameKeyRect | SpriteRefGridFrameKeys;
  sheetOnlyOutput?: boolean;
  sheetGridSize?: number;
  frameSheetCells?: Record<string, { column: number; row: number }>;
  generatorConfig?: MockGeneratorConfig;
  postprocessSteps?: PostprocessStepId[];
  specsNaming?: string;
  sheetNativeRaster?: boolean;
}

export interface PipelineOpts {
  mode: "mock" | "generate";
  strategy?: "per-tile" | "sheet";
  dryRun?: boolean;
  skipQa?: boolean;
  quiet?: boolean;
  chromaKeyHex?: string;
  chromaTolerance?: number;
  seed?: number;
  endpoint?: string;
  imageSize?: string;
  keepSheet?: boolean;
  savePreChroma?: boolean;
  falSubscribe?: FalClient["subscribe"];
  fetch?: typeof fetch;
  sheetRewrite?: boolean;
  chromaAfterBria?: boolean;
  chromaFringeEdgeDist?: number;
  chromaSpillMaxDist?: number;
}

export type PipelineRunResult = {
  manifestPath: string;
  spriteRefPath: string;
  outBase: string;
  generationResultsById: Record<string, Record<string, unknown>>;
  timings: Record<string, number>;
};

const DEFAULT_FAL_ENDPOINT = "fal-ai/flux/dev";

function resolveSheetPixelDimensions(sheet: PipelinePresetSheet | undefined): { width: number; height: number } {
  if (!sheet) return { width: 0, height: 0 };
  if (sheet.width != null && sheet.height != null) {
    return { width: sheet.width, height: sheet.height };
  }
  if (sheet.size != null) {
    return { width: sheet.size, height: sheet.size };
  }
  throw new Error("preset.sheet needs width+height or legacy size");
}

/**
 * Build **`preset.sheet`** fields for a **uniform** rows×columns grid at **`width`×`height`** (no scaling).
 * Used when the downloaded sheet size ≠ nominal **`preset.sheet`**; crops follow **`frameSheetCells`** when set,
 * else **`sheet.crops`** scaled from the preset’s nominal sheet size.
 */
function gridSheetFromRasterDimensions(
  width: number,
  height: number,
  preset: PipelinePreset,
): NonNullable<PipelinePreset["sheet"]> & {
  width: number;
  height: number;
  spriteWidth: number;
  spriteHeight: number;
  crops: Record<string, { x: number; y: number }>;
} {
  const sheet = preset.sheet!;
  const cols = sheet.columns;
  const rows = sheet.rows;
  if (cols == null || rows == null) {
    throw new Error("native sheet raster requires preset.sheet.rows and preset.sheet.columns (uniform grid)");
  }
  const cw = width / cols;
  const ch = height / rows;
  if (!Number.isInteger(cw) || !Number.isInteger(ch)) {
    throw new Error(
      `native sheet ${width}×${height} not evenly divisible by ${cols}×${rows} grid (cell ${cw}×${ch})`,
    );
  }
  const crops: Record<string, { x: number; y: number }> = {};
  if (preset.frameSheetCells) {
    for (const f of preset.frames) {
      const cell = preset.frameSheetCells[f.id];
      if (!cell) {
        throw new Error(`native sheet raster: frameSheetCells missing for frame id ${JSON.stringify(f.id)}`);
      }
      crops[f.id] = { x: cell.column * cw, y: cell.row * ch };
    }
  } else {
    const { width: nomW, height: nomH } = resolveSheetPixelDimensions(sheet);
    const sx = width / nomW;
    const sy = height / nomH;
    for (const f of preset.frames) {
      const c = sheet.crops[f.id];
      if (!c) {
        throw new Error(`native sheet raster: sheet.crops missing for frame id ${JSON.stringify(f.id)}`);
      }
      crops[f.id] = { x: Math.round(c.x * sx), y: Math.round(c.y * sy) };
    }
  }
  return {
    ...sheet,
    width,
    height,
    spriteWidth: cw,
    spriteHeight: ch,
    crops,
    rows,
    columns: cols,
  };
}

export {
  POSTPROCESS_REGISTRY,
  DEFAULT_POSTPROCESS_STEPS_GENERATE,
  resolvePostprocessSteps,
  resolveSheetTilePostprocessSteps,
  resolveGeneratorConfig,
  applyPostprocessPipeline,
} from "./pipeline-stages.ts";

function parseHexRgb(hex: string): { r: number; g: number; b: number } {
  const s = String(hex).trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(s);
  if (!m?.[1]) throw new Error(`invalid hex color: ${hex}`);
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

function maskSecret(s: string): string {
  const t = String(s).trim();
  if (t.length <= 8) return "(length<=8, hidden)";
  return `len=${t.length} suffix=...${t.slice(-4)}`;
}

const SHEET_GRID_WORDS: Record<number, string> = { 2: "two", 3: "three", 4: "four", 5: "five", 6: "six" };

/**
 * Resolves the sheet T2I prompt: if **`prompt.sheetPromptBuilder`** is set, calls it with raster size and chroma key
 * (same ctx shape as the post-rewrite path, minus **`rewrittenBase`**). Otherwise **`buildSheetPrompt`** uses
 * **`sheetStyle`**, **`sheetComposition`**, and **`sheetSubject`** (required on that fallback path).
 */
function resolveSheetPromptText(
  preset: Pick<PipelinePreset, "prompt" | "kind">,
  sheetW: number,
  sheetH: number,
  chromaKeyHex: string,
): string {
  const p = preset.prompt;
  if (typeof p?.sheetPromptBuilder === "function") {
    return p.sheetPromptBuilder({ sheetWidth: sheetW, sheetHeight: sheetH, chromaKeyHex });
  }
  return buildSheetPrompt({
    sheetWidth: sheetW,
    sheetHeight: sheetH,
    chromaKeyHex,
    style: p.sheetStyle as string,
    composition: p.sheetComposition as string,
    subject: p.sheetSubject,
  });
}

function resolveSheetRewriteUserPrompt(
  preset: Pick<PipelinePreset, "prompt" | "kind">,
  sheetPrompt: string,
  sheetGridSize?: number,
): string {
  const seed = preset.prompt?.sheetRewriteUserPrompt;
  if (typeof seed !== "string" || !seed.trim()) {
    return sheetPrompt;
  }
  const trimmed = seed.trim();
  if (preset.kind === "isometric_floor_tile_set") {
    return `Improve this brief for a single image-generation prompt (keep technical constraints): ${trimmed}`;
  }
  const gs = sheetGridSize ?? 4;
  const gridWord = SHEET_GRID_WORDS[gs] ?? "four";
  return `Design the character and choreograph a ${gridWord}-beat animation loop for: ${trimmed}`;
}

export async function runPipeline(preset: PipelinePreset, opts: PipelineOpts): Promise<PipelineRunResult> {
  const mode = opts.mode;
  const strategy = opts.strategy ?? "per-tile";
  const dryRun = Boolean(opts.dryRun);
  const skipQa = Boolean(opts.skipQa);
  const quiet = Boolean(opts.quiet);
  const chromaKeyHex = opts.chromaKeyHex ?? DEFAULT_CHROMA_KEY_HEX;
  const chromaTolerance = opts.chromaTolerance ?? 72;
  const chromaFringeEdgeDist =
    opts.chromaFringeEdgeDist !== undefined ? opts.chromaFringeEdgeDist : preset.fal?.chromaFringeEdgeDist;
  const chromaSpillMaxDist =
    opts.chromaSpillMaxDist !== undefined ? opts.chromaSpillMaxDist : preset.fal?.chromaSpillMaxDist;
  const seed = opts.seed;
  const imageSize = opts.imageSize ?? `${preset.tileSize}x${preset.tileSize}`;
  const keepSheet = Boolean(opts.keepSheet);
  const sheetOnlyOutput = Boolean(preset.sheetOnlyOutput);
  const keepSheetEffective = sheetOnlyOutput ? true : keepSheet;
  const savePreChroma = Boolean(opts.savePreChroma);

  const endpoint = opts.endpoint ?? preset.fal?.defaultEndpoint ?? DEFAULT_FAL_ENDPOINT;

  const frames = preset.frames;
  for (const f of frames) {
    if (strategy === "sheet" && preset.sheet && !(f.id in preset.sheet.crops)) {
      throw new Error(`pipeline: sheet strategy requires preset.sheet.crops["${f.id}"]`);
    }
  }

  if (strategy === "sheet" && !preset.sheet) {
    throw new Error("pipeline: strategy 'sheet' requires preset.sheet { size, crops }");
  }

  const recipeId = buildRecipeId({
    preset: preset.presetId,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
  });

  const createdAt = new Date().toISOString();

  log("INFO", "init", "starting", {
    mode,
    strategy,
    outBase: preset.outBase,
    recipeId,
    frameCount: frames.length,
    dryRun,
    endpoint: mode === "generate" ? endpoint : null,
  });

  if (dryRun) {
    log("WARN", "dry-run", "no files, no API calls; listing planned actions only");
    if (sheetOnlyOutput && strategy === "sheet") {
      log("INFO", "dry-run", `would write ${join(preset.outBase, "sheet.png")} (sheetOnlyOutput)`);
    } else {
      for (const frame of frames) {
        const pngName = pngBasename(preset);
        log("INFO", "dry-run", `would write ${join(preset.outBase, frame.outSubdir ?? frame.id, pngName)}`);
      }
    }
    if (mode === "generate") {
      if (strategy === "sheet" && preset.sheet) {
        const d = resolveSheetPixelDimensions(preset.sheet);
        const sheetRewriteEnabled =
          opts.sheetRewrite !== undefined
            ? Boolean(opts.sheetRewrite)
            : Boolean(preset.fal?.sheetRewrite?.enabled);
        log("INFO", "dry-run", "would call fal.subscribe ONCE", {
          endpoint,
          imageSize: `${d.width}x${d.height}`,
          seed: seed ?? null,
          keepSheet: keepSheetEffective,
        });
        log("INFO", "dry-run", "sheet prompt rewrite (openrouter)", {
          skipped: !sheetRewriteEnabled,
        });
        const chromaAfterBriaResolved =
          opts.chromaAfterBria !== undefined ? Boolean(opts.chromaAfterBria) : Boolean(preset.fal?.chromaAfterBria);
        log("INFO", "dry-run", "sheet tile postprocess after BRIA", {
          chromaAfterBria: chromaAfterBriaResolved,
        });
      } else {
        log("INFO", "dry-run", "would call fal.subscribe once per frame (per-tile)", {
          endpoint,
          imageSize,
          seed: seed ?? null,
        });
      }
    }
    log("INFO", "dry-run", "done");
    return {
      manifestPath: join(preset.outBase, "manifest.json"),
      spriteRefPath: join(preset.outBase, preset.spriteRef.jsonRelativePath ?? "sprite-ref.json"),
      outBase: preset.outBase,
      generationResultsById: {},
      timings: {},
    };
  }

  if (mode === "generate") {
    try {
      parseHexRgb(chromaKeyHex);
    } catch (e) {
      throw new Error(`invalid --chroma-key: ${e instanceof Error ? e.message : String(e)}`);
    }
    const cred = resolveFalCredentials();
    if (!cred) {
      log("ERROR", "credentials", "FAL_KEY (or FAL_KEY_ID + FAL_KEY_SECRET) missing — cannot use mode generate");
      throw new Error("FAL credentials missing for mode generate");
    }
    log("INFO", "credentials", "fal API key present", { key: maskSecret(cred) });
    fal.config({ credentials: cred });
  } else {
    log("INFO", "credentials", "skipping fal (mock mode)");
  }

  const generationResultsById: Record<string, Record<string, unknown>> = {};
  const timings: Record<string, number> = {};
  /** Sheet dimensions + crops after generate-sheet when the written raster differed from nominal **`preset.sheet`**. */
  let effectiveSheetForManifest: NonNullable<PipelinePreset["sheet"]> | null = null;

  await mkdir(preset.outBase, { recursive: true });

  const keyRgbForManifest = mode === "generate" ? parseHexRgb(chromaKeyHex) : null;

  if (mode === "mock" && strategy === "sheet" && preset.sheet) {
    await runMockSheetPath({
      preset,
      generationResultsById,
      timings,
      seed,
      quiet,
      keepSheet: keepSheetEffective,
    });
  } else if (mode === "mock") {
    await runMockPerTilePath({
      preset,
      generationResultsById,
      timings,
      seed,
      quiet,
    });
  } else if (strategy === "sheet" && preset.sheet) {
    const presetDefaultEp = preset.fal?.defaultEndpoint ?? DEFAULT_FAL_ENDPOINT;
    const falExtrasSheetRun = sameImageEndpointFamily(endpoint, presetDefaultEp)
      ? preset.fal?.falExtrasSheet ?? undefined
      : undefined;
    const sheetRewriteEnabled =
      opts.sheetRewrite !== undefined
        ? Boolean(opts.sheetRewrite)
        : Boolean(preset.fal?.sheetRewrite?.enabled);
    const sr = preset.fal?.sheetRewrite;
    const chromaAfterBriaResolved =
      opts.chromaAfterBria !== undefined ? Boolean(opts.chromaAfterBria) : Boolean(preset.fal?.chromaAfterBria);
    const genSheetResult = await runGenerateSheetPath({
      preset,
      generationResultsById,
      timings,
      chromaKeyHex,
      chromaTolerance,
      chromaFringeEdgeDist,
      chromaSpillMaxDist,
      seed,
      endpoint,
      quiet,
      keepSheet: keepSheetEffective,
      falExtras: falExtrasSheetRun,
      falSubscribe: opts.falSubscribe,
      fetch: opts.fetch,
      sheetRewriteEnabled,
      sheetRewriteModel: sr?.model ?? DEFAULT_SHEET_REWRITE_MODEL,
      sheetRewriteSystemPrompt: sr?.systemPrompt ?? DEFAULT_SHEET_REWRITE_SYSTEM_PROMPT,
      sheetRewriteTemperature: sr?.temperature,
      sheetRewriteMaxTokens: sr?.maxTokens,
      chromaAfterBria: chromaAfterBriaResolved,
    });
    effectiveSheetForManifest = genSheetResult?.effectiveSheet ?? null;
  } else {
    const presetDefaultEp = preset.fal?.defaultEndpoint ?? DEFAULT_FAL_ENDPOINT;
    const falExtrasPerTileRun = sameImageEndpointFamily(endpoint, presetDefaultEp)
      ? preset.fal?.falExtrasPerTile ?? undefined
      : undefined;
    await runGeneratePerTilePath({
      preset,
      generationResultsById,
      timings,
      chromaKeyHex,
      chromaTolerance,
      chromaFringeEdgeDist,
      chromaSpillMaxDist,
      seed,
      endpoint,
      imageSize,
      quiet,
      savePreChroma,
      falExtras: falExtrasPerTileRun,
    });
  }

  if (!skipQa) {
    if (sheetOnlyOutput && strategy === "sheet") {
      log("INFO", "qa", "skipped per-frame png-analyze (sheetOnlyOutput)");
    } else {
      const pngName = pngBasename(preset);
      const sw = preset.qa.spriteWidth;
      const sh = preset.qa.spriteHeight;
      for (const frame of frames) {
        if (generationResultsById[frame.id]?.["error"]) continue;
        const absPng = join(preset.outBase, frame.outSubdir ?? frame.id, pngName);
        const jsonPath = join(preset.outBase, frame.outSubdir ?? frame.id, "png-analyze.json");
        log("INFO", "qa:png-analyze", "running", { png: absPng, sprite: `${sw}x${sh}` });
        const t0 = Date.now();
        try {
          runPngAnalyzeBridge(absPng, jsonPath, sw, sh);
        } catch (e) {
          log("ERROR", `qa:${frame.id}`, "png-analyze failed", { error: e instanceof Error ? e.message : String(e) });
          throw e;
        }
        timings[`qa:${frame.id}`] = Date.now() - t0;
        if (!quiet) {
          log("DEBUG", "qa:png-analyze", "full JSON written to sidecar file");
        }
      }
    }
  } else {
    log("WARN", "qa", "skipped (skipQa)");
  }

  const sheetForOutputs = effectiveSheetForManifest ?? preset.sheet;
  const sheetW = sheetForOutputs ? resolveSheetPixelDimensions(sheetForOutputs).width : preset.tileSize * 2;
  const sheetH = sheetForOutputs ? resolveSheetPixelDimensions(sheetForOutputs).height : preset.tileSize * 2;
  let manifestTileW = sheetForOutputs?.spriteWidth ?? preset.tileSize;
  let manifestTileH = sheetForOutputs?.spriteHeight ?? preset.tileHeight ?? preset.tileSize;
  if (mode === "generate" && strategy === "per-tile" && frames.length > 0) {
    const firstFrame = frames[0]!;
    const r0 = generationResultsById[firstFrame.id];
    if (r0?.["decodedWidth"] != null && r0?.["decodedHeight"] != null) {
      manifestTileW = r0["decodedWidth"] as number;
      manifestTileH = r0["decodedHeight"] as number;
      for (let i = 1; i < frames.length; i++) {
        const fi = frames[i]!;
        const ri = generationResultsById[fi.id];
        if (
          ri?.["decodedWidth"] != null &&
          ri?.["decodedHeight"] != null &&
          (ri["decodedWidth"] !== manifestTileW || ri["decodedHeight"] !== manifestTileH)
        ) {
          log("WARN", "manifest", "per-tile frames have mixed native dimensions; manifest uses first frame only", {
            first: `${manifestTileW}x${manifestTileH}`,
            frameId: fi.id,
            other: `${ri["decodedWidth"]}x${ri["decodedHeight"]}`,
          });
        }
      }
    }
  }

  const manifest = buildInitialManifest({
    kind: preset.kind,
    preset: preset.presetId,
    recipeId,
    createdAt,
    frames,
    mode,
    ...(mode === "generate" ? { strategy } : {}),
    endpoint: mode === "generate" ? endpoint : null,
    imageSize,
    tileSize: manifestTileW,
    tileHeight: manifestTileH,
    sheetSize: Math.max(sheetW, sheetH),
    sheetWidth: sheetW,
    sheetHeight: sheetH,
    sheetCropMap: sheetForOutputs?.crops ?? preset.sheet?.crops,
    chromaKeyHex,
    chromaTolerance,
    keyRgbForManifest,
    falExtrasPerTile: mode === "generate" && strategy === "per-tile" ? preset.fal?.falExtrasPerTile ?? null : null,
    falExtrasSheet: mode === "generate" && strategy === "sheet" ? preset.fal?.falExtrasSheet ?? null : null,
    seed: seed ?? null,
    provenance: preset.provenance,
    pngBasename: pngBasename(preset),
    specsNaming: preset.specsNaming ?? null,
  }) as Record<string, unknown>;

  manifest["generationResults"] = generationResultsById;
  manifest["frames"] = frames.map((f) => {
    const r = generationResultsById[f.id];
    return r
      ? { id: f.id, outSubdir: f.outSubdir, ...r }
      : { id: f.id, outSubdir: f.outSubdir, pending: true };
  });

  const manifestPath = join(preset.outBase, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  log("INFO", "manifest", `wrote ${manifestPath}`);

  const sheetForSpriteRef = sheetForOutputs ?? preset.sheet;
  const spriteRefPreset: SpriteGenPresetGrid | SpriteGenPresetTiles =
    preset.spriteRef.kind === "gridFrameKeys"
      ? {
          id: preset.presetId,
          tileSize: sheetForSpriteRef?.spriteWidth ?? manifestTileW,
          tileHeight: sheetForSpriteRef?.spriteHeight ?? manifestTileH,
          frames,
          spriteRef: preset.spriteRef,
          sheet: sheetForSpriteRef as SpriteGenPresetGrid["sheet"],
          frameSheetCells: preset.frameSheetCells as NonNullable<PipelinePreset["frameSheetCells"]>,
        }
      : {
          id: preset.presetId,
          tileSize: sheetForSpriteRef?.spriteWidth ?? manifestTileW,
          tileHeight: sheetForSpriteRef?.spriteHeight ?? manifestTileH,
          frames,
          spriteRef: preset.spriteRef,
        };
  const spriteRefPath = await writeSpriteRef(spriteRefPreset, preset.outBase);
  log("INFO", "sprite-ref", `wrote ${spriteRefPath}`);

  log("INFO", "summary", "pipeline complete", {
    mode,
    frames: frames.length,
    timingsMs: timings,
  });

  return {
    manifestPath,
    spriteRefPath,
    outBase: preset.outBase,
    generationResultsById,
    timings,
  };
}

function pngBasename(preset: PipelinePreset): string {
  const sr = preset.spriteRef;
  if (sr && sr.kind === "frameKeyRect") {
    return sr.pngFilename ?? DEFAULT_TILE_PNG_BASENAME;
  }
  return DEFAULT_TILE_PNG_BASENAME;
}

async function runMockPerTilePath({
  preset,
  generationResultsById,
  timings,
  seed,
  quiet,
}: {
  preset: PipelinePreset;
  generationResultsById: Record<string, Record<string, unknown>>;
  timings: Record<string, number>;
  seed?: number;
  quiet: boolean;
}): Promise<void> {
  const pngName = pngBasename(preset);
  const { prompt, tileSize, frames } = preset;
  const cellW = tileSize;
  const cellH = preset.tileHeight ?? tileSize;
  for (const frame of frames) {
    const folder = join(preset.outBase, frame.outSubdir ?? frame.id);
    await mkdir(folder, { recursive: true });
    const outPng = join(folder, pngName);
    const subject = frame.promptVariant ?? "";
    const text = buildPrompt({
      tileSize: cellW,
      chromaKeyHex: DEFAULT_CHROMA_KEY_HEX,
      style: prompt.frameStyle,
      composition: prompt.frameComposition,
      subject,
      suffix: prompt.framePromptSuffix ?? DPAD_FRAME_PROMPT_SUFFIX,
      cellWidth: cellW,
      cellHeight: cellH,
    });
    if (!quiet) {
      log("DEBUG", "prompt", `preview [${frame.id}]`, { text: text.slice(0, 120) + "…" });
    }
    log("INFO", "prompt", `built per-tile prompt [${frame.id}]`, { chars: text.length });

    log("INFO", `tile:${frame.id}`, "begin mock generate", { outPng });
    const t0 = Date.now();
    const genConfig = resolveGeneratorConfig(preset, { tileSize, tileWidth: cellW, tileHeight: cellH, seed });
    const { buffer: buf } = await mockGenerate(frame, genConfig);
    timings[frame.id] = Date.now() - t0;
    await writeFile(outPng, buf);
    const mockDec = PNG.sync.read(buf);
    generationResultsById[frame.id] = {
      wallMs: timings[frame.id],
      seed: undefined,
      seedRequested: null,
      chromaApplied: false,
      chromaKeySource: null,
      decodedWidth: mockDec.width,
      decodedHeight: mockDec.height,
      notes: [],
    };
    log("INFO", `tile:${frame.id}`, "mock PNG written", { bytes: buf.length, wallMs: timings[frame.id] });
  }
}

async function runMockSheetPath({
  preset,
  generationResultsById,
  timings,
  seed,
  quiet,
  keepSheet,
}: {
  preset: PipelinePreset;
  generationResultsById: Record<string, Record<string, unknown>>;
  timings: Record<string, number>;
  seed?: number;
  quiet: boolean;
  keepSheet: boolean;
}): Promise<void> {
  const sheetOnlyOutput = Boolean(preset.sheetOnlyOutput);
  const sheet = preset.sheet!;
  const { width: sheetW, height: sheetH } = resolveSheetPixelDimensions(sheet);
  const pngName = pngBasename(preset);
  const { tileSize, frames } = preset;
  const cellW = sheet.spriteWidth ?? tileSize;
  const cellH = sheet.spriteHeight ?? preset.tileHeight ?? tileSize;
  if (!sheetOnlyOutput) {
    for (const f of frames) await mkdir(join(preset.outBase, f.outSubdir ?? f.id), { recursive: true });
  }

  const sheetPrompt = resolveSheetPromptText(preset, sheetW, sheetH, DEFAULT_CHROMA_KEY_HEX);
  if (!quiet) {
    log("DEBUG", "prompt", "sheet preview", { text: sheetPrompt.slice(0, 200) + "…" });
  }
  log("INFO", "prompt", "built sheet prompt", { chars: sheetPrompt.length });

  log("INFO", "sheet", "mock generateSheet + crop", { sheetPx: `${sheetW}x${sheetH}`, sheetOnlyOutput });
  const t0 = Date.now();
  const sheetLayout =
    preset.generatorConfig?.sheetLayout ??
    (cellW === cellH ? sheetLayoutFromCrops(sheet.crops, tileSize) : sheetLayoutFromCropsRect(sheet.crops, cellW, cellH));
  const genConfig = resolveGeneratorConfig(preset, {
    tileSize,
    tileWidth: cellW,
    tileHeight: cellH,
    seed,
    sheetLayout,
  });
  const { buffer } = await mockGenerateSheet(frames, genConfig);
  timings["mockSheet"] = Date.now() - t0;
  if (keepSheet) {
    await writeFile(join(preset.outBase, "sheet.png"), buffer);
    log("INFO", "sheet", "wrote sheet.png (keepSheet, mock)");
  }
  const png = PNG.sync.read(buffer);
  if (png.width !== sheetW || png.height !== sheetH) {
    throw new Error(`mock sheet expected ${sheetW}x${sheetH}, got ${png.width}x${png.height}`);
  }
  if (sheetOnlyOutput) {
    for (const frame of frames) {
      const crop = sheet.crops[frame.id]!;
      const { x, y } = crop;
      generationResultsById[frame.id] = {
        wallMs: timings["mockSheet"]!,
        seed: undefined,
        seedRequested: null,
        fromSheet: true,
        sheetOnly: true,
        cropOrigin: `${x},${y}`,
        chromaApplied: false,
        chromaKeySource: null,
        notes: [],
      };
      log("INFO", `tile:${frame.id}`, "sheet-only mock: metadata only", { cropOrigin: `${x},${y}` });
    }
    generationResultsById["_sheet"] = { wallMs: timings["mockSheet"], strategy: "sheet", mode: "mock", alphaSource: "none" };
    return;
  }
  for (const frame of frames) {
    const crop = sheet.crops[frame.id]!;
    const { x, y } = crop;
    const tileBufRaw = extractPngRegion(png, x, y, cellW, cellH);
    const outPng = join(preset.outBase, frame.outSubdir ?? frame.id, pngName);
    await writeFile(outPng, tileBufRaw);
    generationResultsById[frame.id] = {
      wallMs: timings["mockSheet"]!,
      seed: undefined,
      seedRequested: null,
      fromSheet: true,
      cropOrigin: `${x},${y}`,
      chromaApplied: false,
      chromaKeySource: null,
      notes: [],
    };
    log("INFO", `tile:${frame.id}`, "cropped from mock sheet", { cropOrigin: `${x},${y}`, bytes: tileBufRaw.length });
  }
  generationResultsById["_sheet"] = { wallMs: timings["mockSheet"], strategy: "sheet", mode: "mock", alphaSource: "none" };
}

async function runGeneratePerTilePath({
  preset,
  generationResultsById,
  timings,
  chromaKeyHex,
  chromaTolerance,
  chromaFringeEdgeDist,
  chromaSpillMaxDist,
  seed,
  endpoint,
  imageSize,
  quiet,
  savePreChroma = false,
  falExtras,
}: {
  preset: PipelinePreset;
  generationResultsById: Record<string, Record<string, unknown>>;
  timings: Record<string, number>;
  chromaKeyHex: string;
  chromaTolerance: number;
  chromaFringeEdgeDist?: number;
  chromaSpillMaxDist?: number;
  seed?: number;
  endpoint: string;
  imageSize: string;
  quiet: boolean;
  savePreChroma?: boolean;
  falExtras?: Record<string, unknown>;
}): Promise<void> {
  const pngName = pngBasename(preset);
  const keyRgb = parseHexRgb(chromaKeyHex);
  const postSteps = resolvePostprocessSteps(preset, "generate");
  const { prompt, tileSize, frames } = preset;
  const cellW = tileSize;
  const cellH = preset.tileHeight ?? tileSize;
  const perTileImageSize = `${cellW}x${cellH}`;
  for (const frame of frames) {
    const folder = join(preset.outBase, frame.outSubdir ?? frame.id);
    await mkdir(folder, { recursive: true });
    const outPng = join(folder, pngName);
    const subject = frame.promptVariant ?? "";
    const text = buildPrompt({
      tileSize: cellW,
      chromaKeyHex,
      style: prompt.frameStyle,
      composition: prompt.frameComposition,
      subject,
      suffix: prompt.framePromptSuffix ?? DPAD_FRAME_PROMPT_SUFFIX,
      cellWidth: cellW,
      cellHeight: cellH,
    });
    log("INFO", "prompt", `built per-tile prompt [${frame.id}]`, { chars: text.length });

    log("INFO", `tile:${frame.id}`, "begin fal generate", { outPng });
    const t0 = Date.now();
    const gen = await falSubscribeToBuffer({
      endpoint,
      prompt: text,
      imageSize: cellW !== cellH ? perTileImageSize : imageSize,
      seed,
      quiet,
      falExtraInput: falExtras,
      log,
    });
    let buffer = gen.buffer;
    const outSeed = gen.seed;
    void gen.wallMs;
    {
      const png = PNG.sync.read(buffer);
      if (png.width !== cellW || png.height !== cellH) {
        log("INFO", `tile:${frame.id}`, "fal output dimensions differ from preset nominal; saving native raster (no on-disk resize)", {
          got: `${png.width}x${png.height}`,
          nominalPreset: `${cellW}x${cellH}`,
        });
      }
    }
    if (savePreChroma) {
      const rawName = pngName.replace(/\.png$/i, "") + "-pre-chroma.png";
      const rawPath = join(folder, rawName);
      await writeFile(rawPath, buffer);
      log("INFO", `tile:${frame.id}`, "wrote pre-chroma PNG", { path: rawPath });
    }
    const { buffer: outBuf, chromaApplied, chromaKeySource } = applyPostprocessPipeline(buffer, postSteps, {
      keyRgb,
      chromaTolerance,
      chromaFringeEdgeDist,
      chromaSpillMaxDist,
      log,
    });
    const outPngDecoded = PNG.sync.read(outBuf);
    assertPngBufferDimensions(outBuf, outPngDecoded.width, outPngDecoded.height, `pipeline:raster-after-tile:${frame.id}`);
    await writeFile(outPng, outBuf);
    timings[frame.id] = Date.now() - t0;
    generationResultsById[frame.id] = {
      seed: outSeed,
      seedRequested: seed ?? null,
      wallMs: timings[frame.id],
      chromaApplied,
      chromaKeySource: chromaApplied && chromaKeySource ? chromaKeySource : null,
      decodedWidth: outPngDecoded.width,
      decodedHeight: outPngDecoded.height,
      notes: [],
    };
    log("INFO", `tile:${frame.id}`, "fal PNG + chroma saved", generationResultsById[frame.id]);
  }
}

async function runGenerateSheetPath({
  preset,
  generationResultsById,
  timings,
  chromaKeyHex,
  chromaTolerance,
  chromaFringeEdgeDist,
  chromaSpillMaxDist,
  seed,
  endpoint,
  quiet,
  keepSheet,
  falExtras,
  falSubscribe,
  fetch: fetchImpl,
  sheetRewriteEnabled = false,
  sheetRewriteModel = DEFAULT_SHEET_REWRITE_MODEL,
  sheetRewriteSystemPrompt = DEFAULT_SHEET_REWRITE_SYSTEM_PROMPT,
  sheetRewriteTemperature,
  sheetRewriteMaxTokens,
  chromaAfterBria = false,
}: {
  preset: PipelinePreset;
  generationResultsById: Record<string, Record<string, unknown>>;
  timings: Record<string, number>;
  chromaKeyHex: string;
  chromaTolerance: number;
  chromaFringeEdgeDist?: number;
  chromaSpillMaxDist?: number;
  seed?: number;
  endpoint: string;
  quiet: boolean;
  keepSheet: boolean;
  falExtras?: Record<string, unknown>;
  falSubscribe?: FalClient["subscribe"];
  fetch?: typeof fetch;
  sheetRewriteEnabled?: boolean;
  sheetRewriteModel?: string;
  sheetRewriteSystemPrompt?: string;
  sheetRewriteTemperature?: number;
  sheetRewriteMaxTokens?: number;
  chromaAfterBria?: boolean;
}): Promise<{ effectiveSheet: ReturnType<typeof gridSheetFromRasterDimensions> | null }> {
  const sheet = preset.sheet!;
  const { width: sheetW, height: sheetH } = resolveSheetPixelDimensions(sheet);
  const pngName = pngBasename(preset);
  const keyRgb = parseHexRgb(chromaKeyHex);
  const useBria = shouldUseBriaSheetMatting(preset, endpoint);
  const sheetAlphaSource: "bria" | "chroma" = useBria ? "bria" : "chroma";
  /** FalSprite-style path: BRIA yields tile alpha; optional chroma is local fringe cleanup only. */
  const presetForTilePost = {
    ...preset,
    fal: { ...(preset.fal ?? {}), chromaAfterBria },
  };
  const postSteps = resolveSheetTilePostprocessSteps(presetForTilePost, "generate", sheetAlphaSource);
  const { tileSize, frames } = preset;
  const sheetOnlyOutput = Boolean(preset.sheetOnlyOutput);
  const sheetGridSize = preset.sheetGridSize ?? 4;

  if (!sheetOnlyOutput) {
    for (const f of frames) await mkdir(join(preset.outBase, f.outSubdir ?? f.id), { recursive: true });
  }

  const sheetPrompt = resolveSheetPromptText(preset, sheetW, sheetH, chromaKeyHex);

  let promptForT2i: string = sheetPrompt;
  let rewriteWallMs: number | undefined;
  if (sheetRewriteEnabled) {
    const rewriteUser = resolveSheetRewriteUserPrompt(preset, sheetPrompt, sheetGridSize);
    const rw = await rewritePromptViaOpenRouter({
      userPrompt: rewriteUser,
      systemPrompt: sheetRewriteSystemPrompt,
      model: sheetRewriteModel,
      temperature: sheetRewriteTemperature,
      maxTokens: sheetRewriteMaxTokens,
      quiet,
      log,
      falSubscribe,
    });
    promptForT2i =
      typeof preset.prompt?.sheetPromptBuilder === "function"
        ? preset.prompt.sheetPromptBuilder({
            sheetWidth: sheetW,
            sheetHeight: sheetH,
            chromaKeyHex,
            rewrittenBase: rw.text.trim(),
          })
        : rw.text;
    rewriteWallMs = rw.wallMs;
    timings["rewritePrompt"] = rewriteWallMs;
  } else {
    log("INFO", "sheet", "prompt rewrite (openrouter) skipped", { reason: "disabled" });
  }

  log("INFO", "prompt", "sheet prompt for T2I", {
    chars: promptForT2i.length,
    sha256Hex16: hashPromptForLog(promptForT2i),
  });

  const imageSizeStr = `${sheetW}x${sheetH}`;
  log("INFO", "sheet", useBria ? "T2I → BRIA matting → normalize → RGBA tile crops" : "single fal job + crop + chroma", {
    sheetPx: imageSizeStr,
    sheetMatting: useBria ? "bria" : "none",
    chromaAfterBria: useBria ? chromaAfterBria : null,
    sheetOnlyOutput,
    sheetNativeRaster: Boolean(preset.sheetNativeRaster),
  });

  const imageStrategy = getFalImageEndpointStrategy(endpoint);
  const t2iInput = imageStrategy.buildInput({
    prompt: promptForT2i,
    imageSize: imageSizeStr,
    seed,
    falExtraInput: falExtras,
  });

  let buffer!: Buffer;
  let outSeed: number | undefined;
  let t2iWallMs = 0;
  let briaWallMs: number | null = null;

  if (useBria) {
    const t2i = await falSubscribeImageToUrlResult({
      endpoint,
      input: t2iInput as Record<string, unknown>,
      quiet,
      log,
      falSubscribe,
    });
    outSeed = t2i.seed;
    t2iWallMs = t2i.wallMs;
    const bria = await falSubscribeBriaBackgroundRemoveToBuffer({
      imageUrl: t2i.imageUrl,
      quiet,
      log,
      falSubscribe,
      fetch: fetchImpl,
    });
    buffer = bria.buffer;
    briaWallMs = bria.wallMs;
    timings["sheetT2i"] = t2iWallMs;
    timings["briaSheet"] = briaWallMs;
  } else {
    const gen = await falSubscribeToBuffer({
      endpoint,
      prompt: promptForT2i,
      imageSize: imageSizeStr,
      seed,
      quiet,
      falExtraInput: falExtras,
      log,
      falSubscribe,
      fetch: fetchImpl,
    });
    buffer = gen.buffer;
    outSeed = gen.seed;
    t2iWallMs = gen.wallMs;
  }

  const totalWallMs = useBria ? t2iWallMs + (briaWallMs ?? 0) : t2iWallMs;
  timings["sheetFal"] = totalWallMs;

  let effectiveSheetOverride: ReturnType<typeof gridSheetFromRasterDimensions> | null = null;
  let png = PNG.sync.read(buffer);
  let effW = sheetW;
  let effH = sheetH;
  let effSheet: PipelinePresetSheet | ReturnType<typeof gridSheetFromRasterDimensions> = sheet;

  if (png.width !== sheetW || png.height !== sheetH) {
    log("INFO", "sheet", "fal/BRIA dimensions differ from preset nominal; keeping native raster (no on-disk resize)", {
      got: `${png.width}x${png.height}`,
      nominalPreset: `${sheetW}x${sheetH}`,
    });
    const rasterSheet = gridSheetFromRasterDimensions(png.width, png.height, preset);
    effSheet = rasterSheet;
    effW = png.width;
    effH = png.height;
    effectiveSheetOverride = rasterSheet;
  }
  assertPngBufferDimensions(buffer, effW, effH, "pipeline:raster-after-sheet");
  const cellW = effSheet.spriteWidth ?? tileSize;
  const cellH = effSheet.spriteHeight ?? tileSize;
  if (keepSheet) {
    await writeFile(join(preset.outBase, "sheet.png"), buffer);
    log("INFO", "sheet", "wrote sheet.png (keepSheet, same grid as tile crops)", {
      postMatting: useBria ? "bria" : "raw-t2i",
      pixels: `${effW}x${effH}`,
    });
  }
  if (sheetOnlyOutput) {
    for (const frame of frames) {
      const crop = effSheet.crops[frame.id]!;
      const { x, y } = crop;
      generationResultsById[frame.id] = {
        seed: outSeed,
        seedRequested: seed ?? null,
        wallMs: totalWallMs,
        fromSheet: true,
        sheetOnly: true,
        cropOrigin: `${x},${y}`,
        alphaSource: sheetAlphaSource,
        chromaApplied: false,
        chromaKeySource: null,
        notes: [],
      };
      log("INFO", `tile:${frame.id}`, "sheet-only: metadata (no tile PNG)", { cropOrigin: `${x},${y}` });
    }
  } else {
    for (const frame of frames) {
      const crop = effSheet.crops[frame.id]!;
      const { x, y } = crop;
      const tileBufRaw = extractPngRegion(png, x, y, cellW, cellH);
      const { buffer: tileBuf, chromaApplied, chromaKeySource } = applyPostprocessPipeline(tileBufRaw, postSteps, {
        keyRgb,
        chromaTolerance,
        chromaFringeEdgeDist,
        chromaSpillMaxDist,
        log,
      });
      const outPng = join(preset.outBase, frame.outSubdir ?? frame.id, pngName);
      await writeFile(outPng, tileBuf);
      generationResultsById[frame.id] = {
        seed: outSeed,
        seedRequested: seed ?? null,
        wallMs: totalWallMs,
        fromSheet: true,
        cropOrigin: `${x},${y}`,
        alphaSource: sheetAlphaSource,
        chromaApplied,
        chromaKeySource: chromaApplied && chromaKeySource ? chromaKeySource : null,
        notes: [],
      };
      log("INFO", `tile:${frame.id}`, useBria ? "cropped from matted sheet" : "cropped from sheet + chroma", {
        cropOrigin: `${x},${y}`,
        bytes: tileBuf.length,
      });
    }
  }
  const sheetMeta: Record<string, unknown> = {
    seed: outSeed,
    wallMs: totalWallMs,
    strategy: "sheet",
    alphaSource: sheetAlphaSource,
  };
  if (useBria) {
    sheetMeta["t2iWallMs"] = t2iWallMs;
    sheetMeta["briaWallMs"] = briaWallMs;
  }
  if (sheetRewriteEnabled) {
    sheetMeta["rewriteModel"] = sheetRewriteModel;
    sheetMeta["rewrittenPromptFingerprint"] = hashPromptForLog(promptForT2i);
    if (rewriteWallMs !== undefined) {
      sheetMeta["rewriteWallMs"] = rewriteWallMs;
    }
  }
  generationResultsById["_sheet"] = sheetMeta;
  return { effectiveSheet: effectiveSheetOverride };
}
