import { PNG } from "pngjs";

import { countFullyTransparentPercent } from "./png-region.mjs";

/** When the prompt hex misses FLUX drift, fallback inferred key uses at least this tolerance (Euclidean RGB distance). */
export const CHROMA_FALLBACK_TOLERANCE_MIN = 64;

/**
 * @typedef {'max' | 'euclidean'} ChromaDistanceMetric
 * Per-channel max (legacy) vs L2 in RGB — Euclidean removes more magenta/purple fringe for the same nominal scale.
 */

/**
 * Median RGB from four corner blocks — tends to sample **clean background** vs a full 1px border
 * when the glyph touches edges (border median can mix glyph/AA into the key).
 *
 * @param {import('pngjs').PNG} png
 * @param {number} [blockSize] Edge length of each corner square (clamped to image).
 * @returns {{ r: number; g: number; b: number }}
 */
export function inferBackgroundKeyFromCorners(png, blockSize = 16) {
  const w = png.width;
  const h = png.height;
  const maxBlock = Math.max(1, Math.floor(Math.min(w, h) / 4));
  const s = Math.min(Math.max(1, blockSize), maxBlock);
  const rs = [];
  const gs = [];
  const bs = [];
  const pushBlock = (x0, y0) => {
    for (let y = y0; y < y0 + s && y < h; y++) {
      for (let x = x0; x < x0 + s && x < w; x++) {
        const i = (w * y + x) << 2;
        rs.push(png.data[i]);
        gs.push(png.data[i + 1]);
        bs.push(png.data[i + 2]);
      }
    }
  };
  pushBlock(0, 0);
  pushBlock(w - s, 0);
  pushBlock(0, h - s);
  pushBlock(w - s, h - s);
  const median = (arr) => {
    const sorted = [...arr].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  return { r: median(rs), g: median(gs), b: median(bs) };
}

/**
 * @param {import('pngjs').PNG} png
 * @returns {{ r: number; g: number; b: number }}
 */
export function inferBackgroundKeyFromBorder(png) {
  const w = png.width;
  const h = png.height;
  const rs = [];
  const gs = [];
  const bs = [];
  const push = (x, y) => {
    const i = (w * y + x) << 2;
    rs.push(png.data[i]);
    gs.push(png.data[i + 1]);
    bs.push(png.data[i + 2]);
  };
  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 1; y < h - 1; y++) {
    push(0, y);
    push(w - 1, y);
  }
  const median = (arr) => {
    const s = [...arr].sort((a, b) => a - b);
    return s[Math.floor(s.length / 2)];
  };
  return { r: median(rs), g: median(gs), b: median(bs) };
}

/**
 * Deterministic chroma-key: pixels within per-channel RGB tolerance of `keyRgb` → alpha 0;
 * other pixels → opaque RGBA (glyph for HUD overlay).
 *
 * @param {Buffer} pngBuffer
 * @param {{ keyRgb: { r: number; g: number; b: number }; tolerance: number; metric?: ChromaDistanceMetric }} opts
 * @returns {Buffer}
 */
export function applyChromaKeyToPngBuffer(pngBuffer, opts) {
  const { keyRgb, tolerance } = opts;
  const metric = opts.metric ?? "euclidean";
  const png = PNG.sync.read(pngBuffer);
  const out = new PNG({ width: png.width, height: png.height, colorType: 6 });
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const dr = Math.abs(r - keyRgb.r);
    const dg = Math.abs(g - keyRgb.g);
    const db = Math.abs(b - keyRgb.b);
    const match =
      metric === "max"
        ? dr <= tolerance && dg <= tolerance && db <= tolerance
        : dr * dr + dg * dg + db * db <= tolerance * tolerance;
    if (match) {
      out.data[i] = 0;
      out.data[i + 1] = 0;
      out.data[i + 2] = 0;
      out.data[i + 3] = 0;
    } else {
      out.data[i] = r;
      out.data[i + 1] = g;
      out.data[i + 2] = b;
      // Preserve source alpha (BRIA / anti-alias). Forcing 255 was crushing soft edges into
      // opaque magenta-tinted fringe next to the key color.
      out.data[i + 3] = png.data[i + 3];
    }
  }
  return PNG.sync.write(out);
}

/**
 * After primary chroma, peel residual **magenta-tinted** pixels that sit on the **outer silhouette**
 * (4-neighbor to a transparent pixel). Uses a **looser** Euclidean distance than the main key so
 * semi-opaque BRIA fringe can be removed without keying the whole interior.
 *
 * @param {Buffer} pngBuffer
 * @param {{ keyRgb: { r: number; g: number; b: number }; edgeDist: number; passes?: number }} opts
 * @returns {Buffer}
 */
export function removeMagentaFringeAdjacentToTransparent(pngBuffer, opts) {
  const { keyRgb, edgeDist } = opts;
  const passes = opts.passes ?? 2;
  const dist = (r, g, b) => {
    const dr = r - keyRgb.r;
    const dg = g - keyRgb.g;
    const db = b - keyRgb.b;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  };
  let buf = pngBuffer;
  for (let p = 0; p < passes; p++) {
    const png = PNG.sync.read(buf);
    const w = png.width;
    const h = png.height;
    const out = new PNG({ width: w, height: h, colorType: 6 });
    out.data.set(png.data);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (w * y + x) << 2;
        if (png.data[i + 3] === 0) continue;
        let adjTrans = false;
        for (const [dx, dy] of [
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
        ]) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          const ni = (w * ny + nx) << 2;
          if (png.data[ni + 3] === 0) {
            adjTrans = true;
            break;
          }
        }
        if (!adjTrans) continue;
        const r = png.data[i];
        const g = png.data[i + 1];
        const b = png.data[i + 2];
        if (dist(r, g, b) <= edgeDist) {
          out.data[i] = 0;
          out.data[i + 1] = 0;
          out.data[i + 2] = 0;
          out.data[i + 3] = 0;
        }
      }
    }
    buf = PNG.sync.write(out);
  }
  return buf;
}

/**
 * BRIA often leaves **partially transparent** edge pixels: RGB is still magenta-tinted but the main
 * chroma pass may not remove them cleanly when alpha is preserved. This pass only clears pixels with
 * **`0 < alpha < 255`** within **`maxDist`** of the key — **fully opaque** pixels are unchanged (no
 * costume loss from this step alone).
 *
 * @param {Buffer} pngBuffer
 * @param {{ keyRgb: { r: number; g: number; b: number }; maxDist: number }} opts
 * @returns {Buffer}
 */
export function keySemiTransparentNearKey(pngBuffer, opts) {
  const { keyRgb, maxDist } = opts;
  const png = PNG.sync.read(pngBuffer);
  const out = new PNG({ width: png.width, height: png.height, colorType: 6 });
  out.data.set(png.data);
  const max2 = maxDist * maxDist;
  for (let i = 0; i < png.data.length; i += 4) {
    const a = png.data[i + 3];
    if (a === 0 || a === 255) continue;
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const dr = r - keyRgb.r;
    const dg = g - keyRgb.g;
    const db = b - keyRgb.b;
    if (dr * dr + dg * dg + db * db <= max2) {
      out.data[i] = 0;
      out.data[i + 1] = 0;
      out.data[i + 2] = 0;
      out.data[i + 3] = 0;
    }
  }
  return PNG.sync.write(out);
}

/**
 * FLUX often drifts from the exact prompt hex; if the primary key removes almost nothing,
 * use median border color as the key (valid when the glyph is inset from edges).
 *
 * @param {Buffer} rawFalPng
 * @param {{ keyRgb: { r: number; g: number; b: number }; tolerance: number; fallbackTolerance: number; metric?: ChromaDistanceMetric }} opts
 * @returns {{ buffer: Buffer; usedPrimaryKey: boolean; keyRgb: { r: number; g: number; b: number } }}
 */
export function chromaKeyWithBorderFallback(rawFalPng, opts) {
  const { keyRgb, tolerance, fallbackTolerance } = opts;
  const metric = opts.metric ?? "euclidean";
  let buf = applyChromaKeyToPngBuffer(rawFalPng, { keyRgb, tolerance, metric });
  let usedPrimaryKey = true;
  let effectiveKey = keyRgb;
  const pct = countFullyTransparentPercent(buf);
  if (pct < 0.8) {
    const png = PNG.sync.read(rawFalPng);
    const inferred = inferBackgroundKeyFromCorners(png);
    buf = applyChromaKeyToPngBuffer(rawFalPng, { keyRgb: inferred, tolerance: fallbackTolerance, metric });
    usedPrimaryKey = false;
    effectiveKey = inferred;
  }
  return { buffer: buf, usedPrimaryKey, keyRgb: effectiveKey };
}
