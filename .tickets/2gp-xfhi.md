---
id: 2gp-xfhi
status: open
deps: [2gp-5d4y]
links: []
created: 2026-03-28T03:23:56Z
type: task
priority: 0
assignee: user.email
parent: 2gp-2rau
---
# Add Excalibur ^0.32 runtime dependency

**Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §C.1 (stable line, not `@next`), §F summary.

## Design

`npm install excalibur@^0.32`; commit lockfile changes.

## Acceptance Criteria

1) `package.json` declares **`excalibur`** with range **`^0.32`**. 2) `npm ls excalibur` resolves **`0.32.x`**. 3) Lockfile / install does **not** use `@next` or a prerelease tag as the resolved engine version.

