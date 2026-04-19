import { describe, expect, it } from "vitest";

import type { SpriteRefGridFrameKeys } from "../../sprite-ref.ts";
import {
  ISO_FLOOR_TEXTURE_HEIGHT_PX,
  ISO_FLOOR_TEXTURE_WIDTH_PX,
  TILE_FOOTPRINT_WIDTH_PX,
  fullHeightCell,
  isoSquareCellSizePx,
} from "../../gameDimensions.ts";
import {
  NANO_BANANA2_ISO_WALL_STRIP_ASPECT_RATIO,
  NANO_BANANA2_LOW_RESOLUTION,
} from "../../generators/fal.ts";
import {
  ASSET_ID,
  DEFAULT_FAL_ENDPOINT,
  ISO_WALL_FRAMES,
  KIND,
  MANIFEST_PRESET_ID,
  TILE_HEIGHT,
  TILE_SIZE,
  TILE_WIDTH,
  createPreset,
} from "./isometric-basic-wall.ts";

describe("presets/isometric-basic-wall", () => {
  it("cell footprint width matches open-floor / dimensions exports; height is fullHeight tier (~2m)", () => {
    expect(TILE_WIDTH).toBe(ISO_FLOOR_TEXTURE_WIDTH_PX);
    expect(TILE_WIDTH).toBe(TILE_FOOTPRINT_WIDTH_PX);
    expect(TILE_SIZE).toBe(TILE_WIDTH);
    expect(TILE_HEIGHT).toBe(isoSquareCellSizePx("fullHeight"));
    expect(TILE_HEIGHT).toBe(fullHeightCell.sizePx);
    expect(TILE_HEIGHT).toBeGreaterThan(ISO_FLOOR_TEXTURE_HEIGHT_PX);
  });

  it("createPreset matches pipeline contract and fal sheet extras (wall strip aspect)", () => {
    const p = createPreset({ outBase: "/tmp/isometric-basic-wall-out" });
    expect(p.presetId).toBe(MANIFEST_PRESET_ID);
    expect(p.kind).toBe(KIND);
    expect(p.frames).toStrictEqual(ISO_WALL_FRAMES);
    expect(p.tileSize).toBe(TILE_WIDTH);
    expect(p.tileHeight).toBe(TILE_HEIGHT);
    expect(p.sheet?.rows).toBe(1);
    expect(p.sheet?.columns).toBe(4);
    expect(p.sheet?.spriteWidth).toBe(TILE_WIDTH);
    expect(p.sheet?.spriteHeight).toBe(TILE_HEIGHT);
    expect(p.sheet?.width).toBe(TILE_WIDTH * 4);
    expect(p.sheet?.height).toBe(TILE_HEIGHT);
    expect(p.spriteRef.kind).toBe("gridFrameKeys");
    const spriteRef = p.spriteRef as SpriteRefGridFrameKeys;
    expect(spriteRef.sheetImageRelativePath).toBe("art/isometric-basic-wall/sheet.png");
    expect(p.fal?.defaultEndpoint).toBe(DEFAULT_FAL_ENDPOINT);
    expect(p.sheetNormalizeFit).toBe("contain");
    expect(p.fal?.falExtrasSheet).toMatchObject({
      aspect_ratio: NANO_BANANA2_ISO_WALL_STRIP_ASPECT_RATIO,
      resolution: NANO_BANANA2_LOW_RESOLUTION,
      expand_prompt: true,
      safety_tolerance: 2,
    });
    expect(p.fal?.sheetRewrite?.enabled).toBe(true);
    const buf = p.generatorConfig!.tileBufferForFrame!(
      { id: "wall_0", outSubdir: "wall_0", promptVariant: "" },
      { tileSize: TILE_SIZE, tileWidth: TILE_WIDTH, tileHeight: TILE_HEIGHT },
    );
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
  });

  it("ASSET_ID matches registry directory name", () => {
    expect(ASSET_ID).toBe("isometric-basic-wall");
  });
});
