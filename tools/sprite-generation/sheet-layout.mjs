/**
 * Mock sheet compositor uses **cell coordinates** (tile units); presets store **pixel** crop
 * origins. Normalize: cell = (crop.x / tileSize, crop.y / tileSize) when origins align to the grid.
 */

/**
 * @param {Readonly<Record<string, { x: number; y: number }>>} crops  Top-left pixel origins per frame id
 * @param {number} tileSize  Square tile edge (px)
 * @returns {Record<string, { x: number; y: number }>}  Cell placement per frame (same mapping as blitting tiles at crop origins)
 */
export function sheetLayoutFromCrops(crops, tileSize) {
  const out = {};
  for (const [id, { x, y }] of Object.entries(crops)) {
    if (x % tileSize !== 0 || y % tileSize !== 0) {
      throw new Error(
        `sheetLayoutFromCrops: crop "${id}" origin (${x},${y}) not aligned to ${tileSize}px tile grid`
      );
    }
    out[id] = { x: x / tileSize, y: y / tileSize };
  }
  return out;
}

/**
 * Same as {@link sheetLayoutFromCrops} for **rectangular** sheet cells (`cellWidth`×`cellHeight`).
 *
 * @param {Readonly<Record<string, { x: number; y: number }>>} crops
 * @param {number} cellWidth
 * @param {number} cellHeight
 */
export function sheetLayoutFromCropsRect(crops, cellWidth, cellHeight) {
  const out = {};
  for (const [id, { x, y }] of Object.entries(crops)) {
    if (x % cellWidth !== 0 || y % cellHeight !== 0) {
      throw new Error(
        `sheetLayoutFromCropsRect: crop "${id}" origin (${x},${y}) not aligned to ${cellWidth}×${cellHeight}px cell grid`,
      );
    }
    out[id] = { x: x / cellWidth, y: y / cellHeight };
  }
  return out;
}
