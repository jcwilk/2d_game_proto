import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { runChromaKeyStage } from "../pipeline-stages.ts";
import {
  CHROMA_FALLBACK_TOLERANCE_MIN,
  applyChromaKeyToPngBuffer,
  chromaKeyWithBorderFallback,
  keySemiTransparentNearKey,
  removeMagentaFringeAdjacentToTransparent,
} from "./chroma-key.ts";
import { countFullyTransparentPercent } from "./png-region.ts";

describe("chroma-key", () => {
  it("exports CHROMA_FALLBACK_TOLERANCE_MIN unchanged", () => {
    expect(CHROMA_FALLBACK_TOLERANCE_MIN).toBe(64);
  });

  it("applyChromaKeyToPngBuffer preserves source alpha for non-keyed pixels (BRIA soft edges)", () => {
    const png = new PNG({ width: 1, height: 1, colorType: 6 });
    png.data[0] = 20;
    png.data[1] = 200;
    png.data[2] = 30;
    png.data[3] = 90;
    const raw = PNG.sync.write(png);
    const out = applyChromaKeyToPngBuffer(raw, {
      keyRgb: { r: 255, g: 0, b: 255 },
      tolerance: 40,
    });
    const d = PNG.sync.read(out).data;
    expect(d[3]).toBe(90);
    expect([d[0], d[1], d[2]]).toEqual([20, 200, 30]);
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

  it("keySemiTransparentNearKey clears only partial-alpha pixels near key", () => {
    const png = new PNG({ width: 2, height: 1, colorType: 6 });
    png.data.fill(0);
    // left: semi-transparent magenta; right: opaque magenta (unchanged by spill)
    png.data.set([255, 0, 255, 100, 255, 0, 255, 255], 0);
    const raw = PNG.sync.write(png);
    const out = keySemiTransparentNearKey(raw, {
      keyRgb: { r: 255, g: 0, b: 255 },
      maxDist: 10,
    });
    const d = PNG.sync.read(out).data;
    expect([d[0], d[1], d[2], d[3]]).toEqual([0, 0, 0, 0]);
    expect([d[4], d[5], d[6], d[7]]).toEqual([255, 0, 255, 255]);
  });

  it("removeMagentaFringeAdjacentToTransparent clears near-key pixels that border transparency", () => {
    const png = new PNG({ width: 3, height: 1, colorType: 6 });
    png.data.fill(0);
    // center: opaque pink-magenta fringe; neighbors transparent
    png.data[8] = 240;
    png.data[9] = 40;
    png.data[10] = 230;
    png.data[11] = 255;
    const raw = PNG.sync.write(png);
    const out = removeMagentaFringeAdjacentToTransparent(raw, {
      keyRgb: { r: 255, g: 0, b: 255 },
      edgeDist: 250,
      passes: 1,
    });
    const mid = PNG.sync.read(out).data;
    expect([mid[8], mid[9], mid[10], mid[11]]).toEqual([0, 0, 0, 0]);
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

  it("runChromaKeyStage matches chromaKeyWithBorderFallback policy (pipeline registry stage)", () => {
    const png = new PNG({ width: 4, height: 4, colorType: 6 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 255;
      png.data[i + 1] = 0;
      png.data[i + 2] = 255;
      png.data[i + 3] = 255;
    }
    const raw = PNG.sync.write(png);
    const log = () => {};
    const tol = 0;
    const direct = chromaKeyWithBorderFallback(raw, {
      keyRgb: { r: 255, g: 0, b: 255 },
      tolerance: tol,
      fallbackTolerance: Math.max(tol, CHROMA_FALLBACK_TOLERANCE_MIN),
    });
    const staged = runChromaKeyStage({
      buffer: raw,
      keyRgb: { r: 255, g: 0, b: 255 },
      chromaTolerance: tol,
      log,
    });
    expect(staged.buffer.equals(direct.buffer)).toBe(true);
    expect(staged.chromaApplied).toBe(true);
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
