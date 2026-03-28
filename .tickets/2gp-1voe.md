---
id: 2gp-1voe
status: open
deps: [2gp-5d4y]
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 0
assignee: user.email
parent: 2gp-9buv
---
# Add Vitest with TypeScript support and npm script

Vitest for deterministic unit tests. Plan §D.4.

## Design

vitest.config.ts; npm test; optional coverage.

## Acceptance Criteria

1) npm test exits 0 with ≥1 test. 2) CI wiring deferred to Integrate typecheck and tests ticket.

