import { describe, expect, it } from "vitest";

import { RECIPE_VERSION_MOCK, RECIPE_VERSION_PER_TILE, RECIPE_VERSION_SHEET } from "../../manifest.ts";
import { renderCharacterWalkMockTileBuffer } from "../../generators/mock.ts";
import {
  CHARACTER_FALSPRITE_SHEET_SUBJECT,
  CHARACTER_FRAME_SHEET_CELLS,
  CHARACTER_KIND,
  CHARACTER_PRESET_ID,
  CHARACTER_SHEET_LAYOUT,
  CHARACTER_WALK_FRAMES,
  createPreset,
  MANIFEST_PRESET_ID,
  recipeId,
  SHEET_CROPS,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  TILE_HEIGHT,
  TILE_SIZE,
} from "./avatar-character.mjs";

describe("presets/avatar-character", () => {
  it("createPreset builds a runPipeline-ready object with gridFrameKeys sprite-ref for art/avatar-character", () => {
    const p = createPreset({ outBase: "/tmp/avatar-character-out" });
    expect(p.presetId).toBe(MANIFEST_PRESET_ID);
    expect(p.presetId).toBe(CHARACTER_PRESET_ID);
    expect(p.kind).toBe(CHARACTER_KIND);
    expect(p.frames).toBe(CHARACTER_WALK_FRAMES);
    expect(p.tileSize).toBe(TILE_SIZE);
    expect(p.tileHeight).toBe(TILE_HEIGHT);
    expect(p.sheet?.width).toBe(SHEET_WIDTH);
    expect(p.sheet?.height).toBe(SHEET_HEIGHT);
    expect(p.sheet?.rows).toBe(1);
    expect(p.sheet?.columns).toBe(4);
    expect(p.sheet?.crops?.walk_0).toEqual({ x: 0, y: 0 });
    expect(p.sheet?.crops?.walk_3).toEqual({ x: TILE_SIZE * 3, y: 0 });
    expect(p.frameSheetCells).toEqual({ ...CHARACTER_FRAME_SHEET_CELLS });
    expect(p.spriteRef.kind).toBe("gridFrameKeys");
    expect(p.spriteRef.sheetImageRelativePath).toBe("art/avatar-character/sheet.png");
    expect(p.spriteRef.jsonRelativePath).toBe("sprite-ref.json");
    expect(p.fal?.falExtrasPerTile).toMatchObject({ aspect_ratio: "1:1", resolution: "1K" });
    expect(p.fal?.falExtrasSheet).toMatchObject({
      aspect_ratio: "3:2",
      resolution: "0.5K",
      expand_prompt: true,
      safety_tolerance: 2,
    });
    expect(p.fal?.sheetRewrite?.enabled).toBe(true);
    expect(typeof p.fal?.sheetRewrite?.systemPrompt).toBe("string");
    expect(p.fal?.chromaAfterBria).toBe(false);
    expect(p.sheetOnlyOutput).toBe(true);
    expect(p.sheetNativeRaster).toBe(true);
    expect(p.qa.spriteWidth).toBe(Math.max(16, Math.round(TILE_SIZE / 4)));
    expect(p.qa.spriteHeight).toBe(Math.max(8, Math.round(TILE_HEIGHT / 4)));
    expect(p.generatorConfig?.tileBufferForFrame).toBeDefined();
    expect(p.generatorConfig?.sheetLayout).toEqual(CHARACTER_SHEET_LAYOUT);
    expect(p.postprocessSteps).toEqual([]);
    const buf = p.generatorConfig.tileBufferForFrame(
      { id: "walk_0", outSubdir: "walk_0", promptVariant: "" },
      { tileSize: TILE_SIZE, tileWidth: TILE_SIZE, tileHeight: TILE_HEIGHT },
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
  });

  it("CHARACTER_FALSPRITE_SHEET_SUBJECT puts idle in the first panel (preset-owned copy)", () => {
    expect(CHARACTER_FALSPRITE_SHEET_SUBJECT.toLowerCase()).toMatch(/idle/);
    expect(CHARACTER_FALSPRITE_SHEET_SUBJECT).toMatch(/\(1\)/);
  });

  it("SHEET_CROPS covers every frame id", () => {
    for (const f of CHARACTER_WALK_FRAMES) {
      expect(SHEET_CROPS[f.id]).toBeDefined();
    }
  });

  it("recipeId matches manifest RECIPE_VERSION slugs", () => {
    expect(recipeId("mock")).toBe(`sprite-gen-${MANIFEST_PRESET_ID}-mock-${RECIPE_VERSION_MOCK}`);
    expect(recipeId("generate", "per-tile")).toBe(
      `sprite-gen-${MANIFEST_PRESET_ID}-per-tile-${RECIPE_VERSION_PER_TILE}`,
    );
    expect(recipeId("generate", "sheet")).toBe(
      `sprite-gen-${MANIFEST_PRESET_ID}-sheet-${RECIPE_VERSION_SHEET}`,
    );
  });

  it("optional chroma-after-BRIA can be enabled on the preset object", () => {
    const p = createPreset({ outBase: "/tmp/avatar-character-out" });
    const withChroma = { ...p, fal: { ...p.fal, chromaAfterBria: true } };
    expect(withChroma.fal?.chromaAfterBria).toBe(true);
  });

  it("throws without outBase", () => {
    expect(() => createPreset({})).toThrow(/outBase/);
  });

  it("renderCharacterWalkMockTileBuffer produces distinct phases (idle vs stride)", () => {
    const idle = renderCharacterWalkMockTileBuffer(
      { id: "walk_0", outSubdir: "walk_0", promptVariant: "" },
      TILE_SIZE,
      TILE_HEIGHT,
    );
    const stride = renderCharacterWalkMockTileBuffer(
      { id: "walk_1", outSubdir: "walk_1", promptVariant: "" },
      TILE_SIZE,
      TILE_HEIGHT,
    );
    expect(idle.equals(stride)).toBe(false);
  });
});
