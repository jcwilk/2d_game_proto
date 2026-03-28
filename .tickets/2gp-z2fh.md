---
id: 2gp-z2fh
status: open
deps: [2gp-5d4y]
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 1
assignee: user.email
parent: 2gp-9buv
---
# Add npm typecheck script using tsc --noEmit

Enforce CONVENTIONS strict typing in CI. Plan supporting CONVENTIONS.md.

## Design

package.json typecheck script; include src/ and tests.

## Acceptance Criteria

1) npm run typecheck exits 0. 2) Documented in README or package.json comment.

