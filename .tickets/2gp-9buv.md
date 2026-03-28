---
id: 2gp-9buv
status: closed
deps: []
links: []
created: 2026-03-28T03:23:56Z
type: epic
priority: 2
assignee: user.email
---
# Epic: Testing & QA

Vitest, optional Playwright smoke; CI integration.

## Design

CI ordering for `typecheck` → `test` → `build` is owned by **Integrate typecheck and tests into GitHub Actions build job** (`2gp-ufvb`), not by **Add Vitest** (`2gp-1voe`) alone.

## Epic rollup (definition of done)

**Close this epic** only when no child ticket with `parent: 2gp-9buv` remains **open**. **Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §D.4 (Vitest for pure math; optional Playwright smoke). **Agents:** do **not** treat “merge to `main`” as a routine task—**pushes to the current branch** and CI are sufficient per **`AGENTS.md`**.

## Acceptance Criteria

1) Rollup above is satisfied at closure. 2) Closure notes reference how CI runs tests (workflow path or `./tk` link).


## Notes

**2026-03-28T04:07:22Z**

CI: .github/workflows/pages.yml runs npm ci, typecheck, npm test (Vitest), build (VITE_BASE). Playwright test:e2e optional locally; not in CI. README §Tests.
