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

Map logical keys → index or rect per **`.cursor/plans/project-implementation-deep-dive.md`** §C.4 (“stable map from logical frame keys”).

## Design

Export one lookup module consumed by gameplay; optional `public/art/manifest.json` or typed in-repo manifest—closure notes record the source of truth.

## Acceptance Criteria

1) One module exports the lookup API used by gameplay code. 2) Vitest covers **key → sprite** (or **key → rect**) for a **fixture** manifest. 3) Works for **grid** atlases without blocking a later **packed** manifest format (document assumptions in closure notes).

