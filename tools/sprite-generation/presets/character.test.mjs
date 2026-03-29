import { describe, expect, it } from "vitest";

import { RECIPE_VERSION_MOCK, RECIPE_VERSION_PER_TILE, RECIPE_VERSION_SHEET } from "../manifest.mjs";
import { renderCharacterWalkMockTileBuffer } from "../generators/mock.mjs";
import { DEFAULT_POSTPROCESS_STEPS_GENERATE } from "../pipeline-stages.mjs";
import {
  CHARACTER_CHROMA_FRINGE_EDGE_DIST,
  CHARACTER_CHROMA_SPILL_MAX_DIST,
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
  it("createPreset builds a runPipeline-ready object with frameKeyRect spriteRef for art/character", () => {
    const p = createPreset({ outBase: "/tmp/character-out" });
    expect(p.presetId).toBe(CHARACTER_PRESET_ID);
    expect(p.kind).toBe(CHARACTER_KIND);
    expect(p.frames).toBe(CHARACTER_WALK_FRAMES);
    expect(p.tileSize).toBe(TILE_SIZE);
    expect(p.sheet?.width).toBe(SHEET_WIDTH);
    expect(p.sheet?.height).toBe(SHEET_HEIGHT);
    expect(p.sheet?.crops?.walk_0).toEqual({ x: 0, y: 0 });
    expect(p.spriteRef.kind).toBe("frameKeyRect");
    expect(p.spriteRef.artUrlPrefix).toBe("art/character");
    expect(p.spriteRef.pngFilename).toBe("character.png");
    expect(p.spriteRef.jsonRelativePath).toBe("sprite-ref.json");
    expect(p.spriteRef.artUrlPrefix).not.toMatch(/\/$/);
    expect(p.fal?.falExtrasPerTile).toMatchObject({ aspect_ratio: "1:1", resolution: "1K" });
    expect(p.fal?.falExtrasSheet).toMatchObject({ aspect_ratio: "4:1", resolution: "0.5K" });
    expect(p.fal?.sheetRewrite?.enabled).toBe(true);
    expect(typeof p.fal?.sheetRewrite?.systemPrompt).toBe("string");
    expect(p.fal?.chromaAfterBria).toBe(true);
    expect(p.fal?.chromaFringeEdgeDist).toBe(CHARACTER_CHROMA_FRINGE_EDGE_DIST);
    expect(p.fal?.chromaSpillMaxDist).toBe(CHARACTER_CHROMA_SPILL_MAX_DIST);
    expect(p.qa.spriteWidth).toBe(16);
    expect(p.qa.spriteHeight).toBe(16);
    expect(p.generatorConfig?.tileBufferForFrame).toBeDefined();
    expect(p.generatorConfig?.sheetLayout).toEqual(CHARACTER_SHEET_LAYOUT);
    expect(p.postprocessSteps).toEqual([...DEFAULT_POSTPROCESS_STEPS_GENERATE]);
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

  it("optional chroma-after-BRIA can be disabled on the preset object (BRIA-only tiles)", () => {
    const p = createPreset({ outBase: "/tmp/character-out" });
    const briaOnly = { ...p, fal: { ...p.fal, chromaAfterBria: false } };
    expect(briaOnly.fal?.chromaAfterBria).toBe(false);
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
