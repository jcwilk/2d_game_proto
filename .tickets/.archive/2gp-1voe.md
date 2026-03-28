---
id: 2gp-1voe
status: closed
deps: [2gp-5d4y]
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 0
assignee: user.email
parent: 2gp-9buv
---
# Add Vitest with TypeScript support and npm script

**Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §D.4 (Vitest for fast deterministic tests).

## Design

Add `vitest.config.ts`; `npm test` runs Vitest; coverage optional.

## Acceptance Criteria

1) `npm test` exits 0 with **≥1** passing test. 2) **CI** integration (`typecheck` → `test` → `build` in GitHub Actions) is **out of scope** here—owned by **Integrate typecheck and tests into GitHub Actions build job** (`2gp-ufvb`).

