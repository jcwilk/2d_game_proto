import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { countFullyTransparentPercent, extractPngRegion } from "./png-region.mjs";

describe("png-region", () => {
  it("countFullyTransparentPercent matches deterministic alpha pattern", () => {
    const png = new PNG({ width: 4, height: 4, colorType: 6 });
    png.data.fill(0);
    for (let i = 3; i < png.data.length; i += 8) {
      png.data[i] = 255;
    }
    const buf = PNG.sync.write(png);
    expect(countFullyTransparentPercent(buf)).toBeCloseTo(50, 5);
  });

  it("extractPngRegion copies a sub-rectangle with correct dimensions and pixels", () => {
    const png = new PNG({ width: 4, height: 4, colorType: 6 });
    png.data.fill(0);
    png.data[0] = 1;
    png.data[1] = 2;
    png.data[2] = 3;
    png.data[3] = 255;
    const outBuf = extractPngRegion(png, 0, 0, 2, 2);
    const out = PNG.sync.read(outBuf);
    expect(out.width).toBe(2);
    expect(out.height).toBe(2);
    expect([out.data[0], out.data[1], out.data[2], out.data[3]]).toEqual([1, 2, 3, 255]);
  });

  it("extractPngRegion throws the same crop-bounds error as the monolith", () => {
    const png = new PNG({ width: 3, height: 3, colorType: 6 });
    png.data.fill(255);
    expect(() => extractPngRegion(png, 0, 0, 4, 1)).toThrow(
      "crop out of bounds: 0,0 4x1 vs 3x3",
    );
  });
});
