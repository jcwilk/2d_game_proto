/**
 * Deterministic mock raster (RGBA) for pipeline tests and `--mode mock` workflows.
 * Geometry is injectable via `shapeForFrame` so non–D-pad presets can swap shapes without forking this module.
 */

import { PNG } from "pngjs";

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
  const m = Math.max(4, Math.round((tileSize * 32) / 256));
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
 * High-contrast **white triangle on black** PNG (same geometry as **`triangleForDirection`** / mock raster).
 * Used by tests for pairwise distinguishability; not tied to a specific fal model.
 *
 * @param {object} opts
 * @param {number} opts.tileSize
 * @param {[{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }]} opts.vertices
 * @returns {Buffer}
 */
export function renderTriangleSilhouetteTileBuffer(opts) {
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
 * Walk-cycle phase index from preset frame id **`walk_0`** … **`walk_3`**.
 *
 * @param {string} id
 * @returns {0|1|2|3}
 */
export function walkPhaseFromFrameId(id) {
  const m = /^walk_(\d)$/.exec(id);
  if (!m) {
    throw new Error(`mock character walk: frame id must be walk_0..walk_3, got ${JSON.stringify(id)}`);
  }
  const n = Number(m[1]);
  if (n < 0 || n > 3 || !Number.isInteger(n)) {
    throw new Error(`mock character walk: invalid walk index in ${JSON.stringify(id)}`);
  }
  return /** @type {0|1|2|3} */ (n);
}

/**
 * Deterministic RGBA tile: simple “pixel” figure with four leg phases (mock walk cycle).
 *
 * @param {import('./types.mjs').GeneratorFrame} frame
 * @param {number} tileSize
 * @returns {import('node:buffer').Buffer}
 */
export function renderCharacterWalkMockTileBuffer(frame, tileSize) {
  const fill = { r: 0x5a, g: 0x6f, b: 0x9e, a: 0xff };
  const leftDx = [-4, 0, 4, 0];
  const rightDx = [4, 0, -4, 0];
  /** `walk_0` = idle (symmetric feet); `walk_1`–`walk_3` map to three stride phases (see **`presets/character.mjs`**). */
  let ld;
  let rd;
  if (frame.id === "walk_0") {
    ld = 0;
    rd = 0;
  } else {
    const ix = walkPhaseFromFrameId(frame.id);
    const phase = ix - 1;
    ld = leftDx[phase];
    rd = rightDx[phase];
  }

  const png = new PNG({ width: tileSize, height: tileSize, colorType: 6 });
  png.data.fill(0);

  const cx = (tileSize / 2) | 0;
  const head = Math.max(4, Math.round((tileSize * 10) / 64));
  const hx0 = cx - (head / 2) | 0;
  const hy0 = Math.max(2, Math.round(tileSize * 0.08));
  const bw = Math.max(6, Math.round((tileSize * 12) / 64));
  const bh = Math.round(tileSize * 0.28);
  const bx0 = cx - (bw / 2) | 0;
  const by0 = hy0 + head + 2;
  const legW = Math.max(4, Math.round((tileSize * 5) / 64));
  const legH = Math.min(Math.round(tileSize * 0.34), tileSize - by0 - bh - 4);
  const footY = tileSize - legH - 2;
  const leftLegX = bx0 - 2 + ld;
  const rightLegX = bx0 + bw - legW + 2 + rd;

  /**
   * @param {number} x0
   * @param {number} y0
   * @param {number} w
   * @param {number} h
   */
  const fillRect = (x0, y0, w, h) => {
    for (let y = y0; y < y0 + h; y++) {
      for (let x = x0; x < x0 + w; x++) {
        if (x < 0 || y < 0 || x >= tileSize || y >= tileSize) continue;
        const i = (tileSize * y + x) << 2;
        png.data[i] = fill.r;
        png.data[i + 1] = fill.g;
        png.data[i + 2] = fill.b;
        png.data[i + 3] = fill.a;
      }
    }
  };

  fillRect(hx0, hy0, head, head);
  fillRect(bx0, by0, bw, bh);
  fillRect(leftLegX, footY, legW, legH);
  fillRect(rightLegX, footY, legW, legH);

  return PNG.sync.write(png);
}

/**
 * One sheet PNG: each frame’s triangle at **`crops[id]`** (top-left px), same per-cell geometry as **`renderTriangleSilhouetteTileBuffer`**.
 *
 * @param {object} opts
 * @param {readonly { id: string }[]} opts.frames
 * @param {number} opts.tileSize
 * @param {Readonly<Record<string, { x: number; y: number }>>} opts.crops
 * @param {number} [opts.sheetWidth]
 * @param {number} [opts.sheetHeight]
 * @returns {Buffer}
 */
export function renderTriangleSilhouetteSheetBuffer(opts) {
  const { frames, tileSize, crops } = opts;
  let sheetW = opts.sheetWidth;
  let sheetH = opts.sheetHeight;
  if (sheetW != null && sheetH != null) {
    for (const f of frames) {
      const o = crops[f.id];
      if (!o) throw new Error(`renderTriangleSilhouetteSheetBuffer: missing crop for "${f.id}"`);
      if (o.x + tileSize > sheetW || o.y + tileSize > sheetH) {
        throw new Error(
          `renderTriangleSilhouetteSheetBuffer: crop for "${f.id}" (${o.x}+${tileSize}, ${o.y}+${tileSize}) exceeds sheet ${sheetW}x${sheetH}`,
        );
      }
    }
  } else {
    sheetW = 0;
    sheetH = 0;
    for (const f of frames) {
      const o = crops[f.id];
      if (!o) throw new Error(`renderTriangleSilhouetteSheetBuffer: missing crop for "${f.id}"`);
      sheetW = Math.max(sheetW, o.x + tileSize);
      sheetH = Math.max(sheetH, o.y + tileSize);
    }
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
 * Light 3×3 box blur on luminance (for tests / optional mask softening).
 *
 * @param {Buffer} buffer
 * @param {number} [passes=1]
 * @returns {Buffer}
 */
export function softenTriangleMaskBuffer(buffer, passes = 1) {
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

/**
 * @param {import('./types.mjs').GeneratorFrame} frame
 * @param {import('./types.mjs').MockGeneratorConfig} [config]
 * @returns {Promise<import('./types.mjs').GenerateResult>}
 */
export async function generate(frame, config = {}) {
  const tileSize = config.tileSize ?? 256;
  if (typeof config.tileBufferForFrame === "function") {
    const buffer = config.tileBufferForFrame(frame, { tileSize });
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
 * Composite up to four frames into one 2×2 sheet (2×tileSize square).
 * **`sheetLayout`** is required — derive from `preset.sheet.crops` and `tileSize` via
 * **`sheetLayoutFromCrops`** in **`../sheet-layout.mjs`** (pixel crop origins → cell coordinates).
 *
 * @param {import('./types.mjs').GeneratorFrame[]} frames
 * @param {import('./types.mjs').MockGeneratorConfig} config
 * @returns {Promise<import('./types.mjs').GenerateResult>}
 */
export async function generateSheet(frames, config = {}) {
  const tileSize = config.tileSize ?? 256;
  const layout = config.sheetLayout;
  if (!layout) {
    throw new Error(
      "mock generateSheet: sheetLayout is required (derive from preset.sheet.crops with sheetLayoutFromCrops)"
    );
  }

  let sheetWidth = 0;
  let sheetHeight = 0;
  for (const frame of frames) {
    const cell = layout[frame.id];
    if (!cell) {
      throw new Error(`mock generateSheet: missing sheet layout cell for frame id "${frame.id}"`);
    }
    const x0 = cell.x * tileSize;
    const y0 = cell.y * tileSize;
    sheetWidth = Math.max(sheetWidth, x0 + tileSize);
    sheetHeight = Math.max(sheetHeight, y0 + tileSize);
  }

  const png = new PNG({ width: sheetWidth, height: sheetHeight, colorType: 6 });
  png.data.fill(0);

  for (const frame of frames) {
    const cell = layout[frame.id];
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
        const di = (sheetWidth * (y0 + y) + (x0 + x)) << 2;
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
      width: sheetWidth,
      height: sheetHeight,
      mode: "mock",
      seed: config.seed,
    },
  };
}
