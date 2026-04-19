/**
 * Mock sheet compositor uses **cell coordinates** (tile units); presets store **pixel** crop
 * origins. Normalize: cell = (crop.x / tileSize, crop.y / tileSize) when origins align to the grid.
 */

export type CropRecord = Readonly<Record<string, { x: number; y: number }>>;

/**
 * @param crops Top-left pixel origins per frame id
 * @param tileSize Square tile edge (px)
 * @returns Cell placement per frame (same mapping as blitting tiles at crop origins)
 */
export function sheetLayoutFromCrops(crops: CropRecord, tileSize: number): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
  for (const [id, { x, y }] of Object.entries(crops)) {
    if (x % tileSize !== 0 || y % tileSize !== 0) {
      throw new Error(`sheetLayoutFromCrops: crop "${id}" origin (${x},${y}) not aligned to ${tileSize}px tile grid`);
    }
    out[id] = { x: x / tileSize, y: y / tileSize };
  }
  return out;
}

/**
 * Same as {@link sheetLayoutFromCrops} for **rectangular** sheet cells (`cellWidth`×`cellHeight`).
 */
export function sheetLayoutFromCropsRect(
  crops: CropRecord,
  cellWidth: number,
  cellHeight: number,
): Record<string, { x: number; y: number }> {
  const out: Record<string, { x: number; y: number }> = {};
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
