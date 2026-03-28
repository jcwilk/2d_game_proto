import { describe, expect, it } from 'vitest';

import fixture from './fixtures/sample-atlas-ordered.json';
import { parsePackedAtlasOrderedJson } from './atlasTypes';

describe('parsePackedAtlasOrderedJson', () => {
  it('parses loaded JSON shape to typed atlas data without a browser', () => {
    const atlas = parsePackedAtlasOrderedJson(fixture);
    expect(atlas.sourceViews).toHaveLength(1);
    expect(atlas.sourceViews[0]).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });
});
