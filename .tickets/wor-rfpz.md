---
id: wor-rfpz
status: open
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

