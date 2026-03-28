---
id: 2gp-ufvb
status: open
deps: [2gp-e9l3, 2gp-z2fh, 2gp-1voe]
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 0
assignee: user.email
parent: 2gp-9buv
---
# Integrate typecheck and tests into GitHub Actions build job

Build job fails if typecheck or test fails before build. Plan §A.2.

## Design

Order: npm ci → typecheck → test → build.

## Acceptance Criteria

1) Workflow runs `npm run typecheck`, `npm test`, then `npm run build` in the `build` job (same order or documented equivalent). 2) Verifier evidence that the workflow **fails** when **typecheck** fails: **GitHub Actions run URL** or pasted log excerpt. 3) Verifier evidence that the workflow **fails** when **tests** fail: **URL** or pasted log excerpt. (Items (2) and (3) may use separate demonstration runs or branches; document in closure.)

