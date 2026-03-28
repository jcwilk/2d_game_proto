---
id: 2gp-hbb5
status: closed
deps: []
links: []
created: 2026-03-28T03:23:56Z
type: epic
priority: 2
assignee: user.email
---
# Epic: Asset loading & atlas

Loader → ImageSource → JSON → SpriteSheet/Sprite; grid vs packed; manifest.

## Design

Child tickets split grid vs packed paths; **Expose stable frame key** (`2gp-x4js`) depends on atlas JSON + types tickets.

## Epic rollup (definition of done)

**Close this epic** only when no child ticket with `parent: 2gp-hbb5` remains **open**. **Normative:** **`.cursor/plans/project-implementation-deep-dive.md`** §C (`Loader` → `ImageSource` → JSON `Resource` → `SpriteSheet` / `Sprite`).

## Acceptance Criteria

1) Rollup above is satisfied at closure.


## Notes

**2026-03-28T04:10:09Z**

Epic rollup: all six children closed (lo9d, kcik, 1vxu, x4js, xjhm, ku5j). Code path: DefaultLoader + Resource JSON + ImageSource → grid/packed SpriteSheet + frame lookup per plan §C.
