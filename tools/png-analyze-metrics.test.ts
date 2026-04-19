import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import {
  analyzePngBuffer,
  computeAlphaStats,
  computeGridProjection,
  computeOpaqueBbox,
} from "./png-analyze-metrics.ts";

const __dirname = dirname(fileURLToPath(import.meta.url));

describe("png-analyze-metrics", () => {
  it("reports dimensions and full opacity for a synthetic solid image", () => {
    const png = new PNG({ width: 4, height: 4, colorType: 6 });
    for (let i = 0; i < png.data.length; i += 4) {
      png.data[i] = 10;
      png.data[i + 1] = 20;
      png.data[i + 2] = 30;
      png.data[i + 3] = 255;
    }
    const buf = PNG.sync.write(png);
    const r = analyzePngBuffer(buf);
    expect(r.dimensions).toEqual({ width: 4, height: 4 });
    expect(r.fileSizeBytes).toBe(buf.length);
    expect(r.alpha.fullyOpaquePercent).toBe(100);
    expect(r.alpha.fullyTransparentPercent).toBe(0);
    expect(r.alpha.semiTransparentPercent).toBe(0);
    expect(r.alpha.histogram256[255]).toBe(16);
    expect(r.opaqueBbox).toEqual({ minX: 0, minY: 0, maxX: 3, maxY: 3 });
    expect(r.grid).toBeNull();
  });

  it("matches checked-in grid fixture 64×64 with 32×32 cells", () => {
    const fixturePath = join(__dirname, "..", "src", "art", "fixtures", "sample-grid-atlas.png");
    const buf = readFileSync(fixturePath);
    const r = analyzePngBuffer(buf, { spriteWidth: 32, spriteHeight: 32 });
    expect(r.dimensions).toEqual({ width: 64, height: 64 });
    expect(r.grid).not.toBeNull();
    expect(r.grid?.divisible).toBe(true);
    expect(r.grid?.columns).toBe(2);
    expect(r.grid?.rows).toBe(2);
    expect(r.grid?.remainderWidth).toBe(0);
    expect(r.grid?.remainderHeight).toBe(0);
  });

  it("computeGridProjection returns null for invalid cell size", () => {
    const png = new PNG({ width: 8, height: 8, colorType: 6 });
    png.data.fill(255);
    expect(computeGridProjection(png, 0, 8)).toBeNull();
    expect(computeGridProjection(png, 8, -1)).toBeNull();
  });

  it("computeOpaqueBbox returns null for all-transparent image", () => {
    const png = new PNG({ width: 2, height: 2, colorType: 6 });
    png.data.fill(0);
    expect(computeOpaqueBbox(png)).toBeNull();
  });

  it("computeAlphaStats counts semi-transparent pixels", () => {
    const png = new PNG({ width: 2, height: 1, colorType: 6 });
    const d = png.data;
    d[0] = 0;
    d[1] = 0;
    d[2] = 0;
    d[3] = 0;
    d[4] = 0;
    d[5] = 0;
    d[6] = 0;
    d[7] = 128;
    const s = computeAlphaStats(png);
    expect(s.fullyTransparentPercent).toBeCloseTo(50, 5);
    expect(s.semiTransparentPercent).toBeCloseTo(50, 5);
    expect(s.histogram256[128]).toBe(1);
  });
});
