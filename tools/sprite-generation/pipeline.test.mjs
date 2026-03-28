import { readFile } from "node:fs/promises";
import { mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { PNG } from "pngjs";

import { parseFrameKeyRectManifestJson } from "../../src/art/atlasTypes.ts";
import { RECIPE_VERSION_MOCK } from "./manifest.mjs";
import { createPreset } from "./presets/dpad.mjs";
import { runPipeline } from "./pipeline.mjs";

/** @param {string} outBase */
function dpadLikePreset(outBase) {
  return createPreset({
    outBase,
    artUrlPrefix: "art/pipeline-test",
    provenanceTool: "tools/sprite-generation/pipeline.test.mjs",
    provenanceVersion: 1,
  });
}

describe("pipeline (integration)", () => {
  /** @type {string | undefined} */
  let dir;

  afterEach(async () => {
    if (dir) {
      await rm(dir, { recursive: true, force: true });
      dir = undefined;
    }
  });

  it("mock per-tile: PNGs, manifest, sprite-ref, png-analyze sidecars under tmpdir", async () => {
    dir = join(tmpdir(), `pipe-mock-tile-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const preset = dpadLikePreset(dir);

    const result = await runPipeline(preset, { mode: "mock", strategy: "per-tile" });

    expect(result.manifestPath).toBe(join(dir, "manifest.json"));
    expect(result.spriteRefPath).toBe(join(dir, "sprite-ref.json"));

    for (const id of ["up", "down", "left", "right"]) {
      const pngPath = join(dir, id, "dpad.png");
      const buf = await readFile(pngPath);
      const png = PNG.sync.read(buf);
      expect(png.width).toBe(256);
      expect(png.height).toBe(256);

      const qaPath = join(dir, id, "png-analyze.json");
      const qaRaw = JSON.parse(await readFile(qaPath, "utf8"));
      expect(qaRaw.dimensions?.width).toBe(256);
      expect(qaRaw.dimensions?.height).toBe(256);
    }

    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    expect(manifest.recipeId).toBe(`sprite-gen-dpad_four_way-mock-${RECIPE_VERSION_MOCK}`);
    expect(manifest.preset).toBe("dpad_four_way");
    expect(manifest.generationResults?.up?.chromaApplied).toBe(false);

    const refRaw = JSON.parse(await readFile(join(dir, "sprite-ref.json"), "utf8"));
    const parsed = parseFrameKeyRectManifestJson(refRaw);
    expect(parsed.frames["up"].width).toBe(256);
    expect(refRaw.images?.up).toBe("art/pipeline-test/up/dpad.png");
  });

  it("mock sheet + crop: four tiles from one mock sheet, manifest records sheet strategy metadata", async () => {
    dir = join(tmpdir(), `pipe-mock-sheet-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    const preset = dpadLikePreset(dir);

    await runPipeline(preset, { mode: "mock", strategy: "sheet" });

    for (const id of ["up", "down", "left", "right"]) {
      const pngPath = join(dir, id, "dpad.png");
      const buf = await readFile(pngPath);
      const png = PNG.sync.read(buf);
      expect(png.width).toBe(256);
      expect(png.height).toBe(256);
    }

    const manifest = JSON.parse(await readFile(join(dir, "manifest.json"), "utf8"));
    expect(manifest.generationRecipe?.mode).toBe("mock");
    expect(manifest.generationResults?.up?.fromSheet).toBe(true);
    expect(manifest.generationResults?._sheet?.strategy).toBe("sheet");
  });
});
