---
id: 2gp-2rau
status: closed
deps: []
links: []
created: 2026-03-28T03:23:56Z
type: epic
priority: 2
assignee: user.email
---
# Epic: App scaffold & engine

Excalibur ^0.32, centralized engine module, pointer input, main bootstrap.

## Design

Bootstrap and engine wiring land before full atlas gameplay; atlas work rolls up under **Epic: Asset loading & atlas** (`2gp-hbb5`).

## Epic rollup (definition of done)

**Close this epic** only when no child ticket with `parent: 2gp-2rau` remains **open**. **Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §C.1 (Excalibur stable line), §D (single `engine` module, pointer input, `touch-action`).

## Acceptance Criteria

1) Rollup above is satisfied at closure.


## Notes

**2026-03-28T04:05:58Z**

Epic rollup satisfied: all five children (2gp-xfhi, 2gp-435f, 2gp-dcs7, 2gp-kz6m, 2gp-swz6) closed. No additional implementation. npm run build and npm test verified green before persist.
