import { Buffer } from "node:buffer";

import { describe, expect, it } from "vitest";

import {
  CHARACTER_FRAME_SHEET_CELLS,
  CHARACTER_WALK_FRAMES,
  SHEET_CROPS as AVATAR_SHEET_CROPS,
  SHEET_HEIGHT as AVATAR_SHEET_HEIGHT,
  SHEET_WIDTH as AVATAR_SHEET_WIDTH,
  TILE_HEIGHT as AVATAR_TILE_HEIGHT,
  TILE_SIZE as AVATAR_TILE_SIZE,
} from "../avatar-character/avatar-character.ts";

import { createCharacterStripPreset } from "./character-preset.ts";
import {
  frameSheetCellsRowMajor,
  horizontalStripCrops,
  sheetDimensionsFromStrip,
} from "./sheet-spec.ts";

describe("createCharacterStripPreset (geometry matches avatar-character literals)", () => {
  it("sheet, tiles, cells, and sheetGridSize align for the canonical walk frame list", () => {
    const preset = createCharacterStripPreset({
      outBase: "/tmp/character-test",
      presetId: "character_walk",
      kind: "character_walk_sprite",
      frames: CHARACTER_WALK_FRAMES,
      prompt: {
        frameStyle: "s",
        frameComposition: "c",
        sheetSubject: "subj",
      },
      renderMockTileBuffer: () => Buffer.alloc(0),
      spriteRef: {
        kind: "gridFrameKeys",
        jsonRelativePath: "sprite-ref.json",
        sheetImageRelativePath: "art/avatar-character/sheet.png",
      },
    });

    expect(preset.tileSize).toBe(AVATAR_TILE_SIZE);
    expect(preset.tileHeight).toBe(AVATAR_TILE_HEIGHT);
    expect(preset.sheetGridSize).toBe(CHARACTER_WALK_FRAMES.length);
    expect(preset.sheet?.columns).toBe(CHARACTER_WALK_FRAMES.length);
    expect(preset.sheet?.rows).toBe(1);
    expect(preset.sheet?.width).toBe(AVATAR_SHEET_WIDTH);
    expect(preset.sheet?.height).toBe(AVATAR_SHEET_HEIGHT);
    expect(preset.sheet?.crops).toEqual(AVATAR_SHEET_CROPS);
    expect(preset.sheet?.spriteWidth).toBe(AVATAR_TILE_SIZE);
    expect(preset.sheet?.spriteHeight).toBe(AVATAR_TILE_HEIGHT);
    expect(preset.frameSheetCells).toEqual(CHARACTER_FRAME_SHEET_CELLS);
  });
});

describe("character strip derivation from frame list", () => {
  it("uses frames.length for columns, sheet width, and sheetGridSize", () => {
    const frames = [
      { id: "a", outSubdir: "a" },
      { id: "b", outSubdir: "b" },
      { id: "c", outSubdir: "c" },
    ] as const;
    const cellW = 32;
    const cellH = 80;
    const frameIds = frames.map((f) => f.id);

    const preset = createCharacterStripPreset({
      outBase: "/tmp/strip-derive",
      presetId: "test",
      kind: "test_kind",
      frames: [...frames],
      cellWidth: cellW,
      cellHeight: cellH,
      prompt: {
        frameStyle: "s",
        frameComposition: "c",
        sheetSubject: "subj",
      },
      renderMockTileBuffer: () => Buffer.alloc(0),
      spriteRef: {
        kind: "gridFrameKeys",
        jsonRelativePath: "sprite-ref.json",
        sheetImageRelativePath: "art/x/sheet.png",
      },
    });

    const expectCrops = horizontalStripCrops(frameIds, cellW, cellH);
    const expectCells = frameSheetCellsRowMajor(frameIds, frameIds.length);
    const { sheetWidth, sheetHeight } = sheetDimensionsFromStrip(frameIds.length, cellW, cellH);

    expect(preset.sheetGridSize).toBe(3);
    expect(preset.sheet?.columns).toBe(3);
    expect(preset.sheet?.rows).toBe(1);
    expect(preset.sheet?.width).toBe(sheetWidth);
    expect(preset.sheet?.height).toBe(sheetHeight);
    expect(preset.sheet?.crops).toEqual(expectCrops);
    expect(preset.frameSheetCells).toEqual(expectCells);
  });
});
