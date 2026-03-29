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
} from "./pipeline-stages.mjs";
import { createPreset } from "./presets/dpad.mjs";

describe("pipeline-stages", () => {
  it("DEFAULT_POSTPROCESS_STEPS_GENERATE is the chroma-only default", () => {
    expect([...DEFAULT_POSTPROCESS_STEPS_GENERATE]).toEqual(["chromaKey"]);
  });

  it("POSTPROCESS_REGISTRY exposes only chromaKey (BRIA not registered)", () => {
    expect(Object.keys(POSTPROCESS_REGISTRY).sort()).toEqual(["chromaKey"]);
    expect(POSTPROCESS_REGISTRY.chromaKey).toBe(runChromaKeyStage);
  });

  it("resolvePostprocessSteps: mock mode never runs postprocess", () => {
    expect(resolvePostprocessSteps({ postprocessSteps: ["chromaKey"] }, "mock")).toEqual([]);
  });

  it("resolvePostprocessSteps: generate uses preset list or default", () => {
    expect(resolvePostprocessSteps({}, "generate")).toEqual([...DEFAULT_POSTPROCESS_STEPS_GENERATE]);
    expect(resolvePostprocessSteps({ postprocessSteps: ["chromaKey"] }, "generate")).toEqual(["chromaKey"]);
  });

  it("resolvePostprocessSteps: dpad preset matches DEFAULT_POSTPROCESS_STEPS_GENERATE", () => {
    const preset = createPreset({ outBase: "/tmp/dpad-pipeline-stages-test" });
    expect(resolvePostprocessSteps(preset, "generate")).toEqual([...DEFAULT_POSTPROCESS_STEPS_GENERATE]);
  });

  it("resolvePostprocessSteps: rejects unknown step ids", () => {
    expect(() => resolvePostprocessSteps({ postprocessSteps: ["nope"] }, "generate")).toThrow(/unknown postprocess step/);
  });

  it("resolveSheetTilePostprocessSteps: BRIA alpha skips chroma unless chromaAfterBria", () => {
    const base = { postprocessSteps: ["chromaKey"] };
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
    const log = () => {};
    const out = applyPostprocessPipeline(raw, [], {
      keyRgb: { r: 255, g: 0, b: 255 },
      chromaTolerance: 0,
      log,
    });
    expect(out.buffer.equals(raw)).toBe(true);
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
    const log = () => {};
    const out = applyPostprocessPipeline(raw, ["chromaKey"], {
      keyRgb: { r: 255, g: 0, b: 255 },
      chromaTolerance: 0,
      log,
    });
    expect(out.chromaApplied).toBe(true);
    expect(out.chromaKeySource).toBe("prompt-hex");
  });
});
