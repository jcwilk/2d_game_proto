---
id: 2gp-dydr
status: open
deps: [2gp-kcik, 2gp-1voe]
links: []
created: 2026-03-28T03:23:56Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-9buv
---
# Add unit tests for atlas JSON to SourceView mapping

Guard parsing top-left pixel rects §C.2, §C.4.

## Design

Fixture JSON; invalid dimensions rejected.

## Acceptance Criteria

1) Test under src/**/*.test.ts. 2) ≥1 invalid input path throws or Result error.

