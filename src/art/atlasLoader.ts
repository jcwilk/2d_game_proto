import { DefaultLoader, ImageFiltering, ImageSource, Resource } from 'excalibur';

/**
 * Paths relative to the site root (`public/` in dev/build). Use with {@link publicArtUrl}.
 * Normative: `.cursor/plans/project-implementation-deep-dive.md` §C.4 (HTTP(S) loading).
 */

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
    filtering: ImageFiltering.Blended,
  });
  const loader = new DefaultLoader({
    loadables: [atlasJsonResource, atlasImageSource],
  });
  return { loader, atlasJsonResource, atlasImageSource };
}

/**
 * Preloads `sprite-ref.json` (`gridFrameKeys`) plus **`sheet.png`** under `artDir` for uniform-grid slicing.
 */
export function createGridSheetLoader(artDir: string): {
  loader: DefaultLoader;
  spriteRefResource: Resource<unknown>;
  sheetImageSource: ImageSource;
} {
  const spriteRefResource = new Resource<unknown>(publicArtUrl(`${artDir}/sprite-ref.json`), 'json');
  const sheetImageSource = new ImageSource(publicArtUrl(`${artDir}/sheet.png`), {
    filtering: ImageFiltering.Blended,
  });
  const loader = new DefaultLoader({
    loadables: [spriteRefResource, sheetImageSource],
  });
  return { loader, spriteRefResource, sheetImageSource };
}

/**
 * Single loader that preloads several `sprite-ref.json` + `sheet.png` pairs (e.g. character + terrain).
 */
export function mergeGridSheetLoaders(
  ...sheets: ReturnType<typeof createGridSheetLoader>[]
): DefaultLoader {
  const merged = new DefaultLoader();
  for (const s of sheets) {
    merged.addResources([s.spriteRefResource, s.sheetImageSource]);
  }
  return merged;
}
