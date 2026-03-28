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

import gridFixture from './fixtures/sample-grid-atlas.json';
import { spriteSheetFromGridImageSource } from './gridSpriteSheet';
import { parseAtlasGridManifestJson } from './atlasTypes';

const __dirname = dirname(fileURLToPath(import.meta.url));

function pngDataUrlFromFixture(): string {
  const pngPath = join(__dirname, 'fixtures', 'sample-grid-atlas.png');
  const b64 = readFileSync(pngPath).toString('base64');
  return `data:image/png;base64,${b64}`;
}

describe('spriteSheetFromGridImageSource', () => {
  it('uses SpriteSheet.fromImageSource with grid options matching fixture cell size', () => {
    const pngPath = join(__dirname, 'fixtures', 'sample-grid-atlas.png');
    const png = PNG.sync.read(readFileSync(pngPath));

    const manifest = parseAtlasGridManifestJson(gridFixture);
    const { spriteWidth, spriteHeight, rows, columns } = manifest.grid;

    expect(spriteWidth).toBe(32);
    expect(spriteHeight).toBe(32);
    expect(png.width).toBe(columns * spriteWidth);
    expect(png.height).toBe(rows * spriteHeight);

    const img = document.createElement('img');
    img.src = pngDataUrlFromFixture();
    Object.defineProperty(img, 'naturalWidth', { value: png.width, configurable: true });
    Object.defineProperty(img, 'naturalHeight', { value: png.height, configurable: true });
    Object.defineProperty(img, 'width', { value: png.width, configurable: true });
    Object.defineProperty(img, 'height', { value: png.height, configurable: true });

    const imageSource = ImageSource.fromHtmlImageElement(img);
    expect(imageSource.isLoaded()).toBe(true);
    expect(imageSource.width).toBe(64);
    expect(imageSource.height).toBe(64);

    const sheet = spriteSheetFromGridImageSource(imageSource, manifest);
    expect(sheet.rows).toBe(2);
    expect(sheet.columns).toBe(2);

    const sprite = sheet.getSprite(0, 0);
    expect(sprite.width).toBe(32);
    expect(sprite.height).toBe(32);
    expect(sprite.width * sprite.height).toBeGreaterThan(0);
  });
});
