/**
 * Deterministic PNG metrics for CI / fal → measure loops (see project-implementation-deep-dive §E.5.1).
 * Pure functions — safe to unit test without network.
 */
import { PNG } from "pngjs";

export interface AlphaStats {
  fullyTransparentPercent: number;
  fullyOpaquePercent: number;
  semiTransparentPercent: number;
  /** count per alpha value 0..255 (deterministic length 256) */
  histogram256: number[];
}

export interface OpaqueBbox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface GridProjection {
  spriteWidth: number;
  spriteHeight: number;
  remainderWidth: number;
  remainderHeight: number;
  divisible: boolean;
  columns: number | null;
  rows: number | null;
  meanVerticalBoundaryEdge: number | null;
  meanHorizontalBoundaryEdge: number | null;
}

export interface PngAnalysisResult {
  dimensions: { width: number; height: number };
  fileSizeBytes: number;
  alpha: AlphaStats;
  opaqueBbox: OpaqueBbox | null;
  grid: GridProjection | null;
}

export function computeAlphaStats(png: PNG): AlphaStats {
  const { width, height, data } = png;
  const total = width * height;
  const histogram256 = Array.from({ length: 256 }, () => 0);
  let transparent = 0;
  let opaque = 0;
  let semi = 0;

  for (let i = 3; i < data.length; i += 4) {
    const a = data[i]!;
    histogram256[a]!++;
    if (a === 0) transparent++;
    else if (a === 255) opaque++;
    else semi++;
  }

  const pct = (n: number) => (total === 0 ? 0 : (100 * n) / total);

  return {
    fullyTransparentPercent: pct(transparent),
    fullyOpaquePercent: pct(opaque),
    semiTransparentPercent: pct(semi),
    histogram256,
  };
}

/** Axis-aligned bounding box of pixels with alpha > 0. */
export function computeOpaqueBbox(png: PNG): OpaqueBbox | null {
  const { width, height, data } = png;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const a = data[(y * width + x) * 4 + 3]!;
      if (a > 0) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

function luma(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Mean absolute luma difference across straddling pairs along a vertical line at x (left x-1 vs x). */
function verticalBoundaryEdgeEnergy(png: PNG, x: number): number {
  const { width, height, data } = png;
  if (x <= 0 || x >= width) return 0;
  let sum = 0;
  const n = height;
  for (let y = 0; y < height; y++) {
    const i0 = (y * width + (x - 1)) * 4;
    const i1 = (y * width + x) * 4;
    const l0 = luma(data[i0]!, data[i0 + 1]!, data[i0 + 2]!);
    const l1 = luma(data[i1]!, data[i1 + 1]!, data[i1 + 2]!);
    sum += Math.abs(l1 - l0);
  }
  return n === 0 ? 0 : sum / n;
}

function horizontalBoundaryEdgeEnergy(png: PNG, y: number): number {
  const { width, height, data } = png;
  if (y <= 0 || y >= height) return 0;
  let sum = 0;
  const n = width;
  for (let x = 0; x < width; x++) {
    const i0 = ((y - 1) * width + x) * 4;
    const i1 = (y * width + x) * 4;
    const l0 = luma(data[i0]!, data[i0 + 1]!, data[i0 + 2]!);
    const l1 = luma(data[i1]!, data[i1 + 1]!, data[i1 + 2]!);
    sum += Math.abs(l1 - l0);
  }
  return n === 0 ? 0 : sum / n;
}

/**
 * Grid projection vs expected cell size: divisibility remainders and mean edge energy on internal grid lines.
 */
export function computeGridProjection(png: PNG, spriteWidth: number, spriteHeight: number): GridProjection | null {
  if (!Number.isFinite(spriteWidth) || !Number.isFinite(spriteHeight) || spriteWidth <= 0 || spriteHeight <= 0) {
    return null;
  }

  const { width, height } = png;
  const remainderWidth = width % spriteWidth;
  const remainderHeight = height % spriteHeight;
  const divisible = remainderWidth === 0 && remainderHeight === 0;
  const columns = divisible ? width / spriteWidth : null;
  const rows = divisible ? height / spriteHeight : null;

  let meanVerticalBoundaryEdge: number | null = null;
  let meanHorizontalBoundaryEdge: number | null = null;

  if (divisible && columns !== null && rows !== null && columns >= 2) {
    let vSum = 0;
    let vCount = 0;
    for (let k = 1; k < columns; k++) {
      const x = k * spriteWidth;
      vSum += verticalBoundaryEdgeEnergy(png, x);
      vCount++;
    }
    meanVerticalBoundaryEdge = vCount === 0 ? null : vSum / vCount;
  }

  if (divisible && rows !== null && rows >= 2) {
    let hSum = 0;
    let hCount = 0;
    for (let k = 1; k < rows; k++) {
      const y = k * spriteHeight;
      hSum += horizontalBoundaryEdgeEnergy(png, y);
      hCount++;
    }
    meanHorizontalBoundaryEdge = hCount === 0 ? null : hSum / hCount;
  }

  return {
    spriteWidth,
    spriteHeight,
    remainderWidth,
    remainderHeight,
    divisible,
    columns,
    rows,
    meanVerticalBoundaryEdge,
    meanHorizontalBoundaryEdge,
  };
}

export function analyzePngBuffer(
  buffer: Buffer,
  grid: { spriteWidth?: number; spriteHeight?: number } = {},
): PngAnalysisResult {
  const png = PNG.sync.read(buffer);
  const alpha = computeAlphaStats(png);
  const opaqueBbox = computeOpaqueBbox(png);

  let gridProjection: GridProjection | null = null;
  const sw = grid.spriteWidth;
  const sh = grid.spriteHeight;
  if (sw !== undefined && sh !== undefined) {
    gridProjection = computeGridProjection(png, sw, sh);
  }

  return {
    dimensions: { width: png.width, height: png.height },
    fileSizeBytes: buffer.length,
    alpha,
    opaqueBbox,
    grid: gridProjection,
  };
}
