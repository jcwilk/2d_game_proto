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

Pure layout math without canvas. **Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §D.4 (Vitest for pure layout math).

## Design

Implement pure helpers under `src/` (e.g. `src/camera/math.ts`) with colocated `*.test.ts`; **exact paths** are chosen in this ticket—record them in closure notes if different from the example.

## Acceptance Criteria

1) At least **three** distinct test cases (e.g. origin mapping, negative world coords, clamp or bounds behavior) with **≥3 assertions** total across them. 2) `npm test` exits 0. 3) Closure notes list the helper module path(s) and matching `*.test.ts` path(s).

