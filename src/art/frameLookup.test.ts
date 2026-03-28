/**
 * jsdom provides `document` for fixture-backed {@link HTMLImageElement} wiring.
 * @vitest-environment jsdom
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';
import { ImageSource } from 'excalibur';
import { PNG } from 'pngjs';

import {
  parseFrameKeyIndexManifestJson,
  parseFrameKeyRectManifestJson,
  parseGridFrameKeysManifestJson,
  parsePackedAtlasOrderedJson,
} from './atlasTypes';
import gridWithKeysFixture from './fixtures/sample-grid-frame-keys.json';
import indexFixture from './fixtures/sample-frame-key-index.json';
import {
  createGridFrameCoordsLookup,
  createPackedIndexFrameLookup,
  createRectFrameLookup,
} from './frameLookup';
import { spriteSheetFromGridImageSource } from './gridSpriteSheet';
import { spriteSheetFromPackedImageSource } from './packedSpriteSheet';

const __dirname = dirname(fileURLToPath(import.meta.url));

function pngDataUrlFromGridFixture(): string {
  const pngPath = join(__dirname, 'fixtures', 'sample-grid-atlas.png');
  const b64 = readFileSync(pngPath).toString('base64');
  return `data:image/png;base64,${b64}`;
}

describe('frameLookup', () => {
  it('grid manifest: key maps to sprite via stable column/row', () => {
    const manifest = parseGridFrameKeysManifestJson(gridWithKeysFixture);
    const lookup = createGridFrameCoordsLookup(manifest);

    expect(lookup.getColumnRow('tl')).toEqual({ column: 0, row: 0 });
    expect(lookup.getColumnRow('br')).toEqual({ column: 1, row: 1 });
    expect(lookup.hasKey('missing')).toBe(false);

    const pngPath = join(__dirname, 'fixtures', 'sample-grid-atlas.png');
    const png = PNG.sync.read(readFileSync(pngPath));
    const img = document.createElement('img');
    img.src = pngDataUrlFromGridFixture();
    Object.defineProperty(img, 'naturalWidth', { value: png.width, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: png.height, configurable: true });
    Object.defineProperty(img, 'width', { value: png.width, configurable: true });
    Object.defineProperty(img, 'height', { value: png.height, configurable: true });

    const imageSource = ImageSource.fromHtmlImageElement(img);
    const sheet = spriteSheetFromGridImageSource(imageSource, manifest);

    const tl = lookup.getSprite(sheet, 'tl');
    const br = lookup.getSprite(sheet, 'br');
    expect(tl.width).toBe(32);
    expect(tl.height).toBe(32);
    expect(br.width).toBe(32);
    expect(br.height).toBe(32);
    expect(tl.sourceView.x).toBe(0);
    expect(tl.sourceView.y).toBe(0);
    expect(br.sourceView.x).toBe(32);
    expect(br.sourceView.y).toBe(32);
  });

  it('packed index manifest: key maps to sprite index in ordered sheet', () => {
    const indexManifest = parseFrameKeyIndexManifestJson(indexFixture);
    const lookup = createPackedIndexFrameLookup(indexManifest);

    const packed = parsePackedAtlasOrderedJson({
      sourceViews: [
        { x: 0, y: 0, width: 16, height: 16 },
        { x: 16, y: 0, width: 16, height: 16 },
      ],
    });

    const pngPath = join(__dirname, 'fixtures', 'sample-grid-atlas.png');
    const png = PNG.sync.read(readFileSync(pngPath));
    const img = document.createElement('img');
    img.src = pngDataUrlFromGridFixture();
    Object.defineProperty(img, 'naturalWidth', { value: png.width, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: png.height, configurable: true });
    Object.defineProperty(img, 'width', { value: png.width, configurable: true });
    Object.defineProperty(img, 'height', { value: png.height, configurable: true });

    const imageSource = ImageSource.fromHtmlImageElement(img);
    const sheet = spriteSheetFromPackedImageSource(imageSource, packed);

    const a = lookup.getSprite(sheet, 'first');
    const b = lookup.getSprite(sheet, 'second');
    expect(a.sourceView.x).toBe(0);
    expect(b.sourceView.x).toBe(16);
  });

  it('rect manifest: key maps to pixel rect (packed / named-frame path)', () => {
    const rectJson = {
      frames: {
        patch: { x: 10, y: 20, width: 8, height: 8 },
      },
    };
    const manifest = parseFrameKeyRectManifestJson(rectJson);
    const lookup = createRectFrameLookup(manifest);

    expect(lookup.getRect('patch')).toEqual({ x: 10, y: 20, width: 8, height: 8 });
    expect(lookup.hasKey('patch')).toBe(true);
  });
});
