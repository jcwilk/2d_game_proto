import type { SourceView } from 'excalibur';

/**
 * Prefix for all thrown parse errors from this module (throwing is the single
 * validation style for atlas JSON here; keep consistent with callers/tests).
 */
export const ATLAS_JSON_ERROR_PREFIX = 'Atlas JSON:';

function err(detail: string): Error {
  return new Error(`${ATLAS_JSON_ERROR_PREFIX} ${detail}`);
}

/**
 * One frame rectangle in atlas image space: **pixels**, **top-left** origin.
 * Matches Excalibur {@link SourceView} for `SpriteSheet.fromImageSourceWithSourceViews`.
 */
export interface AtlasFrameRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Grid definition matching {@link SpriteSheetGridOptions} `grid` (image is supplied at runtime).
 */
export interface AtlasGridDefinition {
  rows: number;
  columns: number;
  spriteWidth: number;
  spriteHeight: number;
}

/**
 * Optional spacing matching {@link SpriteSheetGridOptions} `spacing`.
 */
export interface AtlasSheetSpacingJson {
  originOffset?: { x?: number; y?: number };
  margin?: { x?: number; y?: number };
}

/**
 * Hand-authored grid metadata JSON (no embedded image).
 */
export interface AtlasGridManifestJson {
  grid: AtlasGridDefinition;
  spacing?: AtlasSheetSpacingJson;
}

/**
 * One cell in a uniform grid: **column** (x) then **row** (y), matching
 * {@link SpriteSheet.getSprite}.
 */
export interface AtlasGridFrameCellJson {
  column: number;
  row: number;
}

/**
 * Grid atlas manifest plus **logical frame keys** → grid cell (plan §C.4 stable map).
 */
export interface AtlasGridWithFrameKeysManifestJson extends AtlasGridManifestJson {
  frames: Record<string, AtlasGridFrameCellJson>;
}

/**
 * Packed atlas: ordered rects; index matches `SpriteSheet.fromImageSourceWithSourceViews` order.
 */
export interface PackedAtlasOrderedJson {
  sourceViews: AtlasFrameRect[];
}

/**
 * Packed atlas: logical frame name → rect (export-tool style).
 */
export interface PackedAtlasNamedFramesJson {
  frames: Record<string, AtlasFrameRect>;
}

/**
 * Stable map: logical frame key → sprite index in ordered `sourceViews` (see plan C.4 name vs index).
 */
export interface FrameKeyIndexManifestJson {
  frames: Record<string, number>;
}

/**
 * Stable map: logical frame key → pixel rect.
 */
export interface FrameKeyRectManifestJson {
  frames: Record<string, AtlasFrameRect>;
}

function parseIntegerPixel(value: unknown, path: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw err(`${path} must be a finite number`);
  }
  if (!Number.isInteger(value)) {
    throw err(`${path} must be an integer (pixel)`);
  }
  return value;
}

function parseNonNegativeInteger(value: unknown, path: string): number {
  const n = parseIntegerPixel(value, path);
  if (n < 0) {
    throw err(`${path} must be >= 0`);
  }
  return n;
}

function parsePositiveInteger(value: unknown, path: string): number {
  const n = parseIntegerPixel(value, path);
  if (n < 1) {
    throw err(`${path} must be >= 1`);
  }
  return n;
}

/**
 * Validates an unknown value as {@link AtlasFrameRect}.
 */
export function parseAtlasFrameRect(value: unknown, path: string): AtlasFrameRect {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw err(`${path} must be a non-null object`);
  }
  const o = value as Record<string, unknown>;
  const x = parseNonNegativeInteger(o['x'], `${path}.x`);
  const y = parseNonNegativeInteger(o['y'], `${path}.y`);
  const width = parsePositiveInteger(o['width'], `${path}.width`);
  const height = parsePositiveInteger(o['height'], `${path}.height`);
  return { x, y, width, height };
}

/**
 * Validates optional spacing object for grid manifests.
 */
export function parseAtlasSheetSpacingJson(
  value: unknown,
  path: string,
): AtlasSheetSpacingJson | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw err(`${path} must be an object or omitted`);
  }
  const o = value as Record<string, unknown>;
  const spacing: AtlasSheetSpacingJson = {};
  if (o['originOffset'] !== undefined) {
    if (typeof o['originOffset'] !== 'object' || o['originOffset'] === null || Array.isArray(o['originOffset'])) {
      throw err(`${path}.originOffset must be an object`);
    }
    const oo = o['originOffset'] as Record<string, unknown>;
    spacing.originOffset = {};
    if (oo['x'] !== undefined) {
      spacing.originOffset.x = parseNonNegativeInteger(oo['x'], `${path}.originOffset.x`);
    }
    if (oo['y'] !== undefined) {
      spacing.originOffset.y = parseNonNegativeInteger(oo['y'], `${path}.originOffset.y`);
    }
  }
  if (o['margin'] !== undefined) {
    if (typeof o['margin'] !== 'object' || o['margin'] === null || Array.isArray(o['margin'])) {
      throw err(`${path}.margin must be an object`);
    }
    const m = o['margin'] as Record<string, unknown>;
    spacing.margin = {};
    if (m['x'] !== undefined) {
      spacing.margin.x = parseNonNegativeInteger(m['x'], `${path}.margin.x`);
    }
    if (m['y'] !== undefined) {
      spacing.margin.y = parseNonNegativeInteger(m['y'], `${path}.margin.y`);
    }
  }
  return spacing;
}

/**
 * Validates grid metadata for `SpriteSheet.fromImageSource` (without `image`).
 */
export function parseAtlasGridManifestJson(json: unknown): AtlasGridManifestJson {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw err('root must be a non-null object');
  }
  const root = json as Record<string, unknown>;
  if (root['grid'] === undefined || root['grid'] === null || typeof root['grid'] !== 'object' || Array.isArray(root['grid'])) {
    throw err('grid must be a non-null object');
  }
  const g = root['grid'] as Record<string, unknown>;
  const grid: AtlasGridDefinition = {
    rows: parsePositiveInteger(g['rows'], 'grid.rows'),
    columns: parsePositiveInteger(g['columns'], 'grid.columns'),
    spriteWidth: parsePositiveInteger(g['spriteWidth'], 'grid.spriteWidth'),
    spriteHeight: parsePositiveInteger(g['spriteHeight'], 'grid.spriteHeight'),
  };
  const spacing = parseAtlasSheetSpacingJson(root['spacing'], 'spacing');
  return spacing !== undefined ? { grid, spacing } : { grid };
}

function parseAtlasGridFrameCellJson(value: unknown, path: string): AtlasGridFrameCellJson {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw err(`${path} must be a non-null object`);
  }
  const o = value as Record<string, unknown>;
  return {
    column: parseNonNegativeInteger(o['column'], `${path}.column`),
    row: parseNonNegativeInteger(o['row'], `${path}.row`),
  };
}

/**
 * Validates grid metadata plus logical key → `(column, row)` map for {@link SpriteSheet.getSprite}.
 */
export function parseGridFrameKeysManifestJson(json: unknown): AtlasGridWithFrameKeysManifestJson {
  const base = parseAtlasGridManifestJson(json);
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw err('root must be a non-null object');
  }
  const root = json as Record<string, unknown>;
  if (root['frames'] === null || typeof root['frames'] !== 'object' || Array.isArray(root['frames'])) {
    throw err('frames must be a non-null object');
  }
  const framesIn = root['frames'] as Record<string, unknown>;
  const frames: Record<string, AtlasGridFrameCellJson> = {};
  const { columns, rows } = base.grid;
  for (const key of Object.keys(framesIn)) {
    const cell = parseAtlasGridFrameCellJson(framesIn[key], `frames[${JSON.stringify(key)}]`);
    if (cell.column >= columns) {
      throw err(`frames[${JSON.stringify(key)}].column must be < grid.columns (${columns})`);
    }
    if (cell.row >= rows) {
      throw err(`frames[${JSON.stringify(key)}].row must be < grid.rows (${rows})`);
    }
    frames[key] = cell;
  }
  if (Object.keys(frames).length < 1) {
    throw err('frames must contain at least one entry');
  }
  const spacing = base.spacing;
  return spacing !== undefined ? { ...base, frames } : { grid: base.grid, frames };
}

/**
 * Validates ordered packed atlas JSON (`sourceViews` array).
 */
export function parsePackedAtlasOrderedJson(json: unknown): PackedAtlasOrderedJson {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw err('root must be a non-null object');
  }
  const root = json as Record<string, unknown>;
  if (!Array.isArray(root['sourceViews'])) {
    throw err('sourceViews must be an array');
  }
  const sourceViews = root['sourceViews'].map((item, i) =>
    parseAtlasFrameRect(item, `sourceViews[${i}]`),
  );
  return { sourceViews };
}

/**
 * Validates named-frame packed atlas JSON (`frames` record).
 */
export function parsePackedAtlasNamedFramesJson(json: unknown): PackedAtlasNamedFramesJson {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw err('root must be a non-null object');
  }
  const root = json as Record<string, unknown>;
  if (root['frames'] === null || typeof root['frames'] !== 'object' || Array.isArray(root['frames'])) {
    throw err('frames must be a non-null object');
  }
  const framesIn = root['frames'] as Record<string, unknown>;
  const frames: Record<string, AtlasFrameRect> = {};
  for (const key of Object.keys(framesIn)) {
    frames[key] = parseAtlasFrameRect(framesIn[key], `frames[${JSON.stringify(key)}]`);
  }
  return { frames };
}

/**
 * Validates frame-key → index manifest (for ordered packed sheets).
 */
export function parseFrameKeyIndexManifestJson(json: unknown): FrameKeyIndexManifestJson {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw err('root must be a non-null object');
  }
  const root = json as Record<string, unknown>;
  if (root['frames'] === null || typeof root['frames'] !== 'object' || Array.isArray(root['frames'])) {
    throw err('frames must be a non-null object');
  }
  const framesIn = root['frames'] as Record<string, unknown>;
  const frames: Record<string, number> = {};
  for (const key of Object.keys(framesIn)) {
    frames[key] = parseNonNegativeInteger(framesIn[key], `frames[${JSON.stringify(key)}]`);
  }
  return { frames };
}

/**
 * Validates frame-key → rect manifest.
 */
export function parseFrameKeyRectManifestJson(json: unknown): FrameKeyRectManifestJson {
  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    throw err('root must be a non-null object');
  }
  const root = json as Record<string, unknown>;
  if (root['frames'] === null || typeof root['frames'] !== 'object' || Array.isArray(root['frames'])) {
    throw err('frames must be a non-null object');
  }
  const framesIn = root['frames'] as Record<string, unknown>;
  const frames: Record<string, AtlasFrameRect> = {};
  for (const key of Object.keys(framesIn)) {
    frames[key] = parseAtlasFrameRect(framesIn[key], `frames[${JSON.stringify(key)}]`);
  }
  return { frames };
}

/** Structural copy to Excalibur {@link SourceView} (same pixel rect). */
export function atlasFrameRectToSourceView(rect: AtlasFrameRect): SourceView {
  return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
}
