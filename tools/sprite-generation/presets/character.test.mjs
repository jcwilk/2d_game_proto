import { describe, expect, it } from "vitest";

import { RECIPE_VERSION_MOCK, RECIPE_VERSION_PER_TILE, RECIPE_VERSION_SHEET } from "../manifest.mjs";
import { renderCharacterWalkMockTileBuffer } from "../generators/mock.mjs";
import {
  CHARACTER_FRAME_SHEET_CELLS,
  CHARACTER_KIND,
  CHARACTER_PRESET_ID,
  CHARACTER_SHEET_LAYOUT,
  CHARACTER_WALK_FRAMES,
  createPreset,
  recipeIdForCharacter,
  SHEET_CROPS,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  TILE_SIZE,
} from "./character.mjs";

describe("presets/character", () => {
  it("createPreset builds a runPipeline-ready object with gridFrameKeys sprite-ref for art/character", () => {
    const p = createPreset({ outBase: "/tmp/character-out" });
    expect(p.presetId).toBe(CHARACTER_PRESET_ID);
    expect(p.kind).toBe(CHARACTER_KIND);
    expect(p.frames).toBe(CHARACTER_WALK_FRAMES);
    expect(p.tileSize).toBe(TILE_SIZE);
    expect(p.sheet?.width).toBe(SHEET_WIDTH);
    expect(p.sheet?.height).toBe(SHEET_HEIGHT);
    expect(p.sheet?.rows).toBe(2);
    expect(p.sheet?.columns).toBe(2);
    expect(p.sheet?.crops?.walk_0).toEqual({ x: 0, y: 0 });
    expect(p.sheet?.crops?.walk_3).toEqual({ x: TILE_SIZE, y: TILE_SIZE });
    expect(p.frameSheetCells).toEqual({ ...CHARACTER_FRAME_SHEET_CELLS });
    expect(p.spriteRef.kind).toBe("gridFrameKeys");
    expect(p.spriteRef.sheetImageRelativePath).toBe("art/character/sheet.png");
    expect(p.spriteRef.jsonRelativePath).toBe("sprite-ref.json");
    expect(p.fal?.falExtrasPerTile).toMatchObject({ aspect_ratio: "1:1", resolution: "1K" });
    expect(p.fal?.falExtrasSheet).toMatchObject({
      aspect_ratio: "1:1",
      resolution: "2K",
      expand_prompt: true,
      safety_tolerance: 2,
    });
    expect(p.fal?.sheetRewrite?.enabled).toBe(true);
    expect(typeof p.fal?.sheetRewrite?.systemPrompt).toBe("string");
    expect(p.fal?.chromaAfterBria).toBe(false);
    expect(p.sheetOnlyOutput).toBe(true);
    expect(p.qa.spriteWidth).toBe(16);
    expect(p.qa.spriteHeight).toBe(16);
    expect(p.generatorConfig?.tileBufferForFrame).toBeDefined();
    expect(p.generatorConfig?.sheetLayout).toEqual(CHARACTER_SHEET_LAYOUT);
    expect(p.postprocessSteps).toEqual([]);
    const buf = p.generatorConfig.tileBufferForFrame(
      { id: "walk_0", outSubdir: "walk_0", promptVariant: "" },
      { tileSize: TILE_SIZE },
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
  });

  it("SHEET_CROPS covers every frame id", () => {
    for (const f of CHARACTER_WALK_FRAMES) {
      expect(SHEET_CROPS[f.id]).toBeDefined();
    }
  });

  it("recipeIdForCharacter matches manifest RECIPE_VERSION slugs", () => {
    expect(recipeIdForCharacter("mock")).toBe(`sprite-gen-${CHARACTER_PRESET_ID}-mock-${RECIPE_VERSION_MOCK}`);
    expect(recipeIdForCharacter("generate", "per-tile")).toBe(
      `sprite-gen-${CHARACTER_PRESET_ID}-per-tile-${RECIPE_VERSION_PER_TILE}`,
    );
    expect(recipeIdForCharacter("generate", "sheet")).toBe(
      `sprite-gen-${CHARACTER_PRESET_ID}-sheet-${RECIPE_VERSION_SHEET}`,
    );
  });

  it("optional chroma-after-BRIA can be enabled on the preset object", () => {
    const p = createPreset({ outBase: "/tmp/character-out" });
    const withChroma = { ...p, fal: { ...p.fal, chromaAfterBria: true } };
    expect(withChroma.fal?.chromaAfterBria).toBe(true);
  });

  it("throws without outBase", () => {
    expect(() => createPreset({})).toThrow(/outBase/);
  });

  it("renderCharacterWalkMockTileBuffer produces distinct phases", () => {
    const a = renderCharacterWalkMockTileBuffer({ id: "walk_0", outSubdir: "walk_0", promptVariant: "" }, 64);
    const b = renderCharacterWalkMockTileBuffer({ id: "walk_2", outSubdir: "walk_2", promptVariant: "" }, 64);
    expect(a.equals(b)).toBe(false);
  });
});
