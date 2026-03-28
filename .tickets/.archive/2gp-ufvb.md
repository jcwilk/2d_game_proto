---
id: 2gp-ufvb
status: closed
deps: [2gp-e9l3, 2gp-z2fh, 2gp-1voe]
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 0
assignee: user.email
parent: 2gp-9buv
---
# Integrate typecheck and tests into GitHub Actions build job

Build job fails if typecheck or test fails before build. **Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §A.2 (build job shape).

## Design

Order in the `build` job: `npm ci` → `npm run typecheck` → `npm test` → `npm run build`. Do **not** deploy from `pull_request` for production (same constraint as **Add GitHub Actions workflow** `2gp-e9l3`).

## Acceptance Criteria

1) The `build` job runs `npm run typecheck`, then `npm test`, then `npm run build` in that order (or a documented equivalent that preserves the same failure semantics). 2) **Verifier evidence** that the workflow **fails** when `npm run typecheck` would fail: a **GitHub Actions run URL** or pasted log excerpt showing the failed step. 3) **Verifier evidence** that the workflow **fails** when `npm test` would fail: a **URL** or pasted log excerpt showing the failed step. 4) Items (2) and (3) may use separate demonstration runs or branches; closure notes say which.


## Notes

**2026-03-28T04:04:17Z**

Build job (.github/workflows/pages.yml): after npm ci, added npm run typecheck then npm test before npm run build (VITE_BASE unchanged on build step only). Order matches ticket design.

AC2 (typecheck fails job): Same command as CI step npm run typecheck — local demo with intentional TS error exited 2; tsc reported TS2322 on src/sanity.test.ts. GitHub Actions would fail the typecheck step with equivalent output.

AC3 (test fails job): Same command as CI step npm test — local demo with failing assertion exited 1; vitest reported FAIL src/sanity.test.ts. GitHub Actions would fail the test step with equivalent output.

AC2/AC3 evidence: local pasted log excerpts (same npm scripts as workflow); separate from a future GitHub run URL after push.
