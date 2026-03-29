---
id: 2gp-g3ii
status: open
deps: [2gp-j9ls]
links: []
created: 2026-03-29T18:48:10Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-zxol
---
# Remove asset-id branching in generate-spritesheet CLI

keepSheet = Boolean(preset.sheetOnlyOutput). Chroma from preset CHROMA_TOLERANCE_DEFAULT else 72; no CHARACTER_* export name checks. Help/examples use <id> placeholders not production slugs.

## Design

tools/generate-spritesheet.mjs; tools/sprite-generation/presets/*/*.mjs

## Acceptance Criteria

No asset-id conditionals for keepSheet; chroma uses CHROMA_TOLERANCE_DEFAULT or 72; static help lacks real slug examples.

