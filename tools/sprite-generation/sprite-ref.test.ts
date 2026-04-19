import { readFile } from 'node:fs/promises';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { describe, expect, it } from 'vitest';

import {
  parseFrameKeyRectManifestJson,
  parseGridFrameKeysManifestJson,
} from '../../src/art/atlasTypes.ts';
import {
  buildSpriteRefPayload,
  DEFAULT_TILE_PNG_BASENAME,
  writeSpriteRef,
  type SpriteGenPresetGrid,
  type SpriteGenPresetTiles,
} from "./sprite-ref.ts";

/** D-pad preset: **individual tiles** — **`FrameKeyRectManifestJson`** + **`images`** paths. */
function dpadTilePreset(): SpriteGenPresetTiles {
  return {
    id: 'dpad',
    tileSize: 256,
    frames: [
      { id: 'up', outSubdir: 'up', promptVariant: '' },
      { id: 'down', outSubdir: 'down', promptVariant: '' },
      { id: 'left', outSubdir: 'left', promptVariant: '' },
      { id: 'right', outSubdir: 'right', promptVariant: '' },
    ],
    spriteRef: {
      kind: "frameKeyRect",
      jsonRelativePath: "sprite-ref.json",
      artUrlPrefix: "art/dpad",
      pngFilename: "dpad.png",
    },
  };
}

/** Sheet strategy: **grid + frame keys** — **`AtlasGridWithFrameKeysManifestJson`**. */
function dpadGridPreset(): SpriteGenPresetGrid {
  return {
    id: 'dpad',
    tileSize: 256,
    frames: [
      { id: 'up', outSubdir: 'up', promptVariant: '' },
      { id: 'right', outSubdir: 'right', promptVariant: '' },
      { id: 'left', outSubdir: 'left', promptVariant: '' },
      { id: 'down', outSubdir: 'down', promptVariant: '' },
    ],
    sheet: {
      rows: 2,
      columns: 2,
      spriteWidth: 256,
      spriteHeight: 256,
    },
    frameSheetCells: {
      up: { column: 0, row: 0 },
      down: { column: 1, row: 0 },
      left: { column: 0, row: 1 },
      right: { column: 1, row: 1 },
    },
    spriteRef: {
      kind: "gridFrameKeys",
      jsonRelativePath: "sprite-ref.json",
      sheetImageRelativePath: "art/dpad/sheet.png",
    },
  };
}

describe('sprite-ref', () => {
  it('frameKeyRect without pngFilename uses DEFAULT_TILE_PNG_BASENAME in image paths', () => {
    const preset: SpriteGenPresetTiles = {
      id: "generic",
      tileSize: 64,
      frames: [{ id: "a", outSubdir: "a", promptVariant: "" }],
      spriteRef: {
        kind: "frameKeyRect",
        artUrlPrefix: "art/foo",
      },
    };
    const raw = buildSpriteRefPayload(preset);
    const images = raw["images"] as Record<string, string>;
    expect(images["a"]).toBe(`art/foo/a/${DEFAULT_TILE_PNG_BASENAME}`);
  });

  it('dpad tile preset: JSON validates with parseFrameKeyRectManifestJson; paths match public/ layout', () => {
    const preset = dpadTilePreset();
    const raw = buildSpriteRefPayload(preset);
    const manifest = parseFrameKeyRectManifestJson(raw);

    expect(manifest.frames['up']).toEqual({ x: 0, y: 0, width: 256, height: 256 });
    expect(manifest.frames['down']).toEqual({ x: 0, y: 0, width: 256, height: 256 });

    expect(raw['images']).toEqual({
      up: 'art/dpad/up/dpad.png',
      down: 'art/dpad/down/dpad.png',
      left: 'art/dpad/left/dpad.png',
      right: 'art/dpad/right/dpad.png',
    });
  });

  it('dpad grid preset: JSON validates with parseGridFrameKeysManifestJson', () => {
    const preset = dpadGridPreset();
    const raw = buildSpriteRefPayload(preset);
    const manifest = parseGridFrameKeysManifestJson(raw);

    expect(manifest.grid).toEqual({
      rows: 2,
      columns: 2,
      spriteWidth: 256,
      spriteHeight: 256,
    });
    expect(manifest.frames['up']).toEqual({ column: 0, row: 0 });
    expect(manifest.frames['down']).toEqual({ column: 1, row: 0 });
    expect(raw['image']).toBe('art/dpad/sheet.png');
  });

  it('writeSpriteRef writes parseable JSON under outBase', async () => {
    const dir = join(tmpdir(), `sprite-ref-test-${process.pid}-${Date.now()}`);
    await mkdir(dir, { recursive: true });
    try {
      const preset = dpadTilePreset();
      const path = await writeSpriteRef(preset, dir);
      const text = await readFile(path, 'utf8');
      const parsed = JSON.parse(text);
      parseFrameKeyRectManifestJson(parsed);
      expect(parsed['images']['left']).toBe('art/dpad/left/dpad.png');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
