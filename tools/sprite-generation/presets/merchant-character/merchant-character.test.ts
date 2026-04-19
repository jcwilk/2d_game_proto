import { describe, expect, it } from "vitest";

import type { SpriteRefGridFrameKeys } from "../../sprite-ref.ts";
import { RECIPE_VERSION_MOCK, RECIPE_VERSION_PER_TILE, RECIPE_VERSION_SHEET } from "../../manifest.ts";
import { renderCharacterWalkMockTileBuffer } from "../../generators/mock.ts";
import {
  CHARACTER_MERCHANT_KIND,
  CHARACTER_MERCHANT_PRESET_ID,
  createPreset,
  MANIFEST_PRESET_ID,
  MERCHANT_FALSPRITE_SHEET_SUBJECT,
  MERCHANT_FRAME_SHEET_CELLS,
  MERCHANT_SHEET_LAYOUT,
  MERCHANT_WALK_FRAMES,
  recipeId,
  SHEET_CROPS,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  TILE_HEIGHT,
  TILE_SIZE,
} from "./merchant-character.ts";

describe("presets/merchant-character", () => {
  it("createPreset builds gridFrameKeys preset for art/merchant-character with character_merchant_walk ids", () => {
    const p = createPreset({ outBase: "/tmp/merchant-character-out" });
    expect(p.presetId).toBe("character_merchant_walk");
    expect(p.presetId).toBe(MANIFEST_PRESET_ID);
    expect(p.presetId).toBe(CHARACTER_MERCHANT_PRESET_ID);
    expect(p.kind).toBe("character_merchant_walk");
    expect(p.kind).toBe(CHARACTER_MERCHANT_KIND);
    expect(p.frames).toStrictEqual(MERCHANT_WALK_FRAMES);
    expect(p.frames.map((f) => f.id)).toEqual(["walk_0", "walk_1", "walk_2", "walk_3"]);
    expect(p.tileSize).toBe(TILE_SIZE);
    expect(p.tileHeight).toBe(TILE_HEIGHT);
    expect(p.sheet?.width).toBe(SHEET_WIDTH);
    expect(p.sheet?.height).toBe(SHEET_HEIGHT);
    expect(p.sheet?.rows).toBe(1);
    expect(p.sheet?.columns).toBe(4);
    expect(p.sheet?.crops?.["walk_0"]).toEqual({ x: 0, y: 0 });
    expect(p.sheet?.crops?.["walk_3"]).toEqual({ x: TILE_SIZE * 3, y: 0 });
    expect(p.frameSheetCells).toEqual({ ...MERCHANT_FRAME_SHEET_CELLS });
    expect(p.spriteRef.kind).toBe("gridFrameKeys");
    const spriteRef = p.spriteRef as SpriteRefGridFrameKeys;
    expect(spriteRef.sheetImageRelativePath).toBe("art/merchant-character/sheet.png");
    expect(spriteRef.jsonRelativePath).toBe("sprite-ref.json");
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
    expect(p.generatorConfig?.sheetLayout).toEqual(MERCHANT_SHEET_LAYOUT);
    expect(p.postprocessSteps).toEqual([]);
    const buf = p.generatorConfig!.tileBufferForFrame!(
      { id: "walk_0", outSubdir: "walk_0", promptVariant: "" },
      { tileSize: TILE_SIZE, tileWidth: TILE_SIZE, tileHeight: TILE_HEIGHT },
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
  });

  it("MERCHANT_FALSPRITE_SHEET_SUBJECT keeps idle in the first panel and merchant identity", () => {
    expect(MERCHANT_FALSPRITE_SHEET_SUBJECT.toLowerCase()).toMatch(/idle/);
    expect(MERCHANT_FALSPRITE_SHEET_SUBJECT).toMatch(/\(1\)/);
    expect(MERCHANT_FALSPRITE_SHEET_SUBJECT.toLowerCase()).toMatch(/merchant|shop/);
  });

  it("SHEET_CROPS covers every frame id", () => {
    for (const f of MERCHANT_WALK_FRAMES) {
      expect(SHEET_CROPS[f.id]).toBeDefined();
    }
  });

  it("recipeId uses character_merchant_walk preset segment", () => {
    expect(recipeId("mock")).toBe(`sprite-gen-${MANIFEST_PRESET_ID}-mock-${RECIPE_VERSION_MOCK}`);
    expect(recipeId("generate", "per-tile")).toBe(
      `sprite-gen-${MANIFEST_PRESET_ID}-per-tile-${RECIPE_VERSION_PER_TILE}`,
    );
    expect(recipeId("generate", "sheet")).toBe(
      `sprite-gen-${MANIFEST_PRESET_ID}-sheet-${RECIPE_VERSION_SHEET}`,
    );
  });

  it("throws without outBase", () => {
    expect(() =>
      createPreset({} as import("./merchant-character.ts").CreateMerchantCharacterPresetOpts),
    ).toThrow(/outBase/);
  });

  it("mock tiles match avatar geometry (shared mock renderer)", () => {
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
