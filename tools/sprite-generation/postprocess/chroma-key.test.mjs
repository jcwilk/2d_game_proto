import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import {
  CHROMA_FALLBACK_TOLERANCE_MIN,
  applyChromaKeyToPngBuffer,
  chromaKeyWithBorderFallback,
} from "./chroma-key.mjs";
import { countFullyTransparentPercent } from "./png-region.mjs";

describe("chroma-key", () => {
  it("exports CHROMA_FALLBACK_TOLERANCE_MIN unchanged", () => {
    expect(CHROMA_FALLBACK_TOLERANCE_MIN).toBe(64);
  });

  it("applyChromaKeyToPngBuffer: primary key removes matching pixels deterministically", () => {
    const png = new PNG({ width: 4, height: 4, colorType: 6 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 255;
      png.data[i + 1] = 0;
      png.data[i + 2] = 255;
      png.data[i + 3] = 255;
    }
    png.data[20] = 0;
    png.data[21] = 255;
    png.data[22] = 0;
    png.data[23] = 255;
    const raw = PNG.sync.write(png);
    const out = applyChromaKeyToPngBuffer(raw, {
      keyRgb: { r: 255, g: 0, b: 255 },
      tolerance: 0,
    });
    const decoded = PNG.sync.read(out);
    expect(decoded.width).toBe(4);
    expect(decoded.height).toBe(4);
    expect(countFullyTransparentPercent(out)).toBeCloseTo((15 / 16) * 100, 5);
    expect([decoded.data[20], decoded.data[21], decoded.data[22], decoded.data[23]]).toEqual([
      0, 255, 0, 255,
    ]);
  });

  it("chromaKeyWithBorderFallback uses primary key when enough pixels are keyed out", () => {
    const png = new PNG({ width: 8, height: 8, colorType: 6 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 255;
      png.data[i + 1] = 0;
      png.data[i + 2] = 255;
      png.data[i + 3] = 255;
    }
    const raw = PNG.sync.write(png);
    const { buffer, usedPrimaryKey, keyRgb } = chromaKeyWithBorderFallback(raw, {
      keyRgb: { r: 255, g: 0, b: 255 },
      tolerance: 0,
      fallbackTolerance: 52,
    });
    expect(usedPrimaryKey).toBe(true);
    expect(keyRgb).toEqual({ r: 255, g: 0, b: 255 });
    expect(countFullyTransparentPercent(buffer)).toBe(100);
  });

  it("chromaKeyWithBorderFallback takes corner-median fallback when primary removes <0.8%", () => {
    const png = new PNG({ width: 4, height: 4, colorType: 6 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 100;
      png.data[i + 1] = 100;
      png.data[i + 2] = 100;
      png.data[i + 3] = 255;
    }
    const raw = PNG.sync.write(png);
    const { buffer, usedPrimaryKey, keyRgb } = chromaKeyWithBorderFallback(raw, {
      keyRgb: { r: 255, g: 0, b: 255 },
      tolerance: 42,
      fallbackTolerance: Math.max(42, CHROMA_FALLBACK_TOLERANCE_MIN),
    });
    expect(usedPrimaryKey).toBe(false);
    expect(keyRgb).toEqual({ r: 100, g: 100, b: 100 });
    expect(countFullyTransparentPercent(buffer)).toBe(100);
  });
});
