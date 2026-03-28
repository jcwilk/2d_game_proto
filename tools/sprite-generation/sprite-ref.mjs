/**
 * Sprite-ref JSON for **`src/art/`** loaders. Validation targets and TypeScript
 * contracts live in **`src/art/atlasTypes.ts`**:
 *
 * - **`frameKeyRect`** — Top-level **`frames`** matches **`FrameKeyRectManifestJson`**
 *   (`parseFrameKeyRectManifestJson`). Optional **`images`** maps the same keys to
 *   paths under the Vite **`public/`** URL layout (no `public/` prefix), e.g.
 *   **`art/dpad/up/dpad.png`** (basename from preset or **`DEFAULT_TILE_PNG_BASENAME`**) —
 *   same convention as **`publicArtUrl`** in
 *   **`src/art/atlasLoader.ts`**. Extra keys are ignored by the parser but are
 *   part of the on-disk contract for loaders that pair rects with per-frame files.
 *
 * - **`gridFrameKeys`** — Output matches **`AtlasGridWithFrameKeysManifestJson`**
 *   (`parseGridFrameKeysManifestJson`). Optional **`image`** is the single sheet
 *   raster path (under **`public/`** as URL). **`AtlasGridManifestJson`** is the
 *   grid-only subset validated inside that parser.
 */

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

/**
 * Default per-frame PNG basename when **`spriteRef.pngFilename`** is omitted.
 * Shared pipeline default (not D-pad–specific); the d-pad preset sets **`pngFilename: 'dpad.png'`**.
 */
export const DEFAULT_TILE_PNG_BASENAME = 'tile.png';

/**
 * @typedef {import('./generators/types.mjs').GeneratorFrame} GeneratorFrame
 */

/**
 * @typedef {object} SpriteRefFrameKeyRect
 * @property {'frameKeyRect'} kind
 * @property {string} [jsonRelativePath='sprite-ref.json']  Written under `outBase`.
 * @property {string} artUrlPrefix  e.g. `art/dpad` (site-root-relative, no leading slash).
 * @property {string} [pngFilename]  Basename in each tile directory; defaults to **`DEFAULT_TILE_PNG_BASENAME`**.
 */

/**
 * @typedef {object} SpriteRefGridFrameKeys
 * @property {'gridFrameKeys'} kind
 * @property {string} [jsonRelativePath='sprite-ref.json']
 * @property {string} sheetImageRelativePath  e.g. `art/dpad/sheet.png` (one PNG for the grid).
 */

/**
 * @typedef {object} SpriteGenPresetBase
 * @property {string} id
 * @property {number} tileSize  Square tile pixel size (width = height).
 * @property {GeneratorFrame[]} frames  Ordered list; `id` and `outSubdir` used for tile layout.
 * @property {SpriteRefFrameKeyRect|SpriteRefGridFrameKeys} spriteRef
 */

/**
 * @typedef {SpriteGenPresetBase & {
 *   sheet: { rows: number; columns: number; spriteWidth: number; spriteHeight: number };
 *   frameSheetCells: Record<string, { column: number; row: number }>;
 * }} SpriteGenPresetGrid
 */

/**
 * @typedef {SpriteGenPresetBase} SpriteGenPresetTiles
 */

/**
 * Builds the JSON object written next to generated art (manifest / sprite-ref).
 *
 * @param {SpriteGenPresetTiles | SpriteGenPresetGrid} preset
 * @returns {Record<string, unknown>}
 */
export function buildSpriteRefPayload(preset) {
  const { spriteRef } = preset;
  if (spriteRef.kind === 'frameKeyRect') {
    return buildFrameKeyRectPayload(/** @type {SpriteGenPresetTiles} */ (preset));
  }
  if (spriteRef.kind === 'gridFrameKeys') {
    return buildGridFrameKeysPayload(/** @type {SpriteGenPresetGrid} */ (preset));
  }
  throw new Error(`sprite-ref: unknown spriteRef.kind`);
}

/**
 * @param {SpriteGenPresetTiles} preset
 */
function buildFrameKeyRectPayload(preset) {
  const sr = preset.spriteRef;
  if (sr.kind !== 'frameKeyRect') {
    throw new Error('sprite-ref: internal kind mismatch');
  }
  const png = sr.pngFilename ?? DEFAULT_TILE_PNG_BASENAME;
  const prefix = sr.artUrlPrefix.replace(/\/$/, '');
  /** @type {Record<string, { x: number; y: number; width: number; height: number }>} */
  const frames = {};
  /** @type {Record<string, string>} */
  const images = {};
  for (const f of preset.frames) {
    const sub = f.outSubdir ?? f.id;
    frames[f.id] = {
      x: 0,
      y: 0,
      width: preset.tileSize,
      height: preset.tileSize,
    };
    images[f.id] = `${prefix}/${sub}/${png}`;
  }
  return { frames, images };
}

/**
 * @param {SpriteGenPresetGrid} preset
 */
function buildGridFrameKeysPayload(preset) {
  const sr = preset.spriteRef;
  if (sr.kind !== 'gridFrameKeys') {
    throw new Error('sprite-ref: internal kind mismatch');
  }
  const { sheet, frameSheetCells } = preset;
  const grid = {
    rows: sheet.rows,
    columns: sheet.columns,
    spriteWidth: sheet.spriteWidth,
    spriteHeight: sheet.spriteHeight,
  };
  /** @type {Record<string, { column: number; row: number }>} */
  const frames = {};
  for (const f of preset.frames) {
    const cell = frameSheetCells[f.id];
    if (!cell) {
      throw new Error(`sprite-ref: missing frameSheetCells for frame id ${JSON.stringify(f.id)}`);
    }
    frames[f.id] = { column: cell.column, row: cell.row };
  }
  return {
    grid,
    frames,
    image: sr.sheetImageRelativePath.replace(/^\//, ''),
  };
}

/**
 * Writes sprite-ref JSON under **`outBase`** (e.g. **`public/art/dpad`**).
 *
 * @param {SpriteGenPresetTiles | SpriteGenPresetGrid} preset
 * @param {string} outBase  Absolute or relative directory; created if needed.
 * @returns {Promise<string>} Path to the written file.
 */
export async function writeSpriteRef(preset, outBase) {
  const rel = preset.spriteRef.jsonRelativePath ?? 'sprite-ref.json';
  const dest = join(outBase, rel);
  await mkdir(dirname(dest), { recursive: true });
  const text = JSON.stringify(buildSpriteRefPayload(preset), null, 2) + '\n';
  await writeFile(dest, text, 'utf8');
  return dest;
}
