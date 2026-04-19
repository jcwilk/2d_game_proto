/**
 * Data-driven **postprocess** and **generator config** helpers for `pipeline.ts`.
 * Known postprocess step ids are registered in **`POSTPROCESS_REGISTRY`**; presets list
 * **`postprocessSteps`** (generate mode only) in order.
 *
 * **Alpha path:** **`chromaKey`** is the only per-tile postprocess id. **BRIA** sheet matting runs in
 * **`pipeline.ts`** `runGenerateSheetPath` (not here) so matting stays **once per sheet** before crops.
 */

import type { Buffer } from "node:buffer";

import {
  CHROMA_FALLBACK_TOLERANCE_MIN,
  chromaKeyWithBorderFallback,
  keySemiTransparentNearKey,
  removeMagentaFringeAdjacentToTransparent,
} from "./postprocess/chroma-key.ts";
import { countFullyTransparentPercent } from "./postprocess/png-region.ts";
import type { LogFn, PostprocessStepId } from "./generators/types.ts";

/** Default when `preset.postprocessSteps` is omitted and `mode === 'generate'`. */
export const DEFAULT_POSTPROCESS_STEPS_GENERATE: readonly PostprocessStepId[] = Object.freeze(["chromaKey"]);

export interface ChromaPostprocessCtx {
  buffer: Buffer;
  keyRgb: { r: number; g: number; b: number };
  chromaTolerance: number;
  chromaFringeEdgeDist?: number;
  chromaSpillMaxDist?: number;
  log: LogFn;
}

/** Fields for **`applyPostprocessPipeline`** (buffer is threaded per step). */
export type ChromaPostprocessCtxBase = Omit<ChromaPostprocessCtx, "buffer">;

export interface ChromaStageResult {
  buffer: Buffer;
  chromaKeySource?: "prompt-hex" | "corner-median";
  chromaApplied?: boolean;
}

type PostprocessStepFn = (ctx: ChromaPostprocessCtx) => ChromaStageResult;

export function runChromaKeyStage(ctx: ChromaPostprocessCtx): ChromaStageResult & {
  chromaKeySource: "prompt-hex" | "corner-median";
  chromaApplied: true;
} {
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

/** Ordered postprocess steps (generate path). Extend by adding functions here and documenting ids. */
export const POSTPROCESS_REGISTRY = Object.freeze({
  chromaKey: runChromaKeyStage,
} satisfies Record<PostprocessStepId, PostprocessStepFn>);

export function isKnownPostprocessStep(id: string): id is PostprocessStepId {
  return id in POSTPROCESS_REGISTRY;
}

/**
 * Postprocess runs only for **`mode === 'generate'`** (mock leaves RGBA from the mock generator as-is).
 */
export function resolvePostprocessSteps(preset: { postprocessSteps?: readonly PostprocessStepId[] }, mode: "mock" | "generate"): PostprocessStepId[] {
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
 */
export function resolveSheetTilePostprocessSteps(
  preset: { postprocessSteps?: readonly PostprocessStepId[]; fal?: { chromaAfterBria?: boolean } },
  mode: "mock" | "generate",
  sheetAlphaSource: "bria" | "chroma",
): PostprocessStepId[] {
  if (mode !== "generate") return [];
  if (sheetAlphaSource === "bria") {
    if (preset.fal?.chromaAfterBria) {
      return resolvePostprocessSteps(preset, mode);
    }
    return [];
  }
  return resolvePostprocessSteps(preset, mode);
}

/** Merge preset **`generatorConfig`** with per-run fields (`tileSize`, `seed`, `sheetLayout`, …). */
export function resolveGeneratorConfig(preset: { generatorConfig?: unknown }, runtime: Record<string, unknown>): Record<string, unknown> {
  const raw = preset.generatorConfig;
  const base =
    raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  return { ...base, ...runtime };
}

export function applyPostprocessPipeline(
  buffer: Buffer,
  stepIds: readonly PostprocessStepId[],
  ctxBase: ChromaPostprocessCtxBase,
): { buffer: Buffer; chromaApplied: boolean; chromaKeySource: "prompt-hex" | "corner-median" | null } {
  let buf = buffer;
  let chromaApplied = false;
  let chromaKeySource: "prompt-hex" | "corner-median" | null = null;
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
