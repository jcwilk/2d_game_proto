/**
 * Data-driven **postprocess** and **generator config** helpers for `pipeline.mjs`.
 * Known postprocess step ids are registered in **`POSTPROCESS_REGISTRY`**; presets list
 * **`postprocessSteps`** (generate mode only) in order.
 *
 * **Alpha path:** **`chromaKey`** is the only per-tile postprocess id. **BRIA** sheet matting runs in
 * **`pipeline.mjs`** `runGenerateSheetPath` (not here) so matting stays **once per sheet** before crops.
 */

import {
  CHROMA_FALLBACK_TOLERANCE_MIN,
  chromaKeyWithBorderFallback,
  keySemiTransparentNearKey,
  removeMagentaFringeAdjacentToTransparent,
} from "./postprocess/chroma-key.ts";
import { countFullyTransparentPercent } from "./postprocess/png-region.ts";

/** Default when `preset.postprocessSteps` is omitted and `mode === 'generate'`. */
export const DEFAULT_POSTPROCESS_STEPS_GENERATE = Object.freeze(["chromaKey"]);

/**
 * @typedef {object} ChromaPostprocessCtx
 * @property {import('node:buffer').Buffer} buffer
 * @property {{ r: number; g: number; b: number }} keyRgb
 * @property {number} chromaTolerance
 * @property {number} [chromaFringeEdgeDist]  If set, after chroma peel near-magenta pixels that border transparency (Euclidean to key).
 * @property {number} [chromaSpillMaxDist]  After fringe: clear **semi-transparent** pixels within this Euclidean distance of the key (BRIA halos).
 * @property {(level: 'DEBUG'|'INFO'|'WARN'|'ERROR', step: string, message: string, extra?: Record<string, unknown>) => void} log
 */

/**
 * @param {ChromaPostprocessCtx} ctx
 * @returns {{ buffer: import('node:buffer').Buffer; chromaKeySource: 'prompt-hex'|'corner-median'; chromaApplied: true }}
 */
export function runChromaKeyStage(ctx) {
  const { buffer, keyRgb, chromaTolerance, log } = ctx;
  const { buffer: outBuf, usedPrimaryKey, keyRgb: effectiveChromaKey } = chromaKeyWithBorderFallback(buffer, {
    keyRgb,
    tolerance: chromaTolerance,
    fallbackTolerance: Math.max(chromaTolerance, CHROMA_FALLBACK_TOLERANCE_MIN),
  });
  if (!usedPrimaryKey) {
    log("WARN", "chroma", "primary hex key removed <0.8% pixels; using corner-median key", {
      inferred: effectiveChromaKey,
      transparentPercentAfter: countFullyTransparentPercent(outBuf).toFixed(2),
    });
  }
  let finalBuf = outBuf;
  const fringe = ctx.chromaFringeEdgeDist;
  if (typeof fringe === "number" && fringe > 0) {
    finalBuf = removeMagentaFringeAdjacentToTransparent(finalBuf, {
      keyRgb: effectiveChromaKey,
      edgeDist: fringe,
    });
  }
  const spill = ctx.chromaSpillMaxDist;
  if (typeof spill === "number" && spill > 0) {
    finalBuf = keySemiTransparentNearKey(finalBuf, {
      keyRgb: effectiveChromaKey,
      maxDist: spill,
    });
  }
  return {
    buffer: finalBuf,
    chromaKeySource: usedPrimaryKey ? "prompt-hex" : "corner-median",
    chromaApplied: true,
  };
}

/**
 * Ordered postprocess steps (generate path). Extend by adding functions here and documenting ids.
 *
 * @type {Record<string, (ctx: ChromaPostprocessCtx) => { buffer: import('node:buffer').Buffer; chromaKeySource?: 'prompt-hex'|'corner-median'; chromaApplied?: boolean }>}
 */
export const POSTPROCESS_REGISTRY = Object.freeze({
  chromaKey: runChromaKeyStage,
});

/**
 * @param {string} id
 * @returns {id is keyof typeof POSTPROCESS_REGISTRY}
 */
export function isKnownPostprocessStep(id) {
  return id in POSTPROCESS_REGISTRY;
}

/**
 * Postprocess runs only for **`mode === 'generate'`** (mock leaves RGBA from the mock generator as-is).
 *
 * @param {{ postprocessSteps?: string[] }} preset
 * @param {'mock'|'generate'} mode
 * @returns {string[]}
 */
export function resolvePostprocessSteps(preset, mode) {
  if (mode !== "generate") return [];
  if (preset.postprocessSteps !== undefined) {
    for (const id of preset.postprocessSteps) {
      if (!isKnownPostprocessStep(id)) {
        throw new Error(`pipeline: unknown postprocess step "${id}" (not in POSTPROCESS_REGISTRY)`);
      }
    }
    return [...preset.postprocessSteps];
  }
  return [...DEFAULT_POSTPROCESS_STEPS_GENERATE];
}

/**
 * Sheet generate path: after **BRIA** matting, tiles are already RGBA — default **no** per-tile chroma (FalSprite-style).
 * Set **`preset.fal.chromaAfterBria`** (or **`runPipeline`** **`opts.chromaAfterBria`**) to run **`postprocessSteps`** on each tile — **optional local fringe cleanup**, not required for alpha.
 *
 * @param {{ postprocessSteps?: string[]; fal?: { chromaAfterBria?: boolean } }} preset
 * @param {'mock'|'generate'} mode
 * @param {'bria'|'chroma'} sheetAlphaSource
 * @returns {string[]}
 */
export function resolveSheetTilePostprocessSteps(preset, mode, sheetAlphaSource) {
  if (mode !== "generate") return [];
  if (sheetAlphaSource === "bria") {
    if (preset.fal?.chromaAfterBria) {
      return resolvePostprocessSteps(preset, mode);
    }
    return [];
  }
  return resolvePostprocessSteps(preset, mode);
}

/**
 * Merge preset **`generatorConfig`** with per-run fields (`tileSize`, `seed`, `sheetLayout`, …).
 *
 * @param {object} preset
 * @param {Record<string, unknown>} [preset.generatorConfig]
 * @param {Record<string, unknown>} runtime
 * @returns {Record<string, unknown>}
 */
export function resolveGeneratorConfig(preset, runtime) {
  const base = preset.generatorConfig && typeof preset.generatorConfig === "object" ? preset.generatorConfig : {};
  return { ...base, ...runtime };
}

/**
 * @param {import('node:buffer').Buffer} buffer
 * @param {string[]} stepIds
 * @param {Omit<ChromaPostprocessCtx, 'buffer'> & { buffer: import('node:buffer').Buffer }} ctxBase
 * @returns {{ buffer: import('node:buffer').Buffer; chromaApplied: boolean; chromaKeySource: 'prompt-hex'|'corner-median'|null }}
 */
export function applyPostprocessPipeline(buffer, stepIds, ctxBase) {
  let buf = buffer;
  let chromaApplied = false;
  /** @type {'prompt-hex'|'corner-median'|null} */
  let chromaKeySource = null;
  for (const stepId of stepIds) {
    const fn = POSTPROCESS_REGISTRY[stepId];
    if (!fn) {
      throw new Error(`pipeline: unknown postprocess step "${stepId}"`);
    }
    const out = fn({ ...ctxBase, buffer: buf });
    buf = out.buffer;
    if (out.chromaApplied && "chromaKeySource" in out && out.chromaKeySource) {
      chromaApplied = true;
      chromaKeySource = out.chromaKeySource;
    }
  }
  return { buffer: buf, chromaApplied, chromaKeySource };
}
