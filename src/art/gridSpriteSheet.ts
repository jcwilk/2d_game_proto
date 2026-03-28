import { SpriteSheet, type ImageSource } from 'excalibur';

import type { AtlasGridManifestJson } from './atlasTypes';

/**
 * Builds a uniform-grid {@link SpriteSheet} from a loaded {@link ImageSource} and grid manifest
 * (see plan §C.2 grid path, §C.3 regular grid).
 */
export function spriteSheetFromGridImageSource(
  image: ImageSource,
  manifest: AtlasGridManifestJson,
): SpriteSheet {
  const { grid, spacing } = manifest;
  if (spacing !== undefined) {
    return SpriteSheet.fromImageSource({ image, grid, spacing });
  }
  return SpriteSheet.fromImageSource({ image, grid });
}
