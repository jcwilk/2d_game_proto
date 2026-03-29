import { DefaultLoader, ImageFiltering, ImageSource, Resource } from 'excalibur';

/**
 * Paths relative to the site root (`public/` in dev/build). Use with {@link publicArtUrl}.
 * Normative: `.cursor/plans/project-implementation-deep-dive.md` §C.4 (HTTP(S) loading).
 */

/** Sprite-ref JSON for the character walk preset (`tools/sprite-generation/presets/character.mjs`). */
export const CHARACTER_SPRITE_REF_JSON = 'art/character/sprite-ref.json';

/** Single spritesheet raster (must match `sprite-ref.json` `image` from pipeline `gridFrameKeys`). */
export const CHARACTER_WALK_SHEET_IMAGE = 'art/character/sheet.png';

/** Frame keys and load order — keep in sync with `CHARACTER_WALK_FRAMES` in `tools/sprite-generation/presets/character.mjs`. */
export const CHARACTER_WALK_FRAME_IDS = ['walk_0', 'walk_1', 'walk_2', 'walk_3'] as const;

export const SAMPLE_PACKED_ATLAS_JSON = 'art/sample-atlas.json';

/** PNG/WebP atlas paired with {@link SAMPLE_PACKED_ATLAS_JSON}. */
export const SAMPLE_PACKED_ATLAS_IMAGE = 'art/sample-atlas.png';

/**
 * Resolves a path served from `public/` for the current Vite `base` (dev `/`, Pages `/<repo>/`).
 */
export function publicArtUrl(relativePath: string): string {
  const base = import.meta.env.BASE_URL;
  return base.endsWith('/') ? `${base}${relativePath}` : `${base}/${relativePath}`;
}

/**
 * Loader used on the main engine start path: packed atlas JSON via {@link Resource} with
 * `responseType: 'json'`, plus the atlas raster via {@link ImageSource} (not legacy Texture).
 */
export function createSampleAtlasLoader(): {
  loader: DefaultLoader;
  atlasJsonResource: Resource<unknown>;
  atlasImageSource: ImageSource;
} {
  const atlasJsonResource = new Resource<unknown>(publicArtUrl(SAMPLE_PACKED_ATLAS_JSON), 'json');
  const atlasImageSource = new ImageSource(publicArtUrl(SAMPLE_PACKED_ATLAS_IMAGE), {
    filtering: ImageFiltering.Pixel,
  });
  const loader = new DefaultLoader({
    loadables: [atlasJsonResource, atlasImageSource],
  });
  return { loader, atlasJsonResource, atlasImageSource };
}

/**
 * Preloads `sprite-ref.json` (`gridFrameKeys`) plus the walk-cycle **`sheet.png`** for uniform-grid slicing.
 */
export function createCharacterWalkLoader(): {
  loader: DefaultLoader;
  spriteRefResource: Resource<unknown>;
  sheetImageSource: ImageSource;
} {
  const spriteRefResource = new Resource<unknown>(publicArtUrl(CHARACTER_SPRITE_REF_JSON), 'json');
  const sheetImageSource = new ImageSource(publicArtUrl(CHARACTER_WALK_SHEET_IMAGE), {
    filtering: ImageFiltering.Pixel,
  });
  const loader = new DefaultLoader({
    loadables: [spriteRefResource, sheetImageSource],
  });
  return { loader, spriteRefResource, sheetImageSource };
}
