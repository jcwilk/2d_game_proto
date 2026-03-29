import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import { DPAD_FAL_CONTROL_EXTRA_INPUT } from "./presets/dpad.mjs";
import {
  RECIPE_VERSION_MOCK,
  RECIPE_VERSION_PER_TILE,
  RECIPE_VERSION_PER_TILE_CONTROL,
  RECIPE_VERSION_SHEET,
  RECIPE_VERSION_SHEET_CONTROL,
  buildInitialManifest,
  buildRecipeId,
} from "./manifest.mjs";

/** D-pad preset frame order (matches `DPAD_FRAMES` in dpad-workflow). */
const DPAD_FRAMES_FIXTURE = [
  { id: "up", outSubdir: "up" },
  { id: "down", outSubdir: "down" },
  { id: "left", outSubdir: "left" },
  { id: "right", outSubdir: "right" },
];

const CREATED_AT = "2026-03-28T12:00:00.000Z";

const FAL_EXTRAS_TILE = {
  num_inference_steps: 40,
  guidance_scale: 4.5,
  acceleration: "none",
};

const SHEET_CROPS_FIXTURE = {
  up: { x: 0, y: 0 },
  down: { x: 100, y: 0 },
  left: { x: 200, y: 0 },
  right: { x: 300, y: 0 },
};

const KEY_RGB = { r: 255, g: 0, b: 255 };

function requiredTopLevelKeys() {
  return ["kind", "preset", "recipeId", "createdAt", "workflow", "specs", "generationRecipe", "frames", "provenance", "generationResults"];
}

describe("manifest builder", () => {
  it("buildRecipeId: mock path uses sprite-gen prefix and mock version slug", () => {
    const id = buildRecipeId({ preset: "dpad_four_way", mode: "mock" });
    expect(id).toBe(`sprite-gen-dpad_four_way-mock-${RECIPE_VERSION_MOCK}`);
    expect(id).toMatch(/^sprite-gen-dpad_four_way-mock-/);
  });

  it("buildRecipeId: per-tile vs sheet produce distinct stable ids", () => {
    const perTile = buildRecipeId({ preset: "dpad_four_way", mode: "generate", strategy: "per-tile" });
    const perTilePlain = buildRecipeId({
      preset: "dpad_four_way",
      mode: "generate",
      strategy: "per-tile",
      controlCanny: false,
    });
    const sheet = buildRecipeId({ preset: "dpad_four_way", mode: "generate", strategy: "sheet" });
    const sheetPlain = buildRecipeId({ preset: "dpad_four_way", mode: "generate", strategy: "sheet", controlCanny: false });
    expect(perTile).toBe(`sprite-gen-dpad_four_way-per-tile-${RECIPE_VERSION_PER_TILE_CONTROL}`);
    expect(perTilePlain).toBe(`sprite-gen-dpad_four_way-per-tile-${RECIPE_VERSION_PER_TILE}`);
    expect(sheet).toBe(`sprite-gen-dpad_four_way-sheet-${RECIPE_VERSION_SHEET_CONTROL}`);
    expect(sheetPlain).toBe(`sprite-gen-dpad_four_way-sheet-${RECIPE_VERSION_SHEET}`);
    expect(perTile).not.toBe(sheet);
  });

  it("mock manifest: required keys, framePreset order, generationRecipe", () => {
    const recipeId = buildRecipeId({ preset: "dpad_four_way", mode: "mock" });
    const m = buildInitialManifest({
      kind: "dpad_tile_set",
      preset: "dpad_four_way",
      recipeId,
      createdAt: CREATED_AT,
      frames: DPAD_FRAMES_FIXTURE,
      mode: "mock",
      endpoint: null,
      imageSize: "100x100",
      tileSize: 100,
      sheetSize: 400,
      sheetWidth: 400,
      sheetHeight: 100,
      sheetCropMap: SHEET_CROPS_FIXTURE,
      chromaKeyHex: "#FF00FF",
      chromaTolerance: 42,
      keyRgbForManifest: null,
      falExtrasPerTile: FAL_EXTRAS_TILE,
      falExtrasSheet: FAL_EXTRAS_TILE,
      seed: null,
      provenance: { tool: "tools/dpad-workflow.mjs", version: 3 },
      pngBasename: "dpad.png",
    });

    for (const k of requiredTopLevelKeys()) {
      expect(m).toHaveProperty(k);
    }
    expect(m.kind).toBe("dpad_tile_set");
    expect(m.preset).toBe("dpad_four_way");
    expect(m.recipeId).toBe(recipeId);
    expect(m.createdAt).toBe(CREATED_AT);
    expect(m.workflow).toBe("mock (triangles)");
    expect(m.frames).toEqual([]);
    expect(m.provenance).toEqual({ tool: "tools/dpad-workflow.mjs", version: 3 });

    const specs = /** @type {{ framePreset: { id: string; outSubdir: string }[] }} */ (m.specs);
    expect(specs.framePreset.map((f) => f.id)).toEqual(["up", "down", "left", "right"]);
    expect(specs.tileSize).toEqual({ width: 100, height: 100 });
    expect(specs).not.toHaveProperty("strategy");
    expect(specs).not.toHaveProperty("chroma");
    expect(specs.naming).toBe("dpad.png per frame folder (outSubdir)");

    const gr = /** @type {{ mode: string; endpoint: unknown; falExtrasPerTile: unknown; falExtrasSheet: unknown; note: string }} */ (
      m.generationRecipe
    );
    expect(gr.mode).toBe("mock");
    expect(gr.endpoint).toBeNull();
    expect(gr.falExtrasPerTile).toBeNull();
    expect(gr.falExtrasSheet).toBeNull();
    expect(gr.note).toContain("Mock:");
  });

  it("specs.naming is derived from pngBasename unless specsNaming overrides", () => {
    const recipeId = buildRecipeId({ preset: "other_preset", mode: "mock" });
    const base = {
      kind: "tile_set",
      preset: "other_preset",
      recipeId,
      createdAt: CREATED_AT,
      frames: DPAD_FRAMES_FIXTURE,
      mode: "mock",
      endpoint: null,
      imageSize: "100x100",
      tileSize: 100,
      sheetSize: 400,
      sheetWidth: 400,
      sheetHeight: 100,
      sheetCropMap: SHEET_CROPS_FIXTURE,
      chromaKeyHex: "#FF00FF",
      chromaTolerance: 42,
      keyRgbForManifest: null,
      falExtrasPerTile: FAL_EXTRAS_TILE,
      falExtrasSheet: FAL_EXTRAS_TILE,
      seed: null,
      provenance: { tool: "test", version: 1 },
    };
    const generic = buildInitialManifest({ ...base, pngBasename: "tile.png" });
    expect(generic.specs.naming).toBe("tile.png per frame folder (outSubdir)");
    const custom = buildInitialManifest({ ...base, pngBasename: "tile.png", specsNaming: "Custom naming line" });
    expect(custom.specs.naming).toBe("Custom naming line");
  });

  it("per-tile generate manifest: recipeId + generationRecipe fal extras and chroma specs", () => {
    const recipeId = buildRecipeId({ preset: "dpad_four_way", mode: "generate", strategy: "per-tile" });
    const m = buildInitialManifest({
      kind: "dpad_tile_set",
      preset: "dpad_four_way",
      recipeId,
      createdAt: CREATED_AT,
      frames: DPAD_FRAMES_FIXTURE,
      mode: "generate",
      strategy: "per-tile",
      controlCanny: true,
      endpoint: "fal-ai/flux-control-lora-canny",
      imageSize: "100x100",
      tileSize: 100,
      sheetSize: 400,
      sheetWidth: 400,
      sheetHeight: 100,
      sheetCropMap: SHEET_CROPS_FIXTURE,
      chromaKeyHex: "#FF00FF",
      chromaTolerance: 42,
      keyRgbForManifest: KEY_RGB,
      falExtrasPerTile: FAL_EXTRAS_TILE,
      falExtrasSheet: FAL_EXTRAS_TILE,
      seed: 1084367636,
      provenance: { tool: "tools/dpad-workflow.mjs", version: 3 },
      pngBasename: "dpad.png",
    });

    expect(m.recipeId).toBe(`sprite-gen-dpad_four_way-per-tile-${RECIPE_VERSION_PER_TILE_CONTROL}`);
    expect(String(m.workflow)).toContain("control-canny");
    const gr = /** @type {{ mode: string; endpoint: string; seedRequested: number; falExtrasPerTile: object; falExtrasSheet: null }} */ (
      m.generationRecipe
    );
    expect(gr.mode).toBe("generate");
    expect(gr.endpoint).toBe("fal-ai/flux-control-lora-canny");
    expect(gr.seedRequested).toBe(1084367636);
    expect(gr.falExtrasPerTile).toEqual(FAL_EXTRAS_TILE);
    expect(gr.falExtrasSheet).toBeNull();
    expect(gr.note).toContain("fal.subscribe");

    const specs = /** @type {{ strategy: string; chroma: { keyHex: string } }} */ (m.specs);
    expect(specs.strategy).toBe("per-tile");
    expect(specs.chroma.keyHex).toBe("#FF00FF");
  });

  it("sheet strategy manifest: recipeId, sheet specs, falExtrasSheet (control-canny strip)", () => {
    const recipeId = buildRecipeId({ preset: "dpad_four_way", mode: "generate", strategy: "sheet" });
    const m = buildInitialManifest({
      kind: "dpad_tile_set",
      preset: "dpad_four_way",
      recipeId,
      createdAt: CREATED_AT,
      frames: DPAD_FRAMES_FIXTURE,
      mode: "generate",
      strategy: "sheet",
      controlCanny: true,
      endpoint: "fal-ai/flux-control-lora-canny",
      imageSize: "400x100",
      tileSize: 100,
      sheetSize: 400,
      sheetWidth: 400,
      sheetHeight: 100,
      sheetCropMap: SHEET_CROPS_FIXTURE,
      chromaKeyHex: "#FF00FF",
      chromaTolerance: 72,
      keyRgbForManifest: KEY_RGB,
      falExtrasPerTile: null,
      falExtrasSheet: FAL_EXTRAS_TILE,
      seed: null,
      provenance: { tool: "tools/dpad-workflow.mjs", version: 3 },
      pngBasename: "dpad.png",
    });

    expect(m.recipeId).toBe(`sprite-gen-dpad_four_way-sheet-${RECIPE_VERSION_SHEET_CONTROL}`);
    expect(m.workflow).toContain("fal sheet");
    expect(m.workflow).toContain("400×100");

    const gr = /** @type {{ falExtrasPerTile: null; falExtrasSheet: object }} */ (m.generationRecipe);
    expect(gr.falExtrasPerTile).toBeNull();
    expect(gr.falExtrasSheet).toEqual(FAL_EXTRAS_TILE);
    expect(String(/** @type {{ note: string }} */ (m.generationRecipe).note)).toContain("400x100");

    const specs = /** @type {{ sheetSize: { width: number; height: number }; sheetCropMap: object; imageSize: string; strategy: string }} */ (m.specs);
    expect(specs.strategy).toBe("sheet");
    expect(specs.sheetSize).toEqual({ width: 400, height: 100 });
    expect(specs.sheetCropMap).toEqual(SHEET_CROPS_FIXTURE);
    expect(specs.imageSize).toBe("400x100");
  });

  it("structural field names align with checked-in public/art/dpad/manifest.json sample", async () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const sample = JSON.parse(await readFile(join(__dirname, "../../public/art/dpad/manifest.json"), "utf8"));

    /** Matches `runPipeline` + dpad preset for **generate / sheet / control-canny** (checked-in `public/art/dpad/manifest.json`). */
    const recipeId = buildRecipeId({ preset: "dpad_four_way", mode: "generate", strategy: "sheet" });
    const built = buildInitialManifest({
      kind: "dpad_tile_set",
      preset: "dpad_four_way",
      recipeId,
      createdAt: CREATED_AT,
      frames: DPAD_FRAMES_FIXTURE,
      mode: "generate",
      strategy: "sheet",
      controlCanny: true,
      endpoint: "fal-ai/flux-control-lora-canny",
      imageSize: "400x100",
      tileSize: 100,
      sheetSize: 400,
      sheetWidth: 400,
      sheetHeight: 100,
      sheetCropMap: SHEET_CROPS_FIXTURE,
      chromaKeyHex: "#FF00FF",
      chromaTolerance: 72,
      keyRgbForManifest: KEY_RGB,
      falExtrasPerTile: null,
      falExtrasSheet: DPAD_FAL_CONTROL_EXTRA_INPUT,
      seed: null,
      provenance: { tool: "tools/dpad-workflow.mjs", version: 4 },
      pngBasename: "dpad.png",
    });

    expect(Object.keys(built).sort()).toEqual(Object.keys(sample).sort());

    const sampleSpecsKeys = Object.keys(sample.specs).sort();
    const builtSpecsKeys = Object.keys(/** @type {object} */ (built.specs)).sort();
    expect(builtSpecsKeys).toEqual(sampleSpecsKeys);

    const sampleGrKeys = Object.keys(sample.generationRecipe).sort();
    const builtGrKeys = Object.keys(/** @type {object} */ (built.generationRecipe)).sort();
    expect(builtGrKeys).toEqual(sampleGrKeys);

    const sampleChroma = /** @type {{ chroma?: object }} */ (sample.specs).chroma;
    const builtChroma = /** @type {{ chroma?: object }} */ (built.specs).chroma;
    if (sampleChroma && builtChroma) {
      expect(Object.keys(sampleChroma).sort()).toEqual(Object.keys(builtChroma).sort());
      expect(Object.keys(/** @type {object} */ (sampleChroma.keyRgb)).sort()).toEqual(
        Object.keys(/** @type {object} */ (builtChroma.keyRgb)).sort(),
      );
    } else {
      expect(sampleChroma).toEqual(builtChroma);
    }
  });
});
