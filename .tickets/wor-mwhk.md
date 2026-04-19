---
id: wor-mwhk
status: closed
deps: [wor-ustu, wor-0ae7]
links: []
created: 2026-04-19T16:37:46Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-isz6
---
# presets/lib: grid sheet-spec builder + dpad golden tests; refactor dpad preset

## Design

Plan step 5: extend sheet-spec with row-major grid builder (2×2 for dpad); validate API supports strip + grid. Add golden tests matching current dpad SHEET_CROPS/cells. Refactor presets/dpad/dpad.ts to use builders. **Fal extras:** move dpad’s nano-banana `falExtrasSheet` / `falExtrasPerTile` literals onto `presets/lib/fal-nano-banana.ts` (same merged shapes as today — no behavior change).

## Acceptance Criteria

dpad geometry unchanged; dpad tests + pipeline tests green; grid builder covered by tests; dpad imports shared fal bundle from lib (no duplicate literals left for those keys).


## Notes

**2026-04-19T16:53:51Z**

Added rowMajorGridCrops + sheetDimensionsFromGrid; dpad uses sheet-spec builders for crops/cells/layout/dimensions; golden test vs dpad preset; duplicate frame id error message generic.
