/**
 * Control images for **FLUX Control LoRA Canny** (`fal-ai/flux-control-lora-canny`): same triangle
 * geometry as **`generators/mock.mjs`** (`triangleForDirection` / `pointInTriangle`), rendered as a
 * **high-contrast silhouette** (white on black) so Canny edges follow the mock arrow outline.
 */

import { PNG } from "pngjs";

import { pointInTriangle } from "./generators/mock.mjs";

/**
 * @param {object} opts
 * @param {number} opts.tileSize
 * @param {[{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }]} opts.vertices
 * @returns {Buffer} PNG RGBA — **white** triangle, **black** background (opaque).
 */
export function renderControlMaskBuffer(opts) {
  const { tileSize, vertices } = opts;
  const [a, b, c] = vertices;
  const png = new PNG({ width: tileSize, height: tileSize, colorType: 6 });
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const i = (tileSize * y + x) << 2;
      const p = { x, y };
      const inside = pointInTriangle(p, a, b, c);
      const v = inside ? 255 : 0;
      png.data[i] = v;
      png.data[i + 1] = v;
      png.data[i + 2] = v;
      png.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}
