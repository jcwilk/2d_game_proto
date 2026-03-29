import { PNG } from "pngjs";

/**
 * ## D-pad / fal sheet decode policy (epic **2gp-p4js**)
 *
 * Some fal image models may return a **square** PNG (e.g. 512²) when the request asks for a **4∶1**
 * strip (`400×100`). We
 * **do not** anisotropically nearest-neighbor squash that square onto the strip (different X vs Y scale
 * distorts glyphs). Instead we **center-crop** the decoded raster to the preset’s aspect ratio
 * (**`SHEET_WIDTH`∶`SHEET_HEIGHT`**, e.g. 4∶1), then apply **one** uniform nearest-neighbor resize to the
 * exact preset pixel size (same scale factor on both axes — pixel-art friendly). Rejected for this path:
 * relying on fal always honoring non-square `image_size`; changing strip dimensions without updating the
 * preset; using anisotropic NN as the sole fix from square output.
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
 * Center-crop to **`targetW`/`targetH`** aspect ratio, then uniform nearest-neighbor resize to exactly
 * **`targetW`×`targetH`**. See module comment (epic **2gp-p4js**).
 *
 * @param {Buffer} pngBuffer
 * @param {number} targetW  Preset sheet width (e.g. **`SHEET_WIDTH`**).
 * @param {number} targetH  Preset sheet height (e.g. **`SHEET_HEIGHT`**).
 * @returns {Buffer}
 */
export function normalizeDecodedSheetToPreset(pngBuffer, targetW, targetH) {
  const src = PNG.sync.read(pngBuffer);
  const sw = src.width;
  const sh = src.height;
  if (sw === targetW && sh === targetH) {
    return pngBuffer;
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
  return resizePngBufferNearest(cropped, targetW, targetH);
}
