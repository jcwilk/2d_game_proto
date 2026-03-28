import { SpriteSheet, type ImageSource } from 'excalibur';

import type { PackedAtlasOrderedJson } from './atlasTypes';
import { atlasFrameRectToSourceView } from './atlasTypes';

/**
 * Builds a packed (non-uniform) {@link SpriteSheet} from a loaded {@link ImageSource} and ordered
 * atlas JSON. **§C.2 step 4, bullet 2:** packed / arbitrary rects use
 * `SpriteSheet.fromImageSourceWithSourceViews` with `sourceViews` from JSON (not the uniform-grid
 * path in bullet 1). `sourceViews` order is stable for index-based access.
 */
export function spriteSheetFromPackedImageSource(
  image: ImageSource,
  manifest: PackedAtlasOrderedJson,
): SpriteSheet {
  const sourceViews = manifest.sourceViews.map(atlasFrameRectToSourceView);
  return SpriteSheet.fromImageSourceWithSourceViews({ image, sourceViews });
}
