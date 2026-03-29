---
id: 2gp-nudn
status: open
deps: []
links: []
created: 2026-03-29T18:48:10Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-zxol
---
# Add createGridSheetLoader; simplify main.ts wiring

createGridSheetLoader(artDir) in atlasLoader.ts. Remove createCharacterWalkLoader and per-asset URL constants (dpad if unused). main.ts: createGridSheetLoader('art/avatar-character'), inline walk frame ids, no preset file path comments.

## Design

src/art/atlasLoader.ts; src/main.ts

## Acceptance Criteria

No createCharacterWalkLoader; build/typecheck green; game loads walk assets from public/art/avatar-character/.

