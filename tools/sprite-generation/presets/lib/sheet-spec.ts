/**
 * Pure builders for **horizontal strip** sprite sheets (one row, left-to-right).
 * Mock compositor cell layout stays {@link sheetLayoutFromCropsRect} in `sheet-layout.ts`.
 */

import { sheetLayoutFromCropsRect, type CropRecord } from "../../sheet-layout.ts";

/** Pixel crop origins per frame id (top-left of each cell in the sheet raster). */
export type SheetCropMap = Readonly<Record<string, { x: number; y: number }>>;

/** Logical frame → sprite-ref grid cell (**column**, **row**), row-major order. */
export type FrameSheetCellMap = Readonly<Record<string, { column: number; row: number }>>;

function assertPositiveInt(name: string, n: number): void {
  if (!Number.isFinite(n) || n <= 0 || Math.floor(n) !== n) {
    throw new Error(`${name}: expected positive integer, got ${n}`);
  }
}

function assertDistinctFrameIds(frameIds: readonly string[]): void {
  const seen = new Set<string>();
  for (const id of frameIds) {
    if (seen.has(id)) {
      throw new Error(`horizontalStripCrops: duplicate frame id "${id}"`);
    }
    seen.add(id);
  }
}

/**
 * Top-left crop origins for a **1×N** horizontal strip: frame `i` at `(i * cellWidth, 0)`.
 * `cellHeight` is accepted for API symmetry with {@link sheetDimensionsFromStrip}; strip layout uses `y = 0` only.
 */
export function horizontalStripCrops(
  frameIds: readonly string[],
  cellWidth: number,
  cellHeight: number,
): SheetCropMap {
  assertPositiveInt("horizontalStripCrops(cellWidth)", cellWidth);
  assertPositiveInt("horizontalStripCrops(cellHeight)", cellHeight);
  if (frameIds.length === 0) {
    throw new Error("horizontalStripCrops: frameIds must be non-empty");
  }
  assertDistinctFrameIds(frameIds);
  const out: Record<string, { x: number; y: number }> = {};
  for (let i = 0; i < frameIds.length; i++) {
    const id = frameIds[i]!;
    out[id] = { x: i * cellWidth, y: 0 };
  }
  return Object.freeze(out);
}

/**
 * Row-major grid cells for `frameIds` in order: index `i` → column `i % numColumns`, row `⌊i / numColumns⌋`.
 * For a single horizontal row, set `numColumns === frameIds.length` so all cells sit on row 0.
 */
export function frameSheetCellsRowMajor(
  frameIds: readonly string[],
  numColumns: number,
): FrameSheetCellMap {
  assertPositiveInt("frameSheetCellsRowMajor(numColumns)", numColumns);
  if (frameIds.length === 0) {
    throw new Error("frameSheetCellsRowMajor: frameIds must be non-empty");
  }
  assertDistinctFrameIds(frameIds);
  const out: Record<string, { column: number; row: number }> = {};
  for (let i = 0; i < frameIds.length; i++) {
    const id = frameIds[i]!;
    out[id] = { column: i % numColumns, row: Math.floor(i / numColumns) };
  }
  return Object.freeze(out);
}

/** Pixel size of a **1×frameCount** horizontal strip (one row). */
export function sheetDimensionsFromStrip(
  frameCount: number,
  cellWidth: number,
  cellHeight: number,
): { sheetWidth: number; sheetHeight: number } {
  assertPositiveInt("sheetDimensionsFromStrip(frameCount)", frameCount);
  assertPositiveInt("sheetDimensionsFromStrip(cellWidth)", cellWidth);
  assertPositiveInt("sheetDimensionsFromStrip(cellHeight)", cellHeight);
  return {
    sheetWidth: frameCount * cellWidth,
    sheetHeight: cellHeight,
  };
}

/**
 * Ensures every `frameIds[i]` has entries in `crops` and `cells` (exact key coverage for listed frames).
 */
export function validateFrameCropCellCoverage(
  frameIds: readonly string[],
  crops: CropRecord | SheetCropMap,
  cells: FrameSheetCellMap,
): void {
  for (const id of frameIds) {
    if (!(id in crops)) {
      throw new Error(`validateFrameCropCellCoverage: missing crop for frame id "${id}"`);
    }
    if (!(id in cells)) {
      throw new Error(`validateFrameCropCellCoverage: missing cell for frame id "${id}"`);
    }
  }
}

/**
 * Mock sheet layout in **tile cells** — same as `sheetLayoutFromCropsRect(crops, cellWidth, cellHeight)`.
 */
export function sheetLayoutFromStripCrops(
  crops: CropRecord | SheetCropMap,
  cellWidth: number,
  cellHeight: number,
): Readonly<Record<string, { x: number; y: number }>> {
  return sheetLayoutFromCropsRect(crops, cellWidth, cellHeight);
}
