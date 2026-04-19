---
id: 2gp-myah
status: open
deps: [2gp-gwjc]
links: []
created: 2026-04-19T03:02:23Z
type: task
priority: 1
assignee: user.email
parent: 2gp-czux
---
# Sprite-generation wave 1 — logging, contracts, rename, info, postprocess, gameDimensions

Convert a coherent bottom slice: logging, preset-contract, rename-dry-run (+test), info (+test), postprocess/png-region, postprocess/chroma-key (+tests), gameDimensions.mjs → .ts. Keep internal imports consistent within the slice (no half-migrated ESM extension mix). **gameDimensions** deduplication with **src/dimensions** is explicitly deferred to stitch **`2gp-y4cn` (S1)**.

**Ordering:** land **`2gp-gwjc`** before renaming tests so **vitest.config.ts** already includes **tools/\*\*/\*.test.ts** when **.test.ts** files first appear.

## Acceptance Criteria

All listed modules and their tests run as **.ts**; **npm test** discovers renamed tests; no dangling **.mjs** imports within this slice.

