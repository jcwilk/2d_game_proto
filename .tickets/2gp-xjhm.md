---
id: 2gp-xjhm
status: open
deps: [2gp-lo9d]
links: []
created: 2026-03-28T03:23:56Z
type: feature
priority: 0
assignee: user.email
parent: 2gp-hbb5
---
# Build SpriteSheet from uniform grid ImageSource

**Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §C.2 (grid path), §C.3 (grid dimensions).

## Design

Prefer pure helpers; Vitest loads a grid fixture and calls `getSprite` (e.g. column 0, row 0).

## Acceptance Criteria

1) Implementation uses `SpriteSheet.fromImageSource` with grid options. 2) `spriteWidth` / `spriteHeight` **exactly** match the fixture PNG’s cell size (§C.4 dimension checklist). 3) Vitest asserts a non-empty sprite for at least one grid cell.

