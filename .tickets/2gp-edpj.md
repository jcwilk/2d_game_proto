---
id: 2gp-edpj
status: open
deps: [2gp-1voe, 2gp-04c6]
links: []
created: 2026-03-28T03:23:57Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-c9u6
---
# Add deterministic PNG analysis script (dimensions, alpha, grid projection)

sharp or pngjs; CLI path + grid params; §E.5, §E.5.1 metrics.

## Design

npm run analyze:sprite or documented; premultiplied note §C.4.

## Acceptance Criteria

1) Runs on fixture PNG. 2) Vitest or shell documents exit codes. 3) tools/README --help mentions alpha checklist.

