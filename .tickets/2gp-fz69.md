---
id: 2gp-fz69
status: open
deps: [2gp-1voe]
links: []
created: 2026-03-28T03:23:56Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-9buv
---
# Add unit tests for pure world-to-screen or camera bounds helpers

Pure layout math without canvas. Plan §D.4.

## Design

Implement pure helpers under `src/` (e.g. `src/camera/math.ts`) with colocated `*.test.ts`; **exact paths** are chosen in this ticket—update acceptance if the module lives elsewhere.

## Acceptance Criteria

1) ≥3 assertions covering distinct cases (e.g. origin, negative coords, clamp/bounds). 2) `npm test` passes. 3) Closure notes name the files implementing the helpers and tests.

