import { describe, expect, it } from 'vitest';

import fixture from './fixtures/sample-atlas-ordered.json';
import {
  ATLAS_JSON_ERROR_PREFIX,
  atlasFrameRectToSourceView,
  parsePackedAtlasOrderedJson,
} from './atlasTypes';

describe('parsePackedAtlasOrderedJson → SourceView', () => {
  it('maps valid ordered atlas JSON rects to Excalibur SourceViews (pixels, top-left)', () => {
    const atlas = parsePackedAtlasOrderedJson(fixture);
    expect(atlas.sourceViews).toHaveLength(1);
    const views = atlas.sourceViews.map(atlasFrameRectToSourceView);
    expect(views[0]).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it('throws with the atlas JSON error prefix when sourceViews is not an array', () => {
    expect(() => parsePackedAtlasOrderedJson({ sourceViews: null })).toThrow(
      new RegExp(`^${escapeRegExp(ATLAS_JSON_ERROR_PREFIX)}`),
    );
  });
});

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
