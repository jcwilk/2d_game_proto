import { describe, expect, it } from "vitest";

import {
  DEFAULT_POSTPROCESS_STEPS_GENERATE,
  resolveGeneratorConfig,
  resolvePostprocessSteps,
} from "./pipeline-stages.mjs";

describe("pipeline-stages", () => {
  it("resolvePostprocessSteps: mock mode never runs postprocess", () => {
    expect(resolvePostprocessSteps({ postprocessSteps: ["chromaKey"] }, "mock")).toEqual([]);
  });

  it("resolvePostprocessSteps: generate uses preset list or default", () => {
    expect(resolvePostprocessSteps({}, "generate")).toEqual([...DEFAULT_POSTPROCESS_STEPS_GENERATE]);
    expect(resolvePostprocessSteps({ postprocessSteps: ["chromaKey"] }, "generate")).toEqual(["chromaKey"]);
  });

  it("resolvePostprocessSteps: rejects unknown step ids", () => {
    expect(() => resolvePostprocessSteps({ postprocessSteps: ["nope"] }, "generate")).toThrow(/unknown postprocess step/);
  });

  it("resolveGeneratorConfig merges preset.generatorConfig with runtime", () => {
    const preset = { generatorConfig: { a: 1, tileSize: 99 } };
    expect(resolveGeneratorConfig(preset, { tileSize: 256, seed: 3 })).toEqual({ a: 1, tileSize: 256, seed: 3 });
  });

  it("resolveGeneratorConfig works without generatorConfig", () => {
    expect(resolveGeneratorConfig({}, { tileSize: 8 })).toEqual({ tileSize: 8 });
  });
});
