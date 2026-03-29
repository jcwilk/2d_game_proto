import { describe, expect, it } from 'vitest';

import * as gd from '../tools/sprite-generation/gameDimensions.mjs';
import * as dim from './dimensions';

describe('dimensions.ts ↔ gameDimensions.mjs sync', () => {
  it('core world + footprint literals match', () => {
    expect(dim.TILE_WORLD_M).toBe(gd.TILE_WORLD_M);
    expect(dim.FULL_VERTICAL_WORLD_M).toBe(gd.FULL_VERTICAL_WORLD_M);
    expect(dim.HALF_VERTICAL_WORLD_M).toBe(gd.HALF_VERTICAL_WORLD_M);
    expect(dim.FLOOR_ONLY_DECORATION_BAND_WORLD_M).toBe(gd.FLOOR_ONLY_DECORATION_BAND_WORLD_M);

    expect(dim.TILE_FOOTPRINT_WIDTH_PX).toBe(gd.TILE_FOOTPRINT_WIDTH_PX);
    expect(dim.PX_PER_WORLD_M).toBe(gd.PX_PER_WORLD_M);
    expect(dim.FLOOR_FORESHORTENED_HEIGHT_PX).toBe(gd.FLOOR_FORESHORTENED_HEIGHT_PX);

    expect(dim.HALF_HEIGHT_CELL_SCALE).toBe(gd.HALF_HEIGHT_CELL_SCALE);
    expect(dim.FULL_HEIGHT_CELL_SCALE).toBe(gd.FULL_HEIGHT_CELL_SCALE);

    expect(dim.floorOnlyCell.sizePx).toBe(gd.FLOOR_ONLY_CELL_PX);
    expect(dim.halfHeightCell.sizePx).toBe(gd.HALF_HEIGHT_CELL_PX);
    expect(dim.fullHeightCell.sizePx).toBe(gd.FULL_HEIGHT_CELL_PX);

    expect(dim.ISO_FLOOR_ANCHOR_INSET_PX).toBe(gd.ISO_FLOOR_ANCHOR_INSET_PX);
    expect(dim.FLOOR_SURFACE_CENTER_OFFSET_FROM_CELL_BOTTOM_PX).toBe(
      gd.FLOOR_SURFACE_CENTER_OFFSET_FROM_CELL_BOTTOM_PX,
    );
    expect(dim.COLUMN_TOP_CENTER_OFFSET_FROM_CELL_TOP_PX).toBe(gd.COLUMN_TOP_CENTER_OFFSET_FROM_CELL_TOP_PX);

    expect(dim.CHARACTER_WALK_FRAME_WIDTH_PX).toBe(gd.CHARACTER_WALK_FRAME_WIDTH_PX);
    expect(dim.CHARACTER_WALK_FRAME_HEIGHT_PX).toBe(gd.CHARACTER_WALK_FRAME_HEIGHT_PX);
    expect(dim.CHARACTER_WALK_FRAME_PX).toBe(gd.CHARACTER_WALK_FRAME_PX);
    expect(dim.CHARACTER_WALK_SHEET_WIDTH_PX).toBe(gd.CHARACTER_WALK_SHEET_WIDTH_PX);
    expect(dim.CHARACTER_WALK_SHEET_HEIGHT_PX).toBe(gd.CHARACTER_WALK_SHEET_HEIGHT_PX);
    expect(dim.CHARACTER_WALK_FRAME_FEET_INSET_FROM_BOTTOM_PX).toBe(gd.CHARACTER_WALK_FRAME_FEET_INSET_FROM_BOTTOM_PX);
    expect(dim.ISO_FLOOR_TEXTURE_WIDTH_PX).toBe(gd.ISO_FLOOR_TEXTURE_WIDTH_PX);
    expect(dim.ISO_FLOOR_TEXTURE_HEIGHT_PX).toBe(gd.ISO_FLOOR_TEXTURE_HEIGHT_PX);
  });
});
