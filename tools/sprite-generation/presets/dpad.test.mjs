import { describe, expect, it } from "vitest";

import { RECIPE_VERSION_MOCK, RECIPE_VERSION_PER_TILE, RECIPE_VERSION_SHEET } from "../manifest.mjs";
import { defaultDpadShapeForFrame } from "../generators/mock.mjs";
import { DEFAULT_POSTPROCESS_STEPS_GENERATE } from "../pipeline-stages.mjs";
import {
  createPreset,
  DPAD_FRAMES,
  DPAD_KIND,
  DPAD_PRESET_ID,
  DPAD_SHEET_LAYOUT,
  recipeIdForDpad,
  SHEET_CROPS,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  TILE_SIZE,
} from "./dpad.mjs";

describe("presets/dpad", () => {
  it("createPreset builds a runPipeline-ready object with frameKeyRect spriteRef for art/dpad", () => {
    const p = createPreset({ outBase: "/tmp/dpad-out" });
    expect(p.presetId).toBe(DPAD_PRESET_ID);
    expect(p.kind).toBe(DPAD_KIND);
    expect(p.frames).toBe(DPAD_FRAMES);
    expect(p.tileSize).toBe(TILE_SIZE);
    expect(p.sheet?.width).toBe(SHEET_WIDTH);
    expect(p.sheet?.height).toBe(SHEET_HEIGHT);
    expect(p.sheet?.crops?.up).toEqual({ x: 0, y: 0 });
    expect(p.spriteRef.kind).toBe("frameKeyRect");
    expect(p.spriteRef.artUrlPrefix).toBe("art/dpad");
    expect(p.spriteRef.pngFilename).toBe("dpad.png");
    expect(p.spriteRef.jsonRelativePath).toBe("sprite-ref.json");
    expect(p.spriteRef.artUrlPrefix).not.toMatch(/\/$/);
    expect(p.fal?.falExtrasPerTile).toMatchObject({ aspect_ratio: "1:1", resolution: "1K" });
    expect(p.fal?.falExtrasSheet).toMatchObject({ aspect_ratio: "4:1", resolution: "1K" });
    expect(p.qa.spriteWidth).toBe(20);
    expect(p.qa.spriteHeight).toBe(20);
    expect(p.generatorConfig?.shapeForFrame).toBe(defaultDpadShapeForFrame);
    expect(p.generatorConfig?.sheetLayout).toEqual(DPAD_SHEET_LAYOUT);
    expect(p.postprocessSteps).toEqual([...DEFAULT_POSTPROCESS_STEPS_GENERATE]);
  });

  it("SHEET_CROPS covers every frame id", () => {
    for (const f of DPAD_FRAMES) {
      expect(SHEET_CROPS[f.id]).toBeDefined();
    }
  });

  it("recipeIdForDpad matches manifest RECIPE_VERSION slugs", () => {
    expect(recipeIdForDpad("mock")).toBe(`sprite-gen-${DPAD_PRESET_ID}-mock-${RECIPE_VERSION_MOCK}`);
    expect(recipeIdForDpad("generate", "per-tile")).toBe(
      `sprite-gen-${DPAD_PRESET_ID}-per-tile-${RECIPE_VERSION_PER_TILE}`,
    );
    expect(recipeIdForDpad("generate", "sheet")).toBe(`sprite-gen-${DPAD_PRESET_ID}-sheet-${RECIPE_VERSION_SHEET}`);
  });

  it("throws without outBase", () => {
    expect(() => createPreset({})).toThrow(/outBase/);
  });
});
