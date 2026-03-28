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
 */

import { fal } from "@fal-ai/client";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { PNG } from "pngjs";

import { falSubscribeToBuffer, formatFalClientError, resolveFalCredentials } from "./generators/fal.mjs";
import { generate as mockGenerate, generateSheet as mockGenerateSheet } from "./generators/mock.mjs";
import { log } from "./logging.mjs";
import { buildInitialManifest, buildRecipeId } from "./manifest.mjs";
import { buildPrompt, buildSheetPrompt, DEFAULT_CHROMA_KEY_HEX } from "./prompt.mjs";
import { applyPostprocessPipeline, resolveGeneratorConfig, resolvePostprocessSteps } from "./pipeline-stages.mjs";
import { extractPngRegion } from "./postprocess/png-region.mjs";
import { runPngAnalyzeBridge } from "./qa/analyze-bridge.mjs";
import { DEFAULT_TILE_PNG_BASENAME, writeSpriteRef } from "./sprite-ref.mjs";
import { sheetLayoutFromCrops } from "./sheet-layout.mjs";

const DEFAULT_FAL_ENDPOINT = "fal-ai/flux/dev";

export {
  POSTPROCESS_REGISTRY,
  DEFAULT_POSTPROCESS_STEPS_GENERATE,
  resolvePostprocessSteps,
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
 */

/**
 * @typedef {object} PipelinePreset
 * @property {string} presetId  Manifest `preset` field (e.g. `dpad_four_way`).
 * @property {string} kind  Manifest `kind` (e.g. `dpad_tile_set`).
 * @property {import('./generators/types.mjs').GeneratorFrame[]} frames
 * @property {string} outBase  Absolute directory root for tiles + manifest + sprite-ref.
 * @property {number} tileSize
 * @property {{ size: number; crops: Record<string, { x: number; y: number }> }} [sheet]  Required when `strategy === 'sheet'`.
 * @property {{ frameStyle: string; frameComposition: string; sheetStyle: string; sheetComposition: string; sheetSubject: string }} prompt
 * @property {{ defaultEndpoint?: string; falExtrasPerTile?: Record<string, unknown> | null; falExtrasSheet?: Record<string, unknown> | null }} fal
 * @property {{ spriteWidth: number; spriteHeight: number }} qa
 * @property {{ tool: string; version: number }} provenance
 * @property {import('./sprite-ref.mjs').SpriteGenPresetTiles['spriteRef']} spriteRef
 * @property {import('./generators/types.mjs').MockGeneratorConfig} [generatorConfig]  Mock: merged via **`resolveGeneratorConfig`** into **`generate`** / **`generateSheet`** (e.g. **`shapeForFrame`**, **`sheetLayout`**).
 * @property {string[]} [postprocessSteps]  Generate mode only: ordered ids from **`POSTPROCESS_REGISTRY`** in **`pipeline-stages.mjs`** (default **`['chromaKey']`**). Mock mode ignores this.
 * @property {string} [specsNaming]  Optional override for manifest **`specs.naming`** (else derived from resolved PNG basename).
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
  const chromaTolerance = opts.chromaTolerance ?? 42;
  const seed = opts.seed;
  const endpoint = opts.endpoint ?? preset.fal?.defaultEndpoint ?? DEFAULT_FAL_ENDPOINT;
  const imageSize = opts.imageSize ?? `${preset.tileSize}x${preset.tileSize}`;
  const keepSheet = Boolean(opts.keepSheet);

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
    for (const frame of frames) {
      const pngName = pngBasename(preset);
      log("INFO", "dry-run", `would write ${join(preset.outBase, frame.outSubdir ?? frame.id, pngName)}`);
    }
    if (mode === "generate") {
      if (strategy === "sheet" && preset.sheet) {
        log("INFO", "dry-run", "would call fal.subscribe ONCE", {
          endpoint,
          imageSize: `${preset.sheet.size}x${preset.sheet.size}`,
          seed: seed ?? null,
          keepSheet,
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

  await mkdir(preset.outBase, { recursive: true });

  const keyRgbForManifest = mode === "generate" ? parseHexRgb(chromaKeyHex) : null;

  if (mode === "mock" && strategy === "sheet" && preset.sheet) {
    await runMockSheetPath({
      preset,
      generationResultsById,
      timings,
      seed,
      quiet,
      keepSheet,
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
    await runGenerateSheetPath({
      preset,
      generationResultsById,
      timings,
      chromaKeyHex,
      chromaTolerance,
      seed,
      endpoint,
      quiet,
      keepSheet,
      falExtras:
        endpoint === (preset.fal?.defaultEndpoint ?? DEFAULT_FAL_ENDPOINT)
          ? preset.fal?.falExtrasSheet ?? undefined
          : undefined,
    });
  } else {
    await runGeneratePerTilePath({
      preset,
      generationResultsById,
      timings,
      chromaKeyHex,
      chromaTolerance,
      seed,
      endpoint,
      imageSize,
      quiet,
      falExtras:
        endpoint === (preset.fal?.defaultEndpoint ?? DEFAULT_FAL_ENDPOINT)
          ? preset.fal?.falExtrasPerTile ?? undefined
          : undefined,
    });
  }

  if (!skipQa) {
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
  } else {
    log("WARN", "qa", "skipped (skipQa)");
  }

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
      tileSize: preset.tileSize,
      sheetSize: preset.sheet?.size ?? preset.tileSize * 2,
      sheetCropMap: preset.sheet?.crops,
      chromaKeyHex,
      chromaTolerance,
      keyRgbForManifest,
      falExtrasPerTile: preset.fal?.falExtrasPerTile ?? null,
      falExtrasSheet: preset.fal?.falExtrasSheet ?? null,
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

  const spriteRefPath = await writeSpriteRef(
    {
      id: preset.presetId,
      tileSize: preset.tileSize,
      frames,
      spriteRef: preset.spriteRef,
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
  const sheet = /** @type {{ size: number; crops: Record<string, { x: number; y: number }> }} */ (preset.sheet);
  const pngName = pngBasename(preset);
  const { prompt, tileSize, frames } = preset;
  for (const f of frames) await mkdir(join(preset.outBase, f.outSubdir ?? f.id), { recursive: true });

  const sheetPrompt = buildSheetPrompt({
    sheetSize: sheet.size,
    chromaKeyHex: DEFAULT_CHROMA_KEY_HEX,
    style: prompt.sheetStyle,
    composition: prompt.sheetComposition,
    subject: prompt.sheetSubject,
  });
  if (!quiet) {
    log("DEBUG", "prompt", "sheet preview", { text: sheetPrompt.slice(0, 200) + "…" });
  }
  log("INFO", "prompt", "built sheet prompt", { chars: sheetPrompt.length });

  log("INFO", "sheet", "mock generateSheet + crop", { sheetPx: sheet.size });
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
  if (png.width !== sheet.size || png.height !== sheet.size) {
    throw new Error(`mock sheet expected ${sheet.size}x${sheet.size}, got ${png.width}x${png.height}`);
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
  generationResultsById._sheet = { wallMs: timings.mockSheet, strategy: "sheet", mode: "mock" };
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
 * @param {Record<string, unknown>} [p.falExtras]
 */
async function runGeneratePerTilePath({
  preset,
  generationResultsById,
  timings,
  chromaKeyHex,
  chromaTolerance,
  seed,
  endpoint,
  imageSize,
  quiet,
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
    });
    log("INFO", "prompt", `built per-tile prompt [${frame.id}]`, { chars: text.length });

    log("INFO", `tile:${frame.id}`, "begin fal generate", { outPng });
    const t0 = Date.now();
    const { buffer, seed: outSeed, wallMs } = await falSubscribeToBuffer({
      endpoint,
      prompt: text,
      imageSize,
      seed,
      quiet,
      falExtraInput: falExtras,
      log,
    });
    const { buffer: outBuf, chromaApplied, chromaKeySource } = applyPostprocessPipeline(buffer, postSteps, {
      keyRgb,
      chromaTolerance,
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
 */
async function runGenerateSheetPath({
  preset,
  generationResultsById,
  timings,
  chromaKeyHex,
  chromaTolerance,
  seed,
  endpoint,
  quiet,
  keepSheet,
  falExtras,
}) {
  const sheet = /** @type {{ size: number; crops: Record<string, { x: number; y: number }> }} */ (preset.sheet);
  const pngName = pngBasename(preset);
  const keyRgb = parseHexRgb(chromaKeyHex);
  const postSteps = resolvePostprocessSteps(preset, "generate");
  const { prompt, tileSize, frames } = preset;

  for (const f of frames) await mkdir(join(preset.outBase, f.outSubdir ?? f.id), { recursive: true });

  const sheetPrompt = buildSheetPrompt({
    sheetSize: sheet.size,
    chromaKeyHex,
    style: prompt.sheetStyle,
    composition: prompt.sheetComposition,
    subject: prompt.sheetSubject,
  });
  log("INFO", "prompt", "built sheet prompt", { chars: sheetPrompt.length });

  log("INFO", "sheet", "single fal job + crop + chroma", { sheetPx: sheet.size });
  const { buffer, seed: outSeed, wallMs } = await falSubscribeToBuffer({
    endpoint,
    prompt: sheetPrompt,
    imageSize: `${sheet.size}x${sheet.size}`,
    seed,
    quiet,
    falExtraInput: falExtras,
    log,
  });
  timings.sheetFal = wallMs;
  if (keepSheet) {
    await writeFile(join(preset.outBase, "sheet.png"), buffer);
    log("INFO", "sheet", "wrote sheet.png (keepSheet, pre-chroma)");
  }
  const png = PNG.sync.read(buffer);
  if (png.width !== sheet.size || png.height !== sheet.size) {
    throw new Error(`expected fal output ${sheet.size}x${sheet.size}, got ${png.width}x${png.height}`);
  }
  for (const frame of frames) {
    const { x, y } = sheet.crops[frame.id];
    const tileBufRaw = extractPngRegion(png, x, y, tileSize, tileSize);
    const { buffer: tileBuf, chromaApplied, chromaKeySource } = applyPostprocessPipeline(tileBufRaw, postSteps, {
      keyRgb,
      chromaTolerance,
      log,
    });
    const outPng = join(preset.outBase, frame.outSubdir ?? frame.id, pngName);
    await writeFile(outPng, tileBuf);
    generationResultsById[frame.id] = {
      seed: outSeed,
      seedRequested: seed ?? null,
      wallMs,
      fromSheet: true,
      cropOrigin: `${x},${y}`,
      chromaApplied,
      chromaKeySource: chromaApplied && chromaKeySource ? chromaKeySource : null,
      notes: [],
    };
    log("INFO", `tile:${frame.id}`, "cropped from sheet + chroma", { cropOrigin: `${x},${y}`, bytes: tileBuf.length });
  }
  generationResultsById._sheet = { seed: outSeed, wallMs, strategy: "sheet" };
}
