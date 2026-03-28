import type { Sprite, SpriteSheet } from 'excalibur';

import type {
  AtlasFrameRect,
  AtlasGridWithFrameKeysManifestJson,
  FrameKeyIndexManifestJson,
  FrameKeyRectManifestJson,
} from './atlasTypes';

/** Logical key → grid `(column, row)` for {@link SpriteSheet.getSprite}. */
export interface GridFrameCoordsLookup {
  readonly gridColumns: number;
  readonly gridRows: number;
  hasKey(key: string): boolean;
  getColumnRow(key: string): { column: number; row: number };
  getSprite(sheet: SpriteSheet, key: string): Sprite;
}

/** Logical key → linear index into ordered packed `sourceViews` / {@link SpriteSheet} row 0. */
export interface PackedIndexFrameLookup {
  hasKey(key: string): boolean;
  getIndex(key: string): number;
  getSprite(sheet: SpriteSheet, key: string): Sprite;
}

/** Logical key → pixel rect (packed named frames or custom tooling). */
export interface RectFrameLookup {
  hasKey(key: string): boolean;
  getRect(key: string): AtlasFrameRect;
}

/**
 * Build a stable key → `(column, row)` map for uniform grid atlases (see plan §C.4).
 */
export function createGridFrameCoordsLookup(
  manifest: AtlasGridWithFrameKeysManifestJson,
): GridFrameCoordsLookup {
  const { columns, rows } = manifest.grid;
  const frames = manifest.frames;

  function getColumnRow(key: string): { column: number; row: number } {
    const cell = frames[key];
    if (cell === undefined) {
      throw new Error(`FrameLookup: unknown key ${JSON.stringify(key)}`);
    }
    return { column: cell.column, row: cell.row };
  }

  return {
    gridColumns: columns,
    gridRows: rows,
    hasKey(key: string): boolean {
      return Object.hasOwn(frames, key);
    },
    getColumnRow,
    getSprite(sheet: SpriteSheet, key: string): Sprite {
      const { column, row } = getColumnRow(key);
      return sheet.getSprite(column, row);
    },
  };
}

/**
 * Build a stable key → index map for packed atlases whose {@link SpriteSheet} is laid out as one row
 * (`fromImageSourceWithSourceViews`), matching plan §C.4 ordered `sourceViews`.
 */
export function createPackedIndexFrameLookup(manifest: FrameKeyIndexManifestJson): PackedIndexFrameLookup {
  const { frames } = manifest;

  function getIndex(key: string): number {
    const i = frames[key];
    if (i === undefined) {
      throw new Error(`FrameLookup: unknown key ${JSON.stringify(key)}`);
    }
    return i;
  }

  return {
    hasKey(key: string): boolean {
      return Object.hasOwn(frames, key);
    },
    getIndex,
    getSprite(sheet: SpriteSheet, key: string): Sprite {
      const x = getIndex(key);
      return sheet.getSprite(x, 0);
    },
  };
}

/**
 * Rect-only lookup for packed manifests that already store pixel rects per key (e.g. TexturePacker-style
 * `frames`); use with {@link atlasFrameRectToSourceView} + `Sprite` or future loaders.
 */
export function createRectFrameLookup(manifest: FrameKeyRectManifestJson): RectFrameLookup {
  const { frames } = manifest;

  function getRect(key: string): AtlasFrameRect {
    const r = frames[key];
    if (r === undefined) {
      throw new Error(`FrameLookup: unknown key ${JSON.stringify(key)}`);
    }
    return r;
  }

  return {
    hasKey(key: string): boolean {
      return Object.hasOwn(frames, key);
    },
    getRect,
  };
}
