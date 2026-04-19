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

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { GeneratorFrame } from "./generators/types.ts";

/**
 * Default per-frame PNG basename when **`spriteRef.pngFilename`** is omitted.
 * Shared pipeline default (not D-pad–specific); the d-pad preset sets **`pngFilename: 'dpad.png'`**.
 */
export const DEFAULT_TILE_PNG_BASENAME = "tile.png";

export interface SpriteRefFrameKeyRect {
  kind: "frameKeyRect";
  /** Written under `outBase`. */
  jsonRelativePath?: string;
  /** e.g. `art/dpad` (site-root-relative, no leading slash). */
  artUrlPrefix: string;
  /** Basename in each tile directory; defaults to **`DEFAULT_TILE_PNG_BASENAME`**. */
  pngFilename?: string;
}

export interface SpriteRefGridFrameKeys {
  kind: "gridFrameKeys";
  jsonRelativePath?: string;
  /** e.g. `art/dpad/sheet.png` (one PNG for the grid). */
  sheetImageRelativePath: string;
}

export interface SpriteGenPresetBase {
  id: string;
  /** Frame width in pixels (per-frame **`frameKeyRect`** rects). */
  tileSize: number;
  /** Frame height; defaults to **`tileSize`** (square). */
  tileHeight?: number;
  /** Ordered list; `id` and `outSubdir` used for tile layout. */
  frames: GeneratorFrame[];
  spriteRef: SpriteRefFrameKeyRect | SpriteRefGridFrameKeys;
}

export interface SpriteGenPresetGrid extends SpriteGenPresetBase {
  spriteRef: SpriteRefGridFrameKeys;
  sheet: { rows: number; columns: number; spriteWidth: number; spriteHeight: number };
  frameSheetCells: Record<string, { column: number; row: number }>;
}

export interface SpriteGenPresetTiles extends SpriteGenPresetBase {
  spriteRef: SpriteRefFrameKeyRect;
}

/** @returns JSON object written next to generated art (manifest / sprite-ref). */
export function buildSpriteRefPayload(preset: SpriteGenPresetTiles | SpriteGenPresetGrid): Record<string, unknown> {
  const { spriteRef } = preset;
  if (spriteRef.kind === "frameKeyRect") {
    return buildFrameKeyRectPayload(preset as SpriteGenPresetTiles);
  }
  if (spriteRef.kind === "gridFrameKeys") {
    return buildGridFrameKeysPayload(preset as SpriteGenPresetGrid);
  }
  throw new Error(`sprite-ref: unknown spriteRef.kind`);
}

function buildFrameKeyRectPayload(preset: SpriteGenPresetTiles): Record<string, unknown> {
  const sr = preset.spriteRef;
  if (sr.kind !== "frameKeyRect") {
    throw new Error("sprite-ref: internal kind mismatch");
  }
  const png = sr.pngFilename ?? DEFAULT_TILE_PNG_BASENAME;
  const prefix = sr.artUrlPrefix.replace(/\/$/, "");
  const fh = preset.tileHeight ?? preset.tileSize;
  const frames: Record<string, { x: number; y: number; width: number; height: number }> = {};
  const images: Record<string, string> = {};
  for (const f of preset.frames) {
    const sub = f.outSubdir ?? f.id;
    frames[f.id] = {
      x: 0,
      y: 0,
      width: preset.tileSize,
      height: fh,
    };
    images[f.id] = `${prefix}/${sub}/${png}`;
  }
  return { frames, images };
}

function buildGridFrameKeysPayload(preset: SpriteGenPresetGrid): Record<string, unknown> {
  const sr = preset.spriteRef;
  if (sr.kind !== "gridFrameKeys") {
    throw new Error("sprite-ref: internal kind mismatch");
  }
  const { sheet, frameSheetCells } = preset;
  const grid = {
    rows: sheet.rows,
    columns: sheet.columns,
    spriteWidth: sheet.spriteWidth,
    spriteHeight: sheet.spriteHeight,
  };
  const frames: Record<string, { column: number; row: number }> = {};
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
    image: sr.sheetImageRelativePath.replace(/^\//, ""),
  };
}

/**
 * Writes sprite-ref JSON under **`outBase`** (e.g. **`public/art/dpad`**).
 *
 * @returns Path to the written file.
 */
export async function writeSpriteRef(preset: SpriteGenPresetTiles | SpriteGenPresetGrid, outBase: string): Promise<string> {
  const rel = preset.spriteRef.jsonRelativePath ?? "sprite-ref.json";
  const dest = join(outBase, rel);
  await mkdir(dirname(dest), { recursive: true });
  const text = JSON.stringify(buildSpriteRefPayload(preset), null, 2) + "\n";
  await writeFile(dest, text, "utf8");
  return dest;
}
