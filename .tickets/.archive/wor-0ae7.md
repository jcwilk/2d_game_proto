---
id: wor-0ae7
status: closed
deps: []
links: []
created: 2026-04-19T16:37:27Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-isz6
---
# presets/lib: fal nano-banana extras bundle + types

## Design

Per plan step 2. Add presets/lib/fal-nano-banana.ts (or agreed name) exporting shared falExtrasSheet / falExtrasPerTile shapes parameterized where needed. Types aligned with generators/fal.ts and PipelinePreset['fal']. Use const + satisfies at lib boundary. Presets still import from lib in follow-up refactors.

## Acceptance Criteria

New lib module exists; types compile. Wire at most one import from an existing module **only** if needed to validate the export path and types; otherwise consumers land in follow-up tickets. Tests if any pure helpers. No behavior change to merged fal extras until consumers switch imports.


## Notes

**2026-04-19T16:49:37Z**

Added presets/lib/fal-nano-banana.ts: NanoBanana2FalExtrasSheet/PerTile types, nanoBanana2FalExtrasSheet/PerTile builders (const + satisfies). Dpad preset wired to lib for type/export validation; merged fal extras unchanged.
