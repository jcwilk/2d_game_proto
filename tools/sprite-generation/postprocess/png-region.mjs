import { PNG } from "pngjs";

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
