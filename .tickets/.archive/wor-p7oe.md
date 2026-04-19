---
id: wor-p7oe
status: closed
deps: [wor-fb50]
links: []
created: 2026-04-19T16:37:46Z
type: feature
priority: 2
assignee: Cursor Agent
parent: wor-isz6
---
# Add isometric wall tile preset (same footprint as floor, taller)

## Design

New slug (e.g. isometric-wall or isometric-basic-wall) using iso-tile-preset with tier halfHeight or fullHeight per src/dimensions.ts — same footprint W as floor (floorOnly width), cell height from isoSquareCellSizePx(tier) so wall reads taller than floor strip. New prompt.ts blocks or suffixes for vertical wall faces / occluder (reuse iso floor falsprite patterns where sensible). 1x4 strip of variants optional; match sheet strategy with isometric-open-floor.

## Acceptance Criteria

Registry discovers slug; mock generate succeeds. **Dimensions:** footprint width equals `ISO_FLOOR_TEXTURE_WIDTH_PX` / same horizontal footprint as `isometric-open-floor`; cell height equals `isoSquareCellSizePx(tier)` for the chosen `IsoCellTier` (`halfHeight` or `fullHeight`), verified in test or asserted against `gameDimensions.ts` exports. Manifest/sprite-ref contract matches pipeline; colocated test or registry coverage.


## Notes

**2026-04-19T17:17:00Z**

Implemented isometric-basic-wall preset: createIsoTileStripPreset tier halfHeight, 1x4 wall_0..3 frames, sprite-ref gridFrameKeys + sheet strategy matching open-floor. Prompts: ISO_WALL_* in prompt.ts + buildIsometricWallStripSpritePrompt; mock renderIsometricWallMockTileBuffer (floor rhombus in bottom band + wall column). Fal sheet aspect NANO_BANANA2_HALF_HEIGHT_WALL_STRIP_ASPECT_RATIO 16:3. Tests: isometric-basic-wall.test.ts (dimensions vs gameDimensions). Mock CLI run verified.
