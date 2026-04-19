/**
 * Regression QA: four D-pad directions stay visually distinguishable in **deterministic** stages.
 *
 * Does **not** assert on fal T2I or chroma-key pixels (stochastic); see `../../README.md`.
 * Covers mock raster triangles + white-on-black silhouette masks aligned with `triangleForDirection` / `defaultDpadShapeForFrame`.
 */

import { createHash } from "node:crypto";

import { PNG } from "pngjs";
import { describe, expect, it } from "vitest";

import { generate, renderTriangleSilhouetteTileBuffer, triangleForDirection } from "../../generators/mock.ts";
import { DPAD_FRAMES, TILE_SIZE } from "./dpad.ts";

function sha256(buf: Buffer): string {
  return createHash("sha256").update(buf).digest("hex");
}

/** Grayscale centroid of pixels with alpha > 0 (mock RGBA or control luminance). */
function centroidOpaqueLuma(png: PNG): { x: number; y: number } {
  let sx = 0;
  let sy = 0;
  let w = 0;
  for (let y = 0; y < png.height; y++) {
    for (let x = 0; x < png.width; x++) {
      const i = (png.width * y + x) << 2;
      const a = png.data[i + 3]!;
      if (a === 0) continue;
      const lum = (png.data[i]! + png.data[i + 1]! + png.data[i + 2]!) / 3;
      sx += x * lum;
      sy += y * lum;
      w += lum;
    }
  }
  if (w === 0) throw new Error("centroidOpaqueLuma: no opaque pixels");
  return { x: sx / w, y: sy / w };
}

function pairs(ids: string[]): [string, string][] {
  const out: [string, string][] = [];
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      out.push([ids[i]!, ids[j]!]);
    }
  }
  return out;
}

type DpadDir = "up" | "down" | "left" | "right";

describe("presets/dpad distinguishability (deterministic geometry)", () => {
  const ids = DPAD_FRAMES.map((f) => f.id);
  expect(ids).toEqual(["up", "down", "left", "right"]);

  it("mock PNG buffers are pairwise distinct at preset TILE_SIZE (four directions)", async () => {
    const hashes = new Map<string, string>();
    for (const id of ids) {
      const frame = DPAD_FRAMES.find((f) => f.id === id);
      expect(frame).toBeDefined();
      const { buffer } = await generate(frame!, { tileSize: TILE_SIZE });
      hashes.set(id, sha256(buffer));
    }
    for (const [a, b] of pairs(ids)) {
      expect(hashes.get(a)).not.toBe(hashes.get(b));
    }
  });

  it("triangle silhouette mask buffers are pairwise distinct at preset TILE_SIZE", () => {
    const hashes = new Map<string, string>();
    for (const id of ids) {
      const vertices = triangleForDirection(id as DpadDir, TILE_SIZE);
      const buf = renderTriangleSilhouetteTileBuffer({ tileSize: TILE_SIZE, vertices });
      hashes.set(id, sha256(buf));
    }
    for (const [a, b] of pairs(ids)) {
      expect(hashes.get(a)).not.toBe(hashes.get(b));
    }
  });

  it("mock tile centroids of opaque pixels differ measurably between directions (not only hash)", async () => {
    const centroids = new Map<string, { x: number; y: number }>();
    for (const id of ids) {
      const frame = DPAD_FRAMES.find((f) => f.id === id);
      const { buffer } = await generate(frame!, { tileSize: TILE_SIZE });
      const png = PNG.sync.read(buffer);
      centroids.set(id, centroidOpaqueLuma(png));
    }
    const minSep = 8;
    for (const [a, b] of pairs(ids)) {
      const pa = centroids.get(a)!;
      const pb = centroids.get(b)!;
      const dx = Math.abs(pa.x - pb.x);
      const dy = Math.abs(pa.y - pb.y);
      expect(dx + dy, `${a} vs ${b} centroid separation`).toBeGreaterThanOrEqual(minSep);
    }
  });
});
