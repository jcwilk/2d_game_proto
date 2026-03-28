---
id: 2gp-x4js
status: open
deps: [2gp-kcik, 2gp-lo9d, 2gp-xjhm]
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 1
assignee: user.email
parent: 2gp-hbb5
---
# Expose stable frame key to sprite lookup from manifest

Map logical keys → index/rect §C.4; grid minimum path OK without blocking packed.

## Design

Exported lookup API; optional art/manifest.json.

## Acceptance Criteria

1) Single module exports lookup used by gameplay. 2) Vitest key→sprite for fixture.

