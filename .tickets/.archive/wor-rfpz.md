---
id: wor-rfpz
status: closed
deps: [wor-ustu, wor-0ae7]
links: []
created: 2026-04-19T16:37:37Z
type: task
priority: 2
assignee: Cursor Agent
parent: wor-isz6
---
# presets/lib: character-preset factory + character-defaults

## Design

Per plan steps 4: character-defaults.ts + character-preset.ts assembling walk strips — frames authoritative; derive sheet.columns/rows, sheetGridSize, frameSheetCells for horizontal strip from frames.length; delegate mock tileBufferForFrame/sheetLayout to shared geometry + mock hooks. Fal extras may import fal-nano-banana lib.

## Acceptance Criteria

Lib modules exist; avatar-character not refactored in this ticket (factory may be integration-tested in isolation); tests for strip derivation from frame list.


## Notes

**2026-04-19T17:03:14Z**

Implemented character-defaults.ts (cell dims, QA helper, fal partial via fal-nano-banana, chroma constants) and character-preset.ts createCharacterStripPreset mirroring iso-tile-preset: frames drive strip (columns, sheetGridSize, crops, cells, sheetLayout). Tests: character-preset.test.ts golden vs avatar literals + 3-frame derivation. Full npm test + typecheck green.
