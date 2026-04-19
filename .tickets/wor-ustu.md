---
id: wor-ustu
status: open
deps: []
links: []
created: 2026-04-19T16:37:27Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-isz6
---
# presets/lib: sheet-spec strip builders + golden tests (avatar-character, isometric-open-floor)

## Design

Per .cursor/plans/preset_composition_structure_777131ea.plan.md step 1. Add tools/sprite-generation/presets/lib/sheet-spec.ts with horizontalStripCrops, frameSheetCellsRowMajor, sheetDimensionsFromStrip, validation that every frame has crop+cell. Exported types for crop/cell maps. Vitest golden tests: outputs match current SHEET_CROPS / cells for avatar-character and isometric-open-floor only (dpad deferred). Align with sheet-layout.ts compositor.

## Acceptance Criteria

sheet-spec.ts exists under presets/lib/ with tests; golden tests pass and match existing preset geometry for those two slugs; registry unchanged; npm test (or vitest) green for touched files; no dpad refactor in this ticket.

