---
id: 2gp-z2fh
status: closed
deps: [2gp-5d4y]
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 1
assignee: user.email
parent: 2gp-9buv
---
# Add npm typecheck script using tsc --noEmit

Enforce strict typing aligned with **`CONVENTIONS.md`** and **`tsconfig.json`**. **Normative:** same stack as **`.cursor/plans/project-implementation-deep-dive.md`** §F (TypeScript app).

## Design

`package.json` script `typecheck` runs `tsc --noEmit` (or equivalent) over `src/` and test files included by `tsconfig`.

## Acceptance Criteria

1) `npm run typecheck` exits 0 on a clean tree. 2) **`README.md`** or a **`package.json` comment** names the `typecheck` script and what it runs.

