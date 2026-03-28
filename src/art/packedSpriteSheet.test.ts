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

import packedFixture from './fixtures/sample-packed-atlas.json';
import { spriteSheetFromPackedImageSource } from './packedSpriteSheet';
import { parsePackedAtlasOrderedJson } from './atlasTypes';

const __dirname = dirname(fileURLToPath(import.meta.url));

function pngDataUrlFromFixture(): string {
  const pngPath = join(__dirname, 'fixtures', 'sample-packed-atlas.png');
  const b64 = readFileSync(pngPath).toString('base64');
  return `data:image/png;base64,${b64}`;
}

describe('spriteSheetFromPackedImageSource', () => {
  it('uses SpriteSheet.fromImageSourceWithSourceViews with packed fixture rects', () => {
    const pngPath = join(__dirname, 'fixtures', 'sample-packed-atlas.png');
    const png = PNG.sync.read(readFileSync(pngPath));

    const manifest = parsePackedAtlasOrderedJson(packedFixture);
    expect(manifest.sourceViews).toHaveLength(2);

    const img = document.createElement('img');
    img.src = pngDataUrlFromFixture();
    Object.defineProperty(img, 'naturalWidth', { value: png.width, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: png.height, configurable: true });
    Object.defineProperty(img, 'width', { value: png.width, configurable: true });
    Object.defineProperty(img, 'height', { value: png.height, configurable: true });

    const imageSource = ImageSource.fromHtmlImageElement(img);
    expect(imageSource.isLoaded()).toBe(true);
    expect(imageSource.width).toBe(8);
    expect(imageSource.height).toBe(8);

    const sheet = spriteSheetFromPackedImageSource(imageSource, manifest);
    expect(sheet.sprites.length).toBe(2);
    expect(sheet.rows).toBe(1);
    expect(sheet.columns).toBe(2);

    const sprite0 = sheet.getSprite(0, 0);
    expect(sprite0.width).toBe(2);
    expect(sprite0.height).toBe(2);
    expect(sprite0.height * sprite0.width).toBeGreaterThan(0);

    const sprite1 = sheet.getSprite(1, 0);
    expect(sprite1.width).toBe(2);
    expect(sprite1.height).toBe(2);
  });
});
