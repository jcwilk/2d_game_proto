import { DefaultLoader, ImageFiltering, ImageSource, Resource } from 'excalibur';

/**
 * Paths relative to the site root (`public/` in dev/build). Use with {@link publicArtUrl}.
 * Normative: `.cursor/plans/project-implementation-deep-dive.md` §C.4 (HTTP(S) loading).
 */

/** Sprite-ref JSON for the character walk preset (`tools/sprite-generation/presets/character.mjs`). */
export const CHARACTER_SPRITE_REF_JSON = 'art/character/sprite-ref.json';

/** Basename of per-frame PNGs; must match preset `pngFilename` / pipeline output. */
export const CHARACTER_PNG_BASENAME = 'character.png';

/** Frame keys and load order — keep in sync with `CHARACTER_WALK_FRAMES` in `tools/sprite-generation/presets/character.mjs`. */
export const CHARACTER_WALK_FRAME_IDS = ['walk_0', 'walk_1', 'walk_2', 'walk_3'] as const;

export function characterWalkFrameImagePath(frameId: string): string {
  return `art/character/${frameId}/${CHARACTER_PNG_BASENAME}`;
}

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
 * Preloads `sprite-ref.json` plus each walk frame PNG for the character preset (frameKeyRect + per-frame files).
 */
export function createCharacterWalkLoader(): {
  loader: DefaultLoader;
  spriteRefResource: Resource<unknown>;
  imageSources: ImageSource[];
} {
  const spriteRefResource = new Resource<unknown>(publicArtUrl(CHARACTER_SPRITE_REF_JSON), 'json');
  const imageSources = CHARACTER_WALK_FRAME_IDS.map(
    (id) =>
      new ImageSource(publicArtUrl(characterWalkFrameImagePath(id)), {
        filtering: ImageFiltering.Pixel,
      }),
  );
  const loader = new DefaultLoader({
    loadables: [spriteRefResource, ...imageSources],
  });
  return { loader, spriteRefResource, imageSources };
}
