/**
 * Sprite-generation pipeline: **`runPipeline(preset, opts)`** runs **prompt → generator →
 * postprocess (ordered **`postprocessSteps`** from **`pipeline-stages.mjs`**) → QA (optional) → manifest + sprite-ref writes**, with structured logs via
 * **`logging.mjs`**.
 *
 * Supports **per-tile** (one `generate()` per frame) and **sheet** (`generateSheet()` then
 * deterministic crops using **`preset.sheet.size`** and **`preset.sheet.crops`**).
 *
 * **Determinism vs variance:** sheet/tile **geometry** (crops, dimensions) and the **QA cell grid**
 * (`preset.qa`) are deterministic. **T2I** output and **chroma** postprocess (tolerance, heuristics) are
 * stochastic — see **`README.md`** in this directory.
 *
 * @see `README.md` — T2I/chroma variance vs enforced grid geometry
 * @see `pipeline-stages.mjs` — `applyPostprocessPipeline`, chroma and other postprocess steps
 * @see `qa/analyze-bridge.mjs` — QA png-analyze bridge (`runPngAnalyzeBridge`)
 * @see `generators/types.mjs` — generator contracts
 * @see `presets/dpad.mjs` — D-pad preset (`createPreset`); canonical constants + `runPipeline` config.
 *
 * ## Raster WxH (**2gp-6iay**, normalization **2gp-r67u** in **`postprocess/png-region.mjs`**)
 *
 * After fal download, **`normalizeDecodedSheetToPreset`** may run so the decoded PNG matches **`preset.sheet`**
 * (sheet path) or **`tileSize`** (per-tile), **unless** **`preset.sheetNativeRaster`** is set (keep T2I/BRIA pixels;
 * manifest + sprite-ref use derived cell size). **`assertPngBufferDimensions`** checks **`generators/fal.mjs`**
 * at **`pipeline:raster-after-*-normalize`** (model output).
 */

import { fal } from "@fal-ai/client";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";

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
} from "./generators/fal.mjs";
import { generate as mockGenerate, generateSheet as mockGenerateSheet } from "./generators/mock.mjs";
import { log } from "./logging.mjs";
import { buildInitialManifest, buildRecipeId } from "./manifest.mjs";
import {
  buildFalspriteStyleSpritePrompt,
  buildPrompt,
  buildSheetPrompt,
  DEFAULT_CHROMA_KEY_HEX,
  DPAD_FRAME_PROMPT_SUFFIX,
} from "./prompt.mjs";
import {
  applyPostprocessPipeline,
  resolveGeneratorConfig,
  resolvePostprocessSteps,
  resolveSheetTilePostprocessSteps,
} from "./pipeline-stages.mjs";
import { extractPngRegion, normalizeDecodedSheetToPreset } from "./postprocess/png-region.mjs";
import { runPngAnalyzeBridge } from "./qa/analyze-bridge.mjs";
import { DEFAULT_TILE_PNG_BASENAME, writeSpriteRef } from "./sprite-ref.mjs";
import { sheetLayoutFromCrops } from "./sheet-layout.mjs";

const DEFAULT_FAL_ENDPOINT = "fal-ai/flux/dev";

/**
 * @param {{ width?: number; height?: number; size?: number } | undefined} sheet
 * @returns {{ width: number; height: number }}
 */
function resolveSheetPixelDimensions(sheet) {
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
 * Used when **`sheetNativeRaster`** keeps fal/BRIA output size; crops follow **`frameSheetCells`** when set,
 * else **`sheet.crops`** scaled from the preset’s nominal sheet size.
 *
 * @param {number} width
 * @param {number} height
 * @param {PipelinePreset} preset
 * @returns {NonNullable<PipelinePreset['sheet']> & { width: number; height: number; spriteWidth: number; spriteHeight: number; crops: Record<string, { x: number; y: number }> }}
 */
function gridSheetFromRasterDimensions(width, height, preset) {
  const sheet = /** @type {NonNullable<PipelinePreset['sheet']>} */ (preset.sheet);
  const cols = sheet.columns;
  const rows = sheet.rows;
  if (cols == null || rows == null) {
    throw new Error("sheetNativeRaster requires preset.sheet.rows and preset.sheet.columns (uniform grid)");
  }
  const cw = width / cols;
  const ch = height / rows;
  if (!Number.isInteger(cw) || !Number.isInteger(ch)) {
    throw new Error(
      `sheetNativeRaster: ${width}×${height} not evenly divisible by ${cols}×${rows} grid (cell ${cw}×${ch})`,
    );
  }
  /** @type {Record<string, { x: number; y: number }>} */
  const crops = {};
  if (preset.frameSheetCells) {
    for (const f of preset.frames) {
      const cell = preset.frameSheetCells[f.id];
      if (!cell) {
        throw new Error(`sheetNativeRaster: frameSheetCells missing for frame id ${JSON.stringify(f.id)}`);
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
        throw new Error(`sheetNativeRaster: sheet.crops missing for frame id ${JSON.stringify(f.id)}`);
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
} from "./pipeline-stages.mjs";

/**
 * @param {string} hex
 * @returns {{ r: number; g: number; b: number }}
 */
function parseHexRgb(hex) {
  const s = String(hex).trim();
  const m = /^#?([0-9a-fA-F]{6})$/.exec(s);
  if (!m) throw new Error(`invalid hex color: ${hex}`);
  const n = Number.parseInt(m[1], 16);
  return { r: (n >> 16) & 0xff, g: (n >> 8) & 0xff, b: n & 0xff };
}

/** @param {string} s */
function maskSecret(s) {
  const t = String(s).trim();
  if (t.length <= 8) return "(length<=8, hidden)";
  return `len=${t.length} suffix=...${t.slice(-4)}`;
}

/** @type {Record<number, string>} */
const SHEET_GRID_WORDS = { 2: "two", 3: "three", 4: "four", 5: "five", 6: "six" };

/**
 * @param {{ prompt: { sheetStyle: string; sheetComposition: string; sheetSubject: string; sheetPromptBuilder?: (ctx: { sheetWidth: number; sheetHeight: number; chromaKeyHex: string }) => string } }} preset
 * @param {number} sheetW
 * @param {number} sheetH
 * @param {string} chromaKeyHex
 */
function resolveSheetPromptText(preset, sheetW, sheetH, chromaKeyHex) {
  const p = preset.prompt;
  if (typeof p?.sheetPromptBuilder === "function") {
    return p.sheetPromptBuilder({ sheetWidth: sheetW, sheetHeight: sheetH, chromaKeyHex });
  }
  return buildSheetPrompt({
    sheetWidth: sheetW,
    sheetHeight: sheetH,
    chromaKeyHex,
    style: p.sheetStyle,
    composition: p.sheetComposition,
    subject: p.sheetSubject,
  });
}

/**
 * @param {{ prompt: { sheetRewriteUserPrompt?: string } }} preset
 * @param {string} sheetPrompt
 * @param {number} [sheetGridSize]
 */
function resolveSheetRewriteUserPrompt(preset, sheetPrompt, sheetGridSize) {
  const seed = preset.prompt?.sheetRewriteUserPrompt;
  if (typeof seed !== "string" || !seed.trim()) {
    return sheetPrompt;
  }
  const gs = sheetGridSize ?? 4;
  const gridWord = SHEET_GRID_WORDS[gs] ?? "four";
  return `Design the character and choreograph a ${gridWord}-beat animation loop for: ${seed.trim()}`;
}

/**
 * @typedef {object} PipelineOpts
 * @property {'mock'|'generate'} mode
 * @property {'per-tile'|'sheet'} [strategy]  Default **per-tile** (matches `dpad-workflow` defaults).
 * @property {boolean} [dryRun]
 * @property {boolean} [skipQa]
 * @property {boolean} [quiet]
 * @property {string} [chromaKeyHex]
 * @property {number} [chromaTolerance]
 * @property {number} [seed]
 * @property {string} [endpoint]
 * @property {string} [imageSize]  Per-tile fal size, e.g. `256x256`
 * @property {boolean} [keepSheet]  Write `sheet.png` under `outBase` (sheet strategy).
 * @property {boolean} [savePreChroma]  Per-tile generate: write `dpad-pre-chroma.png` beside each tile (raw fal PNG before chroma).
 * @property {import('@fal-ai/client').FalClient['subscribe']} [falSubscribe]  Test injection: mock **`fal.subscribe`** (sheet path T2I + BRIA chain).
 * @property {typeof fetch} [fetch]  Test injection for image downloads.
 * @property {boolean} [sheetRewrite]  When set, overrides **`preset.fal.sheetRewrite?.enabled`** for sheet strategy (optional OpenRouter rewrite before T2I).
 * @property {boolean} [chromaAfterBria]  When **`!== undefined`** (including explicit **`false`**), overrides **`preset.fal.chromaAfterBria`** for sheet strategy (optional per-tile chroma after BRIA matting).
 * @property {number} [chromaFringeEdgeDist]  Optional looser Euclidean peel on silhouette after chroma (see **`removeMagentaFringeAdjacentToTransparent`**); overrides **`preset.fal.chromaFringeEdgeDist`** when set.
 * @property {number} [chromaSpillMaxDist]  Optional: after fringe, key semi-transparent pixels near key (see **`keySemiTransparentNearKey`**); overrides **`preset.fal.chromaSpillMaxDist`** when set.
 */

/**
 * @typedef {object} PipelinePreset
 * @property {string} presetId  Manifest `preset` field (e.g. `dpad_four_way`).
 * @property {string} kind  Manifest `kind` (e.g. `dpad_tile_set`).
 * @property {import('./generators/types.mjs').GeneratorFrame[]} frames
 * @property {string} outBase  Absolute directory root for tiles + manifest + sprite-ref.
 * @property {number} tileSize
 * @property {{ width?: number; height?: number; size?: number; crops: Record<string, { x: number; y: number }>; rows?: number; columns?: number; spriteWidth?: number; spriteHeight?: number }} [sheet]  Required when `strategy === 'sheet'` (use **`width`+`height`** or legacy square **`size`**). **`rows`** / **`columns`** / **`spriteWidth`** / **`spriteHeight`** optional unless **`sheetNativeRaster`** or **`gridFrameKeys`** sprite-ref.
 * @property {{ frameStyle: string; frameComposition: string; sheetStyle: string; sheetComposition: string; sheetSubject: string; framePromptSuffix?: string; sheetPromptBuilder?: (ctx: { sheetWidth: number; sheetHeight: number; chromaKeyHex: string }) => string; sheetRewriteUserPrompt?: string }} prompt
 * @property {{ defaultEndpoint?: string; falExtrasPerTile?: Record<string, unknown> | null; falExtrasSheet?: Record<string, unknown> | null; sheetMatting?: 'auto' | 'bria' | 'none'; chromaAfterBria?: boolean; chromaFringeEdgeDist?: number; chromaSpillMaxDist?: number; sheetRewrite?: { enabled?: boolean; model?: string; systemPrompt?: string; temperature?: number; maxTokens?: number } }} fal
 * @property {{ spriteWidth: number; spriteHeight: number }} qa
 * @property {{ tool: string; version: number }} provenance
 * @property {import('./sprite-ref.mjs').SpriteGenPresetTiles['spriteRef']} spriteRef  Also **`gridFrameKeys`** variant (see **`sprite-ref.mjs`**).
 * @property {boolean} [sheetOnlyOutput]  When true: write **`sheet.png`** only (no per-frame PNGs under frame dirs).
 * @property {number} [sheetGridSize]  Falsprite N×N grid dimension (rewrite beat wording + prompt wrap).
 * @property {Record<string, { column: number; row: number }>} [frameSheetCells]  Required for **`spriteRef.kind === 'gridFrameKeys'`** when writing sprite-ref.
 * @property {import('./generators/types.mjs').MockGeneratorConfig} [generatorConfig]  Mock: merged via **`resolveGeneratorConfig`** into **`generate`** / **`generateSheet`** (e.g. **`shapeForFrame`**, **`sheetLayout`**).
 * @property {string[]} [postprocessSteps]  Generate mode only: ordered ids from **`POSTPROCESS_REGISTRY`** in **`pipeline-stages.mjs`** (default **`['chromaKey']`**). Mock mode ignores this.
 * @property {string} [specsNaming]  Optional override for manifest **`specs.naming`** (else derived from resolved PNG basename).
 * @property {boolean} [sheetNativeRaster]  Sheet **generate** only: if fal/BRIA PNG size ≠ **`preset.sheet`**, keep native dimensions (no NN downscale); manifest + sprite-ref use uniform grid cell size derived from the raster.
 */

/**
 * @param {PipelinePreset} preset
 * @param {PipelineOpts} opts
 * @returns {Promise<{ manifestPath: string; spriteRefPath: string; outBase: string; generationResultsById: Record<string, Record<string, unknown>>; timings: Record<string, number> }>}
 */
export async function runPipeline(preset, opts) {
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
  /** @type {boolean} */
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

  /** @type {Record<string, Record<string, unknown>>} */
  const generationResultsById = {};
  /** @type {Record<string, number>} */
  const timings = {};
  /** Sheet dimensions + crops after generate-sheet when **`sheetNativeRaster`** kept a larger fal/BRIA buffer. */
  /** @type {null | NonNullable<PipelinePreset['sheet']>} */
  let effectiveSheetForManifest = null;

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
        if (generationResultsById[frame.id]?.error) continue;
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
  const manifestTileSize = sheetForOutputs?.spriteWidth ?? preset.tileSize;

  const manifest = /** @type {Record<string, unknown>} */ (
    buildInitialManifest({
      kind: preset.kind,
      preset: preset.presetId,
      recipeId,
      createdAt,
      frames,
      mode,
      ...(mode === "generate" ? { strategy } : {}),
      endpoint: mode === "generate" ? endpoint : null,
      imageSize,
      tileSize: manifestTileSize,
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
    })
  );

  manifest.generationResults = generationResultsById;
  manifest.frames = frames.map((f) => {
    const r = generationResultsById[f.id];
    return r
      ? { id: f.id, outSubdir: f.outSubdir, ...r }
      : { id: f.id, outSubdir: f.outSubdir, pending: true };
  });

  const manifestPath = join(preset.outBase, "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  log("INFO", "manifest", `wrote ${manifestPath}`);

  const sheetForSpriteRef = sheetForOutputs ?? preset.sheet;
  const spriteRefPath = await writeSpriteRef(
    {
      id: preset.presetId,
      tileSize: sheetForSpriteRef?.spriteWidth ?? preset.tileSize,
      frames,
      spriteRef: preset.spriteRef,
      ...(preset.spriteRef?.kind === "gridFrameKeys"
        ? { sheet: sheetForSpriteRef, frameSheetCells: preset.frameSheetCells }
        : {}),
    },
    preset.outBase
  );
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

/**
 * @param {PipelinePreset} preset
 */
function pngBasename(preset) {
  const sr = preset.spriteRef;
  if (sr && sr.kind === "frameKeyRect") {
    return sr.pngFilename ?? DEFAULT_TILE_PNG_BASENAME;
  }
  return DEFAULT_TILE_PNG_BASENAME;
}

/**
 * @param {object} p
 * @param {PipelinePreset} p.preset
 * @param {Record<string, Record<string, unknown>>} p.generationResultsById
 * @param {Record<string, number>} p.timings
 * @param {number} [p.seed]
 * @param {boolean} p.quiet
 */
async function runMockPerTilePath({ preset, generationResultsById, timings, seed, quiet }) {
  const pngName = pngBasename(preset);
  const { prompt, tileSize, frames } = preset;
  for (const frame of frames) {
    const folder = join(preset.outBase, frame.outSubdir ?? frame.id);
    await mkdir(folder, { recursive: true });
    const outPng = join(folder, pngName);
    const subject = frame.promptVariant ?? "";
    const text = buildPrompt({
      tileSize,
      chromaKeyHex: DEFAULT_CHROMA_KEY_HEX,
      style: prompt.frameStyle,
      composition: prompt.frameComposition,
      subject,
      suffix: prompt.framePromptSuffix ?? DPAD_FRAME_PROMPT_SUFFIX,
    });
    if (!quiet) {
      log("DEBUG", "prompt", `preview [${frame.id}]`, { text: text.slice(0, 120) + "…" });
    }
    log("INFO", "prompt", `built per-tile prompt [${frame.id}]`, { chars: text.length });

    log("INFO", `tile:${frame.id}`, "begin mock generate", { outPng });
    const t0 = Date.now();
    const genConfig = resolveGeneratorConfig(preset, { tileSize, seed });
    const { buffer: buf } = await mockGenerate(frame, genConfig);
    timings[frame.id] = Date.now() - t0;
    await writeFile(outPng, buf);
    generationResultsById[frame.id] = {
      wallMs: timings[frame.id],
      seed: undefined,
      seedRequested: null,
      chromaApplied: false,
      chromaKeySource: null,
      notes: [],
    };
    log("INFO", `tile:${frame.id}`, "mock PNG written", { bytes: buf.length, wallMs: timings[frame.id] });
  }
}

/**
 * @param {object} p
 * @param {PipelinePreset} p.preset
 * @param {Record<string, Record<string, unknown>>} p.generationResultsById
 * @param {Record<string, number>} p.timings
 * @param {number} [p.seed]
 * @param {boolean} p.quiet
 * @param {boolean} p.keepSheet
 */
async function runMockSheetPath({ preset, generationResultsById, timings, seed, quiet, keepSheet }) {
  const sheetOnlyOutput = Boolean(preset.sheetOnlyOutput);
  const sheet = /** @type {{ width?: number; height?: number; size?: number; crops: Record<string, { x: number; y: number }> }} */ (
    preset.sheet
  );
  const { width: sheetW, height: sheetH } = resolveSheetPixelDimensions(sheet);
  const pngName = pngBasename(preset);
  const { tileSize, frames } = preset;
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
  // Pixel crop top-left → mock compositor cells: same grid as extractPngRegion (origins ÷ tileSize).
  const sheetLayout = preset.generatorConfig?.sheetLayout ?? sheetLayoutFromCrops(sheet.crops, tileSize);
  const genConfig = resolveGeneratorConfig(preset, { tileSize, seed, sheetLayout });
  const { buffer } = await mockGenerateSheet(frames, genConfig);
  timings.mockSheet = Date.now() - t0;
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
      const { x, y } = sheet.crops[frame.id];
      generationResultsById[frame.id] = {
        wallMs: timings.mockSheet,
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
    generationResultsById._sheet = { wallMs: timings.mockSheet, strategy: "sheet", mode: "mock", alphaSource: "none" };
    return;
  }
  for (const frame of frames) {
    const { x, y } = sheet.crops[frame.id];
    const tileBufRaw = extractPngRegion(png, x, y, tileSize, tileSize);
    const outPng = join(preset.outBase, frame.outSubdir ?? frame.id, pngName);
    await writeFile(outPng, tileBufRaw);
    generationResultsById[frame.id] = {
      wallMs: timings.mockSheet,
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
  generationResultsById._sheet = { wallMs: timings.mockSheet, strategy: "sheet", mode: "mock", alphaSource: "none" };
}

/**
 * @param {object} p
 * @param {PipelinePreset} p.preset
 * @param {Record<string, Record<string, unknown>>} p.generationResultsById
 * @param {Record<string, number>} p.timings
 * @param {string} p.chromaKeyHex
 * @param {number} p.chromaTolerance
 * @param {number} [p.seed]
 * @param {string} p.endpoint
 * @param {boolean} p.quiet
 * @param {boolean} [p.savePreChroma]
 * @param {Record<string, unknown>} [p.falExtras]
 */
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
}) {
  const pngName = pngBasename(preset);
  const keyRgb = parseHexRgb(chromaKeyHex);
  const postSteps = resolvePostprocessSteps(preset, "generate");
  const { prompt, tileSize, frames } = preset;
  for (const frame of frames) {
    const folder = join(preset.outBase, frame.outSubdir ?? frame.id);
    await mkdir(folder, { recursive: true });
    const outPng = join(folder, pngName);
    const subject = frame.promptVariant ?? "";
    const text = buildPrompt({
      tileSize,
      chromaKeyHex,
      style: prompt.frameStyle,
      composition: prompt.frameComposition,
      subject,
      suffix: prompt.framePromptSuffix ?? DPAD_FRAME_PROMPT_SUFFIX,
    });
    log("INFO", "prompt", `built per-tile prompt [${frame.id}]`, { chars: text.length });

    log("INFO", `tile:${frame.id}`, "begin fal generate", { outPng });
    const t0 = Date.now();
    const gen = await falSubscribeToBuffer({
      endpoint,
      prompt: text,
      imageSize,
      seed,
      quiet,
      falExtraInput: falExtras,
      log,
    });
    let buffer = gen.buffer;
    const outSeed = gen.seed;
    const wallMs = gen.wallMs;
    {
      let png = PNG.sync.read(buffer);
      if (png.width !== tileSize || png.height !== tileSize) {
        log("WARN", `tile:${frame.id}`, "fal output dimensions differ from preset tile; center-crop to square aspect then uniform nearest-neighbor scale (2gp-r67u policy)", {
          got: `${png.width}x${png.height}`,
          want: `${tileSize}x${tileSize}`,
        });
        buffer = normalizeDecodedSheetToPreset(buffer, tileSize, tileSize);
      }
      assertPngBufferDimensions(buffer, tileSize, tileSize, `pipeline:raster-after-tile-normalize:${frame.id}`);
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
    await writeFile(outPng, outBuf);
    timings[frame.id] = Date.now() - t0;
    generationResultsById[frame.id] = {
      seed: outSeed,
      seedRequested: seed ?? null,
      wallMs: timings[frame.id],
      chromaApplied,
      chromaKeySource: chromaApplied && chromaKeySource ? chromaKeySource : null,
      notes: [],
    };
    log("INFO", `tile:${frame.id}`, "fal PNG + chroma saved", generationResultsById[frame.id]);
  }
}

/**
 * @param {object} p
 * @param {PipelinePreset} p.preset
 * @param {Record<string, Record<string, unknown>>} p.generationResultsById
 * @param {Record<string, number>} p.timings
 * @param {string} p.chromaKeyHex
 * @param {number} p.chromaTolerance
 * @param {number} [p.seed]
 * @param {string} p.endpoint
 * @param {boolean} p.quiet
 * @param {boolean} p.keepSheet
 * @param {Record<string, unknown>} [p.falExtras]
 * @param {import('@fal-ai/client').FalClient['subscribe']} [p.falSubscribe]
 * @param {typeof fetch} [p.fetch]
 * @param {boolean} [p.sheetRewriteEnabled]
 * @param {string} [p.sheetRewriteModel]
 * @param {string} [p.sheetRewriteSystemPrompt]
 * @param {number} [p.sheetRewriteTemperature]
 * @param {number} [p.sheetRewriteMaxTokens]
 * @param {boolean} [p.chromaAfterBria]  Resolved from **`runPipeline`** opts vs preset (per-tile chroma after BRIA).
 * @param {number} [p.chromaFringeEdgeDist]
 * @param {number} [p.chromaSpillMaxDist]
 */
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
}) {
  const sheet = /** @type {{ width?: number; height?: number; size?: number; crops: Record<string, { x: number; y: number }> }} */ (
    preset.sheet
  );
  const { width: sheetW, height: sheetH } = resolveSheetPixelDimensions(sheet);
  const pngName = pngBasename(preset);
  const keyRgb = parseHexRgb(chromaKeyHex);
  const useBria = shouldUseBriaSheetMatting(preset, endpoint);
  /** @type {'bria'|'chroma'} */
  const sheetAlphaSource = useBria ? "bria" : "chroma";
  /** FalSprite-style path: BRIA yields tile alpha; optional chroma is local fringe cleanup only. */
  const presetForTilePost = {
    ...preset,
    fal: { ...(preset.fal ?? {}), chromaAfterBria },
  };
  const postSteps = resolveSheetTilePostprocessSteps(presetForTilePost, "generate", sheetAlphaSource);
  const { tileSize, frames } = preset;
  const sheetOnlyOutput = Boolean(preset.sheetOnlyOutput);
  const sheetGridSize = preset.sheetGridSize ?? 4;
  const hasFalspriteBuilder = typeof preset.prompt?.sheetPromptBuilder === "function";

  if (!sheetOnlyOutput) {
    for (const f of frames) await mkdir(join(preset.outBase, f.outSubdir ?? f.id), { recursive: true });
  }

  const sheetPrompt = resolveSheetPromptText(preset, sheetW, sheetH, chromaKeyHex);

  /** @type {string} */
  let promptForT2i = sheetPrompt;
  /** @type {number | undefined} */
  let rewriteWallMs;
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
    promptForT2i = hasFalspriteBuilder
      ? buildFalspriteStyleSpritePrompt(rw.text.trim(), sheetGridSize)
      : rw.text;
    rewriteWallMs = rw.wallMs;
    timings.rewritePrompt = rewriteWallMs;
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

  /** @type {Buffer} */
  let buffer;
  /** @type {number | undefined} */
  let outSeed;
  let t2iWallMs = 0;
  /** @type {number | null} */
  let briaWallMs = null;

  if (useBria) {
    const t2i = await falSubscribeImageToUrlResult({
      endpoint,
      input: /** @type {Record<string, unknown>} */ (t2iInput),
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
    timings.sheetT2i = t2iWallMs;
    timings.briaSheet = briaWallMs;
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
  timings.sheetFal = totalWallMs;

  /** @type {null | ReturnType<typeof gridSheetFromRasterDimensions>} */
  let effectiveSheetOverride = null;
  let png = PNG.sync.read(buffer);
  let effW = sheetW;
  let effH = sheetH;
  /** @type {typeof sheet} */
  let effSheet = sheet;

  if (png.width !== sheetW || png.height !== sheetH) {
    if (preset.sheetNativeRaster) {
      log("INFO", "sheet", "keeping native raster (sheetNativeRaster); skip NN downscale to preset", {
        got: `${png.width}x${png.height}`,
        preset: `${sheetW}x${sheetH}`,
      });
      effSheet = gridSheetFromRasterDimensions(png.width, png.height, preset);
      effW = png.width;
      effH = png.height;
      effectiveSheetOverride = effSheet;
    } else {
      // Sheet decode policy: center-crop to preset aspect then uniform nearest-neighbor — see **`postprocess/png-region.mjs`** (epic **2gp-p4js**, **2gp-r67u**).
      log("WARN", "sheet", "fal output dimensions differ from preset; center-cropping to strip aspect then uniform nearest-neighbor scale", {
        got: `${png.width}x${png.height}`,
        want: `${sheetW}x${sheetH}`,
      });
      buffer = normalizeDecodedSheetToPreset(buffer, sheetW, sheetH);
      png = PNG.sync.read(buffer);
      effW = sheetW;
      effH = sheetH;
      effSheet = sheet;
    }
  }
  assertPngBufferDimensions(buffer, effW, effH, "pipeline:raster-after-sheet-normalize");
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
      const { x, y } = effSheet.crops[frame.id];
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
      const { x, y } = effSheet.crops[frame.id];
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
  /** @type {Record<string, unknown>} */
  const sheetMeta = {
    seed: outSeed,
    wallMs: totalWallMs,
    strategy: "sheet",
    alphaSource: sheetAlphaSource,
  };
  if (useBria) {
    sheetMeta.t2iWallMs = t2iWallMs;
    sheetMeta.briaWallMs = briaWallMs;
  }
  if (sheetRewriteEnabled) {
    sheetMeta.rewriteModel = sheetRewriteModel;
    sheetMeta.rewrittenPromptFingerprint = hashPromptForLog(promptForT2i);
    if (rewriteWallMs !== undefined) {
      sheetMeta.rewriteWallMs = rewriteWallMs;
    }
  }
  generationResultsById._sheet = sheetMeta;
  return { effectiveSheet: effectiveSheetOverride };
}
