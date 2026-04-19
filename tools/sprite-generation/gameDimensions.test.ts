import { describe, expect, it } from "vitest";

import {
  floorOnlyCell,
  fullHeightCell,
  halfHeightCell,
} from "../../src/dimensions.ts";
import * as gd from "./gameDimensions.ts";

describe("gameDimensions.ts", () => {
  it("legacy FLOOR_*_CELL_PX aliases match tier sizes from src/dimensions.ts", () => {
    expect(gd.FLOOR_ONLY_CELL_PX).toBe(floorOnlyCell.sizePx);
    expect(gd.HALF_HEIGHT_CELL_PX).toBe(halfHeightCell.sizePx);
    expect(gd.FULL_HEIGHT_CELL_PX).toBe(fullHeightCell.sizePx);
  });
});
