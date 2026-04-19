import { describe, expect, it } from "vitest";

import {
  CHARACTER_FRAME_SHEET_CELLS,
  CHARACTER_SHEET_LAYOUT,
  CHARACTER_WALK_FRAMES,
  SHEET_CROPS as AVATAR_SHEET_CROPS,
  SHEET_HEIGHT as AVATAR_SHEET_HEIGHT,
  SHEET_WIDTH as AVATAR_SHEET_WIDTH,
  TILE_HEIGHT as AVATAR_TILE_HEIGHT,
  TILE_SIZE as AVATAR_TILE_SIZE,
} from "../avatar-character/avatar-character.ts";
import {
  ISO_FLOOR_FRAMES,
  ISO_FLOOR_FRAME_SHEET_CELLS,
  ISO_FLOOR_SHEET_LAYOUT,
  SHEET_CROPS as ISO_SHEET_CROPS,
  SHEET_HEIGHT as ISO_SHEET_HEIGHT,
  SHEET_WIDTH as ISO_SHEET_WIDTH,
  TILE_HEIGHT as ISO_TILE_HEIGHT,
  TILE_WIDTH as ISO_TILE_WIDTH,
} from "../isometric-open-floor/isometric-open-floor.ts";

import {
  frameSheetCellsRowMajor,
  horizontalStripCrops,
  sheetDimensionsFromStrip,
  sheetLayoutFromStripCrops,
  validateFrameCropCellCoverage,
} from "./sheet-spec.ts";

describe("presets/lib/sheet-spec horizontal strip (golden vs avatar-character)", () => {
  const frameIds = CHARACTER_WALK_FRAMES.map((f) => f.id);

  it("matches SHEET_CROPS, cells, layout, and sheet dimensions", () => {
    const crops = horizontalStripCrops(frameIds, AVATAR_TILE_SIZE, AVATAR_TILE_HEIGHT);
    const cells = frameSheetCellsRowMajor(frameIds, frameIds.length);
    const { sheetWidth, sheetHeight } = sheetDimensionsFromStrip(
      frameIds.length,
      AVATAR_TILE_SIZE,
      AVATAR_TILE_HEIGHT,
    );
    const layout = sheetLayoutFromStripCrops(crops, AVATAR_TILE_SIZE, AVATAR_TILE_HEIGHT);

    expect(crops).toEqual(AVATAR_SHEET_CROPS);
    expect(cells).toEqual(CHARACTER_FRAME_SHEET_CELLS);
    expect(layout).toEqual(CHARACTER_SHEET_LAYOUT);
    expect(sheetWidth).toBe(AVATAR_SHEET_WIDTH);
    expect(sheetHeight).toBe(AVATAR_SHEET_HEIGHT);
    expect(() => validateFrameCropCellCoverage(frameIds, crops, cells)).not.toThrow();
  });
});

describe("presets/lib/sheet-spec horizontal strip (golden vs isometric-open-floor)", () => {
  const frameIds = ISO_FLOOR_FRAMES.map((f) => f.id);

  it("matches SHEET_CROPS, cells, layout, and sheet dimensions", () => {
    const crops = horizontalStripCrops(frameIds, ISO_TILE_WIDTH, ISO_TILE_HEIGHT);
    const cells = frameSheetCellsRowMajor(frameIds, frameIds.length);
    const { sheetWidth, sheetHeight } = sheetDimensionsFromStrip(
      frameIds.length,
      ISO_TILE_WIDTH,
      ISO_TILE_HEIGHT,
    );
    const layout = sheetLayoutFromStripCrops(crops, ISO_TILE_WIDTH, ISO_TILE_HEIGHT);

    expect(crops).toEqual(ISO_SHEET_CROPS);
    expect(cells).toEqual(ISO_FLOOR_FRAME_SHEET_CELLS);
    expect(layout).toEqual(ISO_FLOOR_SHEET_LAYOUT);
    expect(sheetWidth).toBe(ISO_SHEET_WIDTH);
    expect(sheetHeight).toBe(ISO_SHEET_HEIGHT);
    expect(() => validateFrameCropCellCoverage(frameIds, crops, cells)).not.toThrow();
  });
});

describe("presets/lib/sheet-spec validation", () => {
  it("throws when a frame id is missing from crops or cells", () => {
    const frameIds = ["a", "b"] as const;
    const crops = horizontalStripCrops(frameIds, 8, 8);
    const cells = frameSheetCellsRowMajor(frameIds, 2);
    const badCrops = { a: { x: 0, y: 0 } };
    expect(() => validateFrameCropCellCoverage(frameIds, badCrops, cells)).toThrow(/missing crop/);
    const badCells = { a: { column: 0, row: 0 } };
    expect(() => validateFrameCropCellCoverage(frameIds, crops, badCells)).toThrow(/missing cell/);
  });
});
