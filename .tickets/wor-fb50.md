---
id: wor-fb50
status: closed
deps: [wor-qtif]
links: []
created: 2026-04-19T16:37:37Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-isz6
---
# Refactor isometric-open-floor preset to use iso factory + sheet-spec

## Design

Migration step 3 from plan. Replace duplicated strip/crop math with presets/lib helpers; keep MANIFEST_PRESET_ID, KIND, public/art output contract unchanged. Run pipeline + registry tests.

## Acceptance Criteria

isometric-open-floor.ts uses lib; mock and live geometry unchanged (golden or pipeline tests); npm run generate:spritesheet -- run --asset isometric-open-floor --mode mock deterministic; registry lists slug.

