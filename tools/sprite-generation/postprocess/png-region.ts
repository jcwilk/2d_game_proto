// @ts-nocheck
import { PNG } from "pngjs";

/**
 * ## D-pad / fal sheet decode policy (epic **2gp-p4js**)
 *
 * Some fal image models may return a **square** PNG (e.g. 512²) when the request asks for a **4∶1**
 * strip (`400×100`). We
 * **do not** anisotropically nearest-neighbor squash that square onto the strip (different X vs Y scale
 * distorts glyphs). Instead we **center-crop** the decoded raster to the preset’s aspect ratio
 * (**`SHEET_WIDTH`∶`SHEET_HEIGHT`**, e.g. 4∶1), then apply **one** uniform **nearest-neighbor** resize to the
 * exact preset pixel size. **`scaleFilter: 'bilinear'`** (default) uses premultiplied-alpha bilinear resize
 * (**`resizePngBufferBilinearPremultiplied`**) for illustrated / painterly art; **`'nearest'`** uses
 * **`resizePngBufferNearest`** for crisp UI glyphs (e.g. d-pad). Rejected for this path: relying on fal always
 * honoring non-square `image_size`; changing strip dimensions without updating the preset; using anisotropic
 * scale as the sole fix from square output.
 */

/**
 * @param {import('pngjs').PNG} src
 * @param {number} x0
 * @param {number} y0
 * @param {number} w
 * @param {number} h
 * @returns {Buffer}
 */
export function extractPngRegion(src, x0, y0, w, h) {
  if (x0 + w > src.width || y0 + h > src.height) {
    throw new Error(`crop out of bounds: ${x0},${y0} ${w}x${h} vs ${src.width}x${src.height}`);
  }
  const dst = new PNG({ width: w, height: h, colorType: src.colorType });
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const sx = x0 + x;
      const sy = y0 + y;
      const si = (src.width * sy + sx) << 2;
      const di = (w * y + x) << 2;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
  return PNG.sync.write(dst);
}

/**
 * @param {Buffer} pngBuffer
 * @returns {number} Percent of pixels with alpha 0 (0–100).
 */
export function countFullyTransparentPercent(pngBuffer) {
  const png = PNG.sync.read(pngBuffer);
  let transparent = 0;
  const n = png.width * png.height;
  for (let i = 3; i < png.data.length; i += 4) {
    if (png.data[i] === 0) transparent++;
  }
  return (transparent / n) * 100;
}

/**
 * Nearest-neighbor resize (pixel-art friendly). Prefer calling **`normalizeDecodedSheetToPreset`**
 * for sheet jobs so aspect is corrected by crop first; this helper is the uniform scale step when
 * source dimensions already match the target aspect ratio.
 *
 * @param {Buffer} pngBuffer
 * @param {number} targetW
 * @param {number} targetH
 * @returns {Buffer}
 */
export function resizePngBufferNearest(pngBuffer, targetW, targetH) {
  const src = PNG.sync.read(pngBuffer);
  if (src.width === targetW && src.height === targetH) {
    return pngBuffer;
  }
  const dst = new PNG({ width: targetW, height: targetH, colorType: 6 });
  const sw = src.width;
  const sh = src.height;
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const sx = Math.min(sw - 1, Math.floor((x * sw) / targetW));
      const sy = Math.min(sh - 1, Math.floor((y * sh) / targetH));
      const si = (sw * sy + sx) << 2;
      const di = (targetW * y + x) << 2;
      dst.data[di] = src.data[si];
      dst.data[di + 1] = src.data[si + 1];
      dst.data[di + 2] = src.data[si + 2];
      dst.data[di + 3] = src.data[si + 3];
    }
  }
  return PNG.sync.write(dst);
}

/**
 * Bilinear resize with **premultiplied alpha** (reduces dark/magenta halos when downscaling RGBA sheets).
 *
 * @param {Buffer} pngBuffer
 * @param {number} targetW
 * @param {number} targetH
 * @returns {Buffer}
 */
export function resizePngBufferBilinearPremultiplied(pngBuffer, targetW, targetH) {
  const src = PNG.sync.read(pngBuffer);
  if (src.width === targetW && src.height === targetH) {
    return pngBuffer;
  }
  const sw = src.width;
  const sh = src.height;
  if (sw < 2 || sh < 2) {
    return resizePngBufferNearest(pngBuffer, targetW, targetH);
  }
  const dst = new PNG({ width: targetW, height: targetH, colorType: 6 });
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const samplePm = (xi, yi) => {
    const cx = clamp(xi, 0, sw - 1);
    const cy = clamp(yi, 0, sh - 1);
    const i = (sw * cy + cx) << 2;
    const r = src.data[i];
    const g = src.data[i + 1];
    const b = src.data[i + 2];
    const a = src.data[i + 3];
    const af = a / 255;
    return { pr: r * af, pg: g * af, pb: b * af, pa: a };
  };
  for (let y = 0; y < targetH; y++) {
    for (let x = 0; x < targetW; x++) {
      const sx = ((x + 0.5) * sw) / targetW - 0.5;
      const sy = ((y + 0.5) * sh) / targetH - 0.5;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const fx = sx - x0;
      const fy = sy - y0;
      const c00 = samplePm(x0, y0);
      const c10 = samplePm(x0 + 1, y0);
      const c01 = samplePm(x0, y0 + 1);
      const c11 = samplePm(x0 + 1, y0 + 1);
      const w00 = (1 - fx) * (1 - fy);
      const w10 = fx * (1 - fy);
      const w01 = (1 - fx) * fy;
      const w11 = fx * fy;
      const pmR = w00 * c00.pr + w10 * c10.pr + w01 * c01.pr + w11 * c11.pr;
      const pmG = w00 * c00.pg + w10 * c10.pg + w01 * c01.pg + w11 * c11.pg;
      const pmB = w00 * c00.pb + w10 * c10.pb + w01 * c01.pb + w11 * c11.pb;
      const pmA = w00 * c00.pa + w10 * c10.pa + w01 * c01.pa + w11 * c11.pa;
      const di = (targetW * y + x) << 2;
      const outA = Math.round(Math.min(255, Math.max(0, pmA)));
      if (outA <= 0) {
        dst.data[di] = 0;
        dst.data[di + 1] = 0;
        dst.data[di + 2] = 0;
        dst.data[di + 3] = 0;
        continue;
      }
      const fa = outA / 255;
      dst.data[di] = Math.round(Math.min(255, Math.max(0, pmR / fa)));
      dst.data[di + 1] = Math.round(Math.min(255, Math.max(0, pmG / fa)));
      dst.data[di + 2] = Math.round(Math.min(255, Math.max(0, pmB / fa)));
      dst.data[di + 3] = outA;
    }
  }
  return PNG.sync.write(dst);
}

/**
 * Uniform-scale **`pngBuffer`** to fit inside **`targetW`×`targetH`**, centered on **transparent** padding
 * (no crop — preserves full width of wide strips when T2I aspect is wider than the preset).
 *
 * @param {Buffer} pngBuffer
 * @param {number} targetW
 * @param {number} targetH
 * @param {{ scaleFilter?: 'nearest' | 'bilinear' }} [opts]
 * @returns {Buffer}
 */
export function letterboxPngToSize(pngBuffer, targetW, targetH, opts) {
  const scaleFilter = opts?.scaleFilter ?? "bilinear";
  const resize =
    scaleFilter === "nearest" ? resizePngBufferNearest : resizePngBufferBilinearPremultiplied;

  const src = PNG.sync.read(pngBuffer);
  const sw = src.width;
  const sh = src.height;
  if (sw === targetW && sh === targetH) {
    return pngBuffer;
  }
  const s = Math.min(targetW / sw, targetH / sh);
  const nw = Math.max(1, Math.round(sw * s));
  const nh = Math.max(1, Math.round(sh * s));
  const scaled = resize(pngBuffer, nw, nh);
  const mid = PNG.sync.read(scaled);
  const dst = new PNG({ width: targetW, height: targetH, colorType: 6 });
  dst.data.fill(0);
  const x0 = Math.floor((targetW - nw) / 2);
  const y0 = Math.floor((targetH - nh) / 2);
  for (let y = 0; y < nh; y++) {
    for (let x = 0; x < nw; x++) {
      const si = (nw * y + x) << 2;
      const di = (targetW * (y0 + y) + (x0 + x)) << 2;
      dst.data[di] = mid.data[si];
      dst.data[di + 1] = mid.data[si + 1];
      dst.data[di + 2] = mid.data[si + 2];
      dst.data[di + 3] = mid.data[si + 3];
    }
  }
  return PNG.sync.write(dst);
}

/**
 * Center-crop to **`targetW`/`targetH`** aspect ratio, then uniform resize to exactly **`targetW`×`targetH`**
 * (bilinear or nearest per **`scaleFilter`**). See module comment (epic **2gp-p4js**).
 *
 * **`fit: 'contain'`** — letterbox (no side-crop); use when T2I **`aspect_ratio`** is wider than nominal
 * sheet ratio (e.g. fal **4∶1** vs **8∶3**) so all four strip columns stay fully inside crops.
 *
 * @param {Buffer} pngBuffer
 * @param {number} targetW  Preset sheet width (e.g. **`SHEET_WIDTH`**).
 * @param {number} targetH  Preset sheet height (e.g. **`SHEET_HEIGHT`**).
 * @param {{ scaleFilter?: 'nearest' | 'bilinear'; fit?: 'crop' | 'contain' }} [opts]
 * @returns {Buffer}
 */
export function normalizeDecodedSheetToPreset(pngBuffer, targetW, targetH, opts) {
  const scaleFilter = opts?.scaleFilter ?? "bilinear";
  const fit = opts?.fit ?? "crop";
  const resize =
    scaleFilter === "nearest" ? resizePngBufferNearest : resizePngBufferBilinearPremultiplied;

  const src = PNG.sync.read(pngBuffer);
  const sw = src.width;
  const sh = src.height;
  if (sw === targetW && sh === targetH) {
    return pngBuffer;
  }

  if (fit === "contain") {
    return letterboxPngToSize(pngBuffer, targetW, targetH, { scaleFilter });
  }

  const targetAspect = targetW / targetH;
  const srcAspect = sw / sh;
  const eps = 1e-9;

  let x0 = 0;
  let y0 = 0;
  let cw = sw;
  let ch = sh;

  if (srcAspect > targetAspect + eps) {
    cw = Math.max(1, Math.round(sh * targetAspect));
    ch = sh;
    x0 = Math.floor((sw - cw) / 2);
    y0 = 0;
  } else if (srcAspect < targetAspect - eps) {
    cw = sw;
    ch = Math.max(1, Math.round(sw / targetAspect));
    x0 = 0;
    y0 = Math.floor((sh - ch) / 2);
  }

  const cropped = cw === sw && ch === sh ? pngBuffer : extractPngRegion(src, x0, y0, cw, ch);
  return resize(cropped, targetW, targetH);
}
