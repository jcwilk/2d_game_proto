---
id: wor-qtif
status: closed
deps: [wor-ustu, wor-0ae7]
links: []
created: 2026-04-19T16:37:37Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-isz6
---
# presets/lib: iso-tile-preset factory (tier from dimensions.ts)

## Design

Per plan: iso-tile-preset.ts factory for floor/wall strips — tier IsoCellTier (floorOnly | halfHeight | fullHeight), frames, iso prompt bundle, renderMockTileBuffer hook; derive tile pixel sizes via gameDimensions.ts / isoSquareCellSizePx(tier). Shared rhombus/footprint semantics from src/dimensions.ts.

## Acceptance Criteria

Factory composes PipelinePreset shapes; unit tests for tier→size derivation vs dimensions.ts; no slug refactor in this ticket (factory only, may be unused until next ticket).

