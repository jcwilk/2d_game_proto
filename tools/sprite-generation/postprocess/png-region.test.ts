// @ts-nocheck
// @ts-nocheck — Vitest integration test migrated from .mjs
import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import {
  countFullyTransparentPercent,
  extractPngRegion,
  normalizeDecodedSheetToPreset,
  resizePngBufferNearest,
} from "./png-region.ts";

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

  it("resizePngBufferNearest maps corners when upscaling 2×2 → 4×4", () => {
    const png = new PNG({ width: 2, height: 2, colorType: 6 });
    png.data.fill(0);
    const set = (x: number, y: number, r: number, g: number, b: number) => {
      const i = (png.width * y + x) << 2;
      png.data[i] = r;
      png.data[i + 1] = g;
      png.data[i + 2] = b;
      png.data[i + 3] = 255;
    };
    set(0, 0, 10, 0, 0);
    set(1, 0, 20, 0, 0);
    set(0, 1, 30, 0, 0);
    set(1, 1, 40, 0, 0);
    const buf = PNG.sync.write(png);
    const out = PNG.sync.read(resizePngBufferNearest(buf, 4, 4));
    expect(out.width).toBe(4);
    expect(out.height).toBe(4);
    expect(out.data[0]).toBe(10);
    expect(out.data[(out.width * 0 + 3) << 2]).toBe(20);
  });

  it("normalizeDecodedSheetToPreset leaves an exact-size buffer unchanged", () => {
    const png = new PNG({ width: 400, height: 100, colorType: 6 });
    png.data.fill(0);
    const buf = PNG.sync.write(png);
    expect(normalizeDecodedSheetToPreset(buf, 400, 100, {})).toBe(buf);
  });

  it("normalizeDecodedSheetToPreset maps square fal-like per-tile output to tileSize (512² → 100², 2gp-r67u / per-tile path)", () => {
    const png = new PNG({ width: 512, height: 512, colorType: 6 });
    png.data.fill(0);
    const buf = PNG.sync.write(png);
    const out = PNG.sync.read(normalizeDecodedSheetToPreset(buf, 100, 100, {}));
    expect(out.width).toBe(100);
    expect(out.height).toBe(100);
  });

  it("normalizeDecodedSheetToPreset yields preset dimensions from square fal-like output (512² → 400×100)", () => {
    const png = new PNG({ width: 512, height: 512, colorType: 6 });
    png.data.fill(0);
    png.data[0] = 99;
    const buf = PNG.sync.write(png);
    const out = PNG.sync.read(normalizeDecodedSheetToPreset(buf, 400, 100, {}));
    expect(out.width).toBe(400);
    expect(out.height).toBe(100);
  });

  it("normalizeDecodedSheetToPreset uniform-scales an already 4∶1 strip (800×200 → 400×100)", () => {
    const png = new PNG({ width: 800, height: 200, colorType: 6 });
    png.data.fill(0);
    const buf = PNG.sync.write(png);
    const out = PNG.sync.read(normalizeDecodedSheetToPreset(buf, 400, 100, {}));
    expect(out.width).toBe(400);
    expect(out.height).toBe(100);
  });

  it("extractPngRegion throws the same crop-bounds error as the monolith", () => {
    const png = new PNG({ width: 3, height: 3, colorType: 6 });
    png.data.fill(255);
    expect(() => extractPngRegion(png, 0, 0, 4, 1)).toThrow(
      "crop out of bounds: 0,0 4x1 vs 3x3",
    );
  });
});
