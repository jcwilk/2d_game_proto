import { PNG } from "pngjs";

import { countFullyTransparentPercent } from "./png-region.mjs";

/** When the prompt hex misses FLUX drift, border-median key uses at least this tolerance. */
export const CHROMA_FALLBACK_TOLERANCE_MIN = 52;

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
 * @param {{ keyRgb: { r: number; g: number; b: number }; tolerance: number }} opts
 * @returns {Buffer}
 */
export function applyChromaKeyToPngBuffer(pngBuffer, opts) {
  const { keyRgb, tolerance } = opts;
  const png = PNG.sync.read(pngBuffer);
  const out = new PNG({ width: png.width, height: png.height, colorType: 6 });
  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i];
    const g = png.data[i + 1];
    const b = png.data[i + 2];
    const dr = Math.abs(r - keyRgb.r);
    const dg = Math.abs(g - keyRgb.g);
    const db = Math.abs(b - keyRgb.b);
    const match = dr <= tolerance && dg <= tolerance && db <= tolerance;
    if (match) {
      out.data[i] = 0;
      out.data[i + 1] = 0;
      out.data[i + 2] = 0;
      out.data[i + 3] = 0;
    } else {
      out.data[i] = r;
      out.data[i + 1] = g;
      out.data[i + 2] = b;
      out.data[i + 3] = 255;
    }
  }
  return PNG.sync.write(out);
}

/**
 * FLUX often drifts from the exact prompt hex; if the primary key removes almost nothing,
 * use median border color as the key (valid when the glyph is inset from edges).
 *
 * @param {Buffer} rawFalPng
 * @param {{ keyRgb: { r: number; g: number; b: number }; tolerance: number; fallbackTolerance: number }} opts
 * @returns {{ buffer: Buffer; usedPrimaryKey: boolean; keyRgb: { r: number; g: number; b: number } }}
 */
export function chromaKeyWithBorderFallback(rawFalPng, opts) {
  const { keyRgb, tolerance, fallbackTolerance } = opts;
  let buf = applyChromaKeyToPngBuffer(rawFalPng, { keyRgb, tolerance });
  let usedPrimaryKey = true;
  let effectiveKey = keyRgb;
  const pct = countFullyTransparentPercent(buf);
  if (pct < 0.8) {
    const png = PNG.sync.read(rawFalPng);
    const inferred = inferBackgroundKeyFromBorder(png);
    buf = applyChromaKeyToPngBuffer(rawFalPng, { keyRgb: inferred, tolerance: fallbackTolerance });
    usedPrimaryKey = false;
    effectiveKey = inferred;
  }
  return { buffer: buf, usedPrimaryKey, keyRgb: effectiveKey };
}
