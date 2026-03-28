import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

import {
  RECIPE_VERSION_MOCK,
  RECIPE_VERSION_PER_TILE,
  RECIPE_VERSION_SHEET,
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
  right: { x: 256, y: 0 },
  left: { x: 0, y: 256 },
  down: { x: 256, y: 256 },
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
    const sheet = buildRecipeId({ preset: "dpad_four_way", mode: "generate", strategy: "sheet" });
    expect(perTile).toBe(`sprite-gen-dpad_four_way-per-tile-${RECIPE_VERSION_PER_TILE}`);
    expect(sheet).toBe(`sprite-gen-dpad_four_way-sheet-${RECIPE_VERSION_SHEET}`);
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
      imageSize: "256x256",
      tileSize: 256,
      sheetSize: 512,
      sheetCropMap: SHEET_CROPS_FIXTURE,
      chromaKeyHex: "#FF00FF",
      chromaTolerance: 42,
      keyRgbForManifest: null,
      falExtrasPerTile: FAL_EXTRAS_TILE,
      falExtrasSheet: FAL_EXTRAS_TILE,
      seed: null,
      provenance: { tool: "tools/dpad-workflow.mjs", version: 3 },
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
    expect(specs.tileSize).toEqual({ width: 256, height: 256 });
    expect(specs).not.toHaveProperty("strategy");
    expect(specs).not.toHaveProperty("chroma");

    const gr = /** @type {{ mode: string; endpoint: unknown; falExtrasPerTile: unknown; falExtrasSheet: unknown; note: string }} */ (
      m.generationRecipe
    );
    expect(gr.mode).toBe("mock");
    expect(gr.endpoint).toBeNull();
    expect(gr.falExtrasPerTile).toBeNull();
    expect(gr.falExtrasSheet).toBeNull();
    expect(gr.note).toContain("Mock:");
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
      endpoint: "fal-ai/flux/dev",
      imageSize: "256x256",
      tileSize: 256,
      sheetSize: 512,
      sheetCropMap: SHEET_CROPS_FIXTURE,
      chromaKeyHex: "#FF00FF",
      chromaTolerance: 42,
      keyRgbForManifest: KEY_RGB,
      falExtrasPerTile: FAL_EXTRAS_TILE,
      falExtrasSheet: FAL_EXTRAS_TILE,
      seed: 1084367636,
      provenance: { tool: "tools/dpad-workflow.mjs", version: 3 },
    });

    expect(m.recipeId).toBe(`sprite-gen-dpad_four_way-per-tile-${RECIPE_VERSION_PER_TILE}`);
    const gr = /** @type {{ mode: string; endpoint: string; seedRequested: number; falExtrasPerTile: object; falExtrasSheet: null }} */ (
      m.generationRecipe
    );
    expect(gr.mode).toBe("generate");
    expect(gr.endpoint).toBe("fal-ai/flux/dev");
    expect(gr.seedRequested).toBe(1084367636);
    expect(gr.falExtrasPerTile).toEqual(FAL_EXTRAS_TILE);
    expect(gr.falExtrasSheet).toBeNull();
    expect(gr.note).toContain("fal.subscribe");

    const specs = /** @type {{ strategy: string; chroma: { keyHex: string } }} */ (m.specs);
    expect(specs.strategy).toBe("per-tile");
    expect(specs.chroma.keyHex).toBe("#FF00FF");
  });

  it("sheet strategy manifest: recipeId, sheet specs, falExtrasSheet", () => {
    const recipeId = buildRecipeId({ preset: "dpad_four_way", mode: "generate", strategy: "sheet" });
    const m = buildInitialManifest({
      kind: "dpad_tile_set",
      preset: "dpad_four_way",
      recipeId,
      createdAt: CREATED_AT,
      frames: DPAD_FRAMES_FIXTURE,
      mode: "generate",
      strategy: "sheet",
      endpoint: "fal-ai/flux/dev",
      imageSize: "512x512",
      tileSize: 256,
      sheetSize: 512,
      sheetCropMap: SHEET_CROPS_FIXTURE,
      chromaKeyHex: "#FF00FF",
      chromaTolerance: 42,
      keyRgbForManifest: KEY_RGB,
      falExtrasPerTile: FAL_EXTRAS_TILE,
      falExtrasSheet: FAL_EXTRAS_TILE,
      seed: null,
      provenance: { tool: "tools/dpad-workflow.mjs", version: 3 },
    });

    expect(m.recipeId).toBe(`sprite-gen-dpad_four_way-sheet-${RECIPE_VERSION_SHEET}`);
    expect(m.workflow).toContain("fal sheet");
    expect(m.workflow).toContain("512px");

    const gr = /** @type {{ falExtrasPerTile: null; falExtrasSheet: object }} */ (m.generationRecipe);
    expect(gr.falExtrasPerTile).toBeNull();
    expect(gr.falExtrasSheet).toEqual(FAL_EXTRAS_TILE);
    expect(String(/** @type {{ note: string }} */ (m.generationRecipe).note)).toContain("512");

    const specs = /** @type {{ sheetSize: { width: number }; sheetCropMap: object; imageSize: string; strategy: string }} */ (m.specs);
    expect(specs.strategy).toBe("sheet");
    expect(specs.sheetSize).toEqual({ width: 512, height: 512 });
    expect(specs.sheetCropMap).toEqual(SHEET_CROPS_FIXTURE);
    expect(specs.imageSize).toBe("512x512");
  });

  it("structural field names align with checked-in public/art/dpad/manifest.json sample", async () => {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const sample = JSON.parse(await readFile(join(__dirname, "../../public/art/dpad/manifest.json"), "utf8"));

    const recipeId = buildRecipeId({ preset: "dpad_four_way", mode: "generate", strategy: "per-tile" });
    const built = buildInitialManifest({
      kind: "dpad_tile_set",
      preset: "dpad_four_way",
      recipeId,
      createdAt: CREATED_AT,
      frames: DPAD_FRAMES_FIXTURE,
      mode: "generate",
      strategy: "per-tile",
      endpoint: "fal-ai/flux/dev",
      imageSize: "256x256",
      tileSize: 256,
      sheetSize: 512,
      sheetCropMap: SHEET_CROPS_FIXTURE,
      chromaKeyHex: "#FF00FF",
      chromaTolerance: 42,
      keyRgbForManifest: KEY_RGB,
      falExtrasPerTile: FAL_EXTRAS_TILE,
      falExtrasSheet: FAL_EXTRAS_TILE,
      seed: null,
      provenance: { tool: "tools/dpad-workflow.mjs", version: 3 },
    });

    expect(Object.keys(built).sort()).toEqual(Object.keys(sample).sort());

    const sampleSpecsKeys = Object.keys(sample.specs).sort();
    const builtSpecsKeys = Object.keys(/** @type {object} */ (built.specs)).sort();
    expect(builtSpecsKeys).toEqual(sampleSpecsKeys);

    const sampleGrKeys = Object.keys(sample.generationRecipe).sort();
    const builtGrKeys = Object.keys(/** @type {object} */ (built.generationRecipe)).sort();
    expect(builtGrKeys).toEqual(sampleGrKeys);

    expect(Object.keys(/** @type {object} */ (sample.specs.chroma)).sort()).toEqual(
      Object.keys(/** @type {{ chroma: object }} */ (built.specs).chroma).sort(),
    );
    expect(Object.keys(/** @type {object} */ (sample.specs.chroma.keyRgb)).sort()).toEqual(
      Object.keys(/** @type {{ chroma: { keyRgb: object }} } */ (built.specs).chroma.keyRgb).sort(),
    );
  });
});
