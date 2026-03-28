/**
 * Deterministic mock raster (RGBA) for pipeline tests and `--mode mock` workflows.
 * Geometry is injectable via `shapeForFrame` so non–D-pad presets can swap shapes without forking this module.
 */

import { PNG } from "pngjs";

/** Same layout as dpad `SHEET_CROPS`: [ up, right; left, down ] in 2×2 cell coordinates. */
export const DEFAULT_DPAD_SHEET_LAYOUT = /** @type {const} */ ({
  up: { x: 0, y: 0 },
  right: { x: 1, y: 0 },
  left: { x: 0, y: 1 },
  down: { x: 1, y: 1 },
});

/**
 * @param {{ x: number; y: number }} p
 * @param {{ x: number; y: number }} a
 * @param {{ x: number; y: number }} b
 * @param {{ x: number; y: number }} c
 */
export function pointInTriangle(p, a, b, c) {
  const sign = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = sign(p, a, b);
  const d2 = sign(p, b, c);
  const d3 = sign(p, c, a);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

/**
 * @param {'up'|'down'|'left'|'right'} dir
 * @param {number} [tileSize=256]
 * @returns {[{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }]}
 */
export function triangleForDirection(dir, tileSize = 256) {
  const m = 32;
  const cx = tileSize / 2;
  const cy = tileSize / 2;
  switch (dir) {
    case "up":
      return [
        { x: cx, y: m },
        { x: m, y: tileSize - m },
        { x: tileSize - m, y: tileSize - m },
      ];
    case "down":
      return [
        { x: m, y: m },
        { x: tileSize - m, y: m },
        { x: cx, y: tileSize - m },
      ];
    case "left":
      return [
        { x: m, y: cy },
        { x: tileSize - m, y: m },
        { x: tileSize - m, y: tileSize - m },
      ];
    case "right":
      return [
        { x: tileSize - m, y: cy },
        { x: m, y: m },
        { x: m, y: tileSize - m },
      ];
    default:
      throw new Error(String(dir));
  }
}

/**
 * @param {import('./types.mjs').GeneratorFrame} frame
 * @param {{ tileSize: number }} ctx
 */
export function defaultDpadShapeForFrame(frame, ctx) {
  const id = frame.id;
  if (id !== "up" && id !== "down" && id !== "left" && id !== "right") {
    throw new Error(`mock: unsupported frame id for default D-pad shape: ${id}`);
  }
  return triangleForDirection(id, ctx.tileSize);
}

/**
 * @param {object} opts
 * @param {number} opts.tileSize
 * @param {[{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }]} opts.vertices
 * @param {{ r: number; g: number; b: number; a: number }} opts.fill
 * @returns {Buffer}
 */
export function renderMockPngBuffer(opts) {
  const { tileSize, vertices, fill } = opts;
  const [a, b, c] = vertices;
  const png = new PNG({ width: tileSize, height: tileSize, colorType: 6 });
  for (let y = 0; y < tileSize; y++) {
    for (let x = 0; x < tileSize; x++) {
      const i = (tileSize * y + x) << 2;
      const p = { x, y };
      if (pointInTriangle(p, a, b, c)) {
        png.data[i] = fill.r;
        png.data[i + 1] = fill.g;
        png.data[i + 2] = fill.b;
        png.data[i + 3] = fill.a;
      } else {
        png.data[i] = 0;
        png.data[i + 1] = 0;
        png.data[i + 2] = 0;
        png.data[i + 3] = 0;
      }
    }
  }
  return PNG.sync.write(png);
}

/**
 * @param {import('./types.mjs').GeneratorFrame} frame
 * @param {import('./types.mjs').MockGeneratorConfig} [config]
 * @returns {Promise<import('./types.mjs').GenerateResult>}
 */
export async function generate(frame, config = {}) {
  const tileSize = config.tileSize ?? 256;
  const fill = config.fill ?? { r: 0x5a, g: 0x6f, b: 0x9e, a: 0xff };
  const shapeForFrame = config.shapeForFrame ?? defaultDpadShapeForFrame;
  const vertices = shapeForFrame(frame, { tileSize });
  const buffer = renderMockPngBuffer({ tileSize, vertices, fill });
  return {
    buffer,
    metadata: {
      width: tileSize,
      height: tileSize,
      mode: "mock",
      seed: config.seed,
    },
  };
}

/**
 * Composite up to four frames into one 2×2 sheet (2×tileSize square). Uses `sheetLayout` or {@link DEFAULT_DPAD_SHEET_LAYOUT}.
 *
 * @param {import('./types.mjs').GeneratorFrame[]} frames
 * @param {import('./types.mjs').MockGeneratorConfig} [config]
 * @returns {Promise<import('./types.mjs').GenerateResult>}
 */
export async function generateSheet(frames, config = {}) {
  const tileSize = config.tileSize ?? 256;
  const sheetSize = tileSize * 2;
  const layout = config.sheetLayout ?? DEFAULT_DPAD_SHEET_LAYOUT;

  const png = new PNG({ width: sheetSize, height: sheetSize, colorType: 6 });
  png.data.fill(0);

  for (const frame of frames) {
    const cell = layout[frame.id];
    if (!cell) {
      throw new Error(`mock generateSheet: missing sheet layout cell for frame id "${frame.id}"`);
    }
    const { buffer } = await generate(frame, config);
    const tile = PNG.sync.read(buffer);
    if (tile.width !== tileSize || tile.height !== tileSize) {
      throw new Error(`mock generateSheet: expected ${tileSize}×${tileSize} tile, got ${tile.width}×${tile.height}`);
    }
    const x0 = cell.x * tileSize;
    const y0 = cell.y * tileSize;
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        const si = (tile.width * y + x) << 2;
        const di = (sheetSize * (y0 + y) + (x0 + x)) << 2;
        png.data[di] = tile.data[si];
        png.data[di + 1] = tile.data[si + 1];
        png.data[di + 2] = tile.data[si + 2];
        png.data[di + 3] = tile.data[si + 3];
      }
    }
  }

  return {
    buffer: PNG.sync.write(png),
    metadata: {
      width: sheetSize,
      height: sheetSize,
      mode: "mock",
      seed: config.seed,
    },
  };
}
