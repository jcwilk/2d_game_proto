/**
 * Control images for **FLUX Control LoRA Canny** (`fal-ai/flux-control-lora-canny`): same triangle
 * geometry as **`generators/mock.mjs`** (`triangleForDirection` / `pointInTriangle`), rendered as a
 * **high-contrast silhouette** (white on black) so Canny edges follow the mock arrow outline.
 */

import { PNG } from "pngjs";

import { pointInTriangle, triangleForDirection } from "./generators/mock.mjs";

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

/**
 * One control PNG for a multi-cell sheet: each frame’s mock triangle is drawn at **`crops[id]`**
 * (top-left px), same geometry as **`renderControlMaskBuffer`** per cell.
 *
 * @param {object} opts
 * @param {readonly { id: string }[]} opts.frames
 * @param {number} opts.tileSize
 * @param {Readonly<Record<string, { x: number; y: number }>>} opts.crops
 * @returns {Buffer}
 */
export function renderControlSheetMaskBuffer(opts) {
  const { frames, tileSize, crops } = opts;
  let sheetW = 0;
  let sheetH = 0;
  for (const f of frames) {
    const o = crops[f.id];
    if (!o) throw new Error(`renderControlSheetMaskBuffer: missing crop for "${f.id}"`);
    sheetW = Math.max(sheetW, o.x + tileSize);
    sheetH = Math.max(sheetH, o.y + tileSize);
  }
  const png = new PNG({ width: sheetW, height: sheetH, colorType: 6 });
  png.data.fill(0);
  for (let i = 3; i < png.data.length; i += 4) png.data[i] = 255;

  for (const f of frames) {
    const o = crops[f.id];
    const id = /** @type {'up' | 'down' | 'left' | 'right'} */ (f.id);
    const vertices = triangleForDirection(id, tileSize);
    const [a, b, c] = vertices;
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        const p = { x, y };
        if (!pointInTriangle(p, a, b, c)) continue;
        const gx = o.x + x;
        const gy = o.y + y;
        const i = (sheetW * gy + gx) << 2;
        png.data[i] = png.data[i + 1] = png.data[i + 2] = 255;
        png.data[i + 3] = 255;
      }
    }
  }
  return PNG.sync.write(png);
}

/**
 * Light box blur on the luminance mask so Canny control edges are slightly softer (more T2I freedom).
 *
 * @param {Buffer} buffer  PNG from **`renderControlMaskBuffer`** / **`renderControlSheetMaskBuffer`**
 * @param {number} [passes=1]  3×3 box passes
 * @returns {Buffer}
 */
export function softenControlMaskBuffer(buffer, passes = 1) {
  let png = PNG.sync.read(buffer);
  for (let pass = 0; pass < passes; pass++) {
    const next = new PNG({ width: png.width, height: png.height, colorType: 6 });
    for (let y = 0; y < png.height; y++) {
      for (let x = 0; x < png.width; x++) {
        let sum = 0;
        let count = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= png.width || ny >= png.height) continue;
            const ii = (png.width * ny + nx) << 2;
            sum += png.data[ii];
            count++;
          }
        }
        const v = Math.round(sum / count);
        const i = (png.width * y + x) << 2;
        next.data[i] = v;
        next.data[i + 1] = v;
        next.data[i + 2] = v;
        next.data[i + 3] = 255;
      }
    }
    png = next;
  }
  return PNG.sync.write(png);
}
