import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import {
  applyPostprocessPipeline,
  DEFAULT_POSTPROCESS_STEPS_GENERATE,
  POSTPROCESS_REGISTRY,
  resolveGeneratorConfig,
  resolvePostprocessSteps,
  resolveSheetTilePostprocessSteps,
  runChromaKeyStage,
} from "./pipeline-stages.ts";
// @ts-expect-error TS7016 — preset module is still `.mjs` (see epic / registry TS migration)
import { createPreset } from "./presets/dpad/dpad.mjs";

describe("pipeline-stages", () => {
  it("DEFAULT_POSTPROCESS_STEPS_GENERATE is the chroma-only default", () => {
    expect([...DEFAULT_POSTPROCESS_STEPS_GENERATE]).toEqual(["chromaKey"]);
  });

  it("POSTPROCESS_REGISTRY exposes only chromaKey (BRIA not registered)", () => {
    expect(Object.keys(POSTPROCESS_REGISTRY).sort()).toEqual(["chromaKey"]);
    expect(POSTPROCESS_REGISTRY["chromaKey"]).toBe(runChromaKeyStage);
  });

  it("resolvePostprocessSteps: mock mode never runs postprocess", () => {
    expect(resolvePostprocessSteps({ postprocessSteps: ["chromaKey"] }, "mock")).toEqual([]);
  });

  it("resolvePostprocessSteps: generate uses preset list or default", () => {
    expect(resolvePostprocessSteps({}, "generate")).toEqual([...DEFAULT_POSTPROCESS_STEPS_GENERATE]);
    expect(resolvePostprocessSteps({ postprocessSteps: ["chromaKey"] }, "generate")).toEqual(["chromaKey"]);
  });

  it("resolvePostprocessSteps: dpad preset uses no chroma postprocess (BRIA sheet path)", () => {
    const preset = createPreset({ outBase: "/tmp/dpad-pipeline-stages-test" });
    expect(resolvePostprocessSteps(preset as import("./pipeline.ts").PipelinePreset, "generate")).toEqual([]);
  });

  it("resolvePostprocessSteps: rejects unknown step ids", () => {
    expect(() =>
      resolvePostprocessSteps(
        { postprocessSteps: ["nope"] as unknown as readonly import("./generators/types.ts").PostprocessStepId[] },
        "generate",
      ),
    ).toThrow(/unknown postprocess step/);
  });

  it("resolveSheetTilePostprocessSteps: BRIA alpha skips chroma unless chromaAfterBria", () => {
    const base = { postprocessSteps: ["chromaKey"] as const };
    expect(resolveSheetTilePostprocessSteps(base, "generate", "bria")).toEqual([]);
    expect(resolveSheetTilePostprocessSteps({ ...base, fal: { chromaAfterBria: true } }, "generate", "bria")).toEqual([
      "chromaKey",
    ]);
  });

  it("resolveGeneratorConfig merges preset.generatorConfig with runtime", () => {
    const preset = { generatorConfig: { a: 1, tileSize: 99 } };
    expect(resolveGeneratorConfig(preset, { tileSize: 256, seed: 3 })).toEqual({ a: 1, tileSize: 256, seed: 3 });
  });

  it("resolveGeneratorConfig works without generatorConfig", () => {
    expect(resolveGeneratorConfig({}, { tileSize: 8 })).toEqual({ tileSize: 8 });
  });

  it("applyPostprocessPipeline: empty steps leaves buffer and chroma flags unchanged", () => {
    const png = new PNG({ width: 2, height: 2, colorType: 6 });
    png.data.fill(255);
    const raw = PNG.sync.write(png);
    const log = (): void => {};
    const out = applyPostprocessPipeline(Buffer.from(raw), [], {
      keyRgb: { r: 255, g: 0, b: 255 },
      chromaTolerance: 0,
      log,
    });
    expect(out.buffer.equals(Buffer.from(raw))).toBe(true);
    expect(out.chromaApplied).toBe(false);
    expect(out.chromaKeySource).toBe(null);
  });

  it("applyPostprocessPipeline: chromaKey step keys magenta", () => {
    const png = new PNG({ width: 4, height: 4, colorType: 6 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 255;
      png.data[i + 1] = 0;
      png.data[i + 2] = 255;
      png.data[i + 3] = 255;
    }
    const raw = PNG.sync.write(png);
    const log = (): void => {};
    const out = applyPostprocessPipeline(Buffer.from(raw), ["chromaKey"], {
      keyRgb: { r: 255, g: 0, b: 255 },
      chromaTolerance: 0,
      log,
    });
    expect(out.chromaApplied).toBe(true);
    expect(out.chromaKeySource).toBe("prompt-hex");
  });
});
