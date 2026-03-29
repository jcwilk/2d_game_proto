---
id: 2gp-qv9k
status: closed
deps: [2gp-j9ls]
links: []
created: 2026-03-29T18:48:10Z
type: chore
priority: 1
assignee: user.email
parent: 2gp-zxol
---
# Delete character-workflow; trim rename blocklist

Delete tools/character-workflow.mjs; remove npm scripts. Trim RENAME_TO_BLOCKLIST to reserved tokens not redundant with Object.keys(PRESETS) collision. Fix manifest/preset provenance strings that reference deleted script.

## Design

character-workflow.mjs delete; package.json; rename-dry-run.mjs; public/art/avatar-character/manifest.json; avatar-character.mjs comments

## Acceptance Criteria

No tracked reference to character-workflow.mjs; blocklist has no redundant registry slugs; dynamic collision still works.

