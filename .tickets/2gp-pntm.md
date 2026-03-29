---
id: 2gp-pntm
status: open
deps: [2gp-j9ls, 2gp-qv9k]
links: []
created: 2026-03-29T18:48:11Z
type: task
priority: 2
assignee: user.email
parent: 2gp-zxol
---
# De-slug registry and rename-dry-run tests

registry.test.mjs: Object.keys(PRESETS). rename-dry-run.test.mjs: contrived slugs; dynamic registry key when real state needed.

## Design

registry.test.mjs; rename-dry-run.test.mjs

## Acceptance Criteria

No hard-coded production asset list in registry tests; rename tests avoid production literals except dynamic pick.

