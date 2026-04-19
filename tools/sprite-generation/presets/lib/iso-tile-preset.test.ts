import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import {
  ISO_FLOOR_TEXTURE_HEIGHT_PX,
  ISO_FLOOR_TEXTURE_WIDTH_PX,
  TILE_FOOTPRINT_WIDTH_PX,
  floorOnlyCell,
  fullHeightCell,
  halfHeightCell,
  isoSquareCellSizePx,
} from "../../gameDimensions.ts";
import {
  ISO_FLOOR_FRAMES,
  SHEET_CROPS,
  SHEET_HEIGHT,
  SHEET_WIDTH,
  TILE_HEIGHT,
  TILE_WIDTH,
} from "../isometric-open-floor/isometric-open-floor.ts";

import { createIsoTileStripPreset, isoTileStripCellDimensions } from "./iso-tile-preset.ts";

describe("isoTileStripCellDimensions vs src/dimensions.ts (via gameDimensions)", () => {
  it("floorOnly matches W × (W/2) open-floor texture cell", () => {
    const { cellWidth, cellHeight } = isoTileStripCellDimensions("floorOnly");
    expect(cellWidth).toBe(TILE_FOOTPRINT_WIDTH_PX);
    expect(cellWidth).toBe(ISO_FLOOR_TEXTURE_WIDTH_PX);
    expect(cellHeight).toBe(ISO_FLOOR_TEXTURE_HEIGHT_PX);
    expect(cellHeight).toBe(isoSquareCellSizePx("floorOnly") / 2);
    expect(cellWidth).toBe(floorOnlyCell.sizePx);
  });

  it("halfHeight uses footprint width and isoSquareCellSizePx(tier)", () => {
    const { cellWidth, cellHeight } = isoTileStripCellDimensions("halfHeight");
    expect(cellWidth).toBe(TILE_FOOTPRINT_WIDTH_PX);
    expect(cellHeight).toBe(isoSquareCellSizePx("halfHeight"));
    expect(cellHeight).toBe(halfHeightCell.sizePx);
  });

  it("fullHeight uses footprint width and isoSquareCellSizePx(tier)", () => {
    const { cellWidth, cellHeight } = isoTileStripCellDimensions("fullHeight");
    expect(cellWidth).toBe(TILE_FOOTPRINT_WIDTH_PX);
    expect(cellHeight).toBe(isoSquareCellSizePx("fullHeight"));
    expect(cellHeight).toBe(fullHeightCell.sizePx);
  });
});

describe("createIsoTileStripPreset (floorOnly strip matches isometric-open-floor geometry)", () => {
  it("sheet + tile fields align with current open-floor preset literals", () => {
    const preset = createIsoTileStripPreset({
      outBase: "/tmp/iso-test",
      presetId: "test_iso_floor",
      kind: "test_kind",
      tier: "floorOnly",
      frames: ISO_FLOOR_FRAMES,
      prompt: {
        frameStyle: "s",
        frameComposition: "c",
        sheetSubject: "subj",
      },
      renderMockTileBuffer: () => Buffer.alloc(0),
      spriteRef: {
        kind: "gridFrameKeys",
        jsonRelativePath: "sprite-ref.json",
        sheetImageRelativePath: "art/test/sheet.png",
      },
    });

    expect(preset.tileSize).toBe(TILE_WIDTH);
    expect(preset.tileHeight).toBe(TILE_HEIGHT);
    expect(preset.sheet?.width).toBe(SHEET_WIDTH);
    expect(preset.sheet?.height).toBe(SHEET_HEIGHT);
    expect(preset.sheet?.crops).toEqual(SHEET_CROPS);
    expect(preset.sheet?.spriteWidth).toBe(TILE_WIDTH);
    expect(preset.sheet?.spriteHeight).toBe(TILE_HEIGHT);
  });
});
