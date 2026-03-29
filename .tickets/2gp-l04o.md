---
id: 2gp-l04o
status: open
deps: [2gp-b82a]
links: []
created: 2026-03-29T17:54:41Z
type: chore
priority: 2
assignee: user.email
parent: 2gp-sni8
---
# Final verification: typecheck and smoke

Run `npm run typecheck` and `npm test`. Smoke: `npm run generate:spritesheet -- list`, `npm run generate:spritesheet -- status` (or equivalent `node tools/generate-spritesheet.mjs …`). Document `status` behavior when git is missing or files are untracked (`unknown` / mtime path). If `2gp-qsnl` was deferred, verification still passes; if it landed, include its tests in the same `npm test` run.

## Acceptance Criteria

- `npm run typecheck` and `npm test` pass locally (CI-equivalent).
- Smoke commands above exit 0; git-less / sandbox behavior for `status` is documented in the skill or `tools/sprite-generation/README.md`.
- No regressions attributable to import or path churn from this epic.

