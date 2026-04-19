---
id: 2gp-bdeg
status: open
deps: [2gp-myah, 2gp-veak]
links: []
created: 2026-04-19T03:02:23Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-czux
---
# Sprite-generation wave 2 — generators, core, QA analyze-bridge implementation

Convert **generators/fal**, **generators/mock**, **generators/types**, **manifest**, **prompt**, **sheet-layout**, **sprite-ref**, **qa/analyze-bridge** (implementation + **integration**, **spawn**, and other co-located tests) to **.ts**. Depends on **`2gp-veak`** (A1) for **png-analyze** entrypoint paths and **`2gp-myah`** (A4) for wave-1 modules. Fix imports for ESM resolution under **`2gp-gwjc`** (**tools/tsconfig**, documented runner).

**After `2gp-veak`:** no revived references to removed **png-analyze\*.mjs** entrypoints; bridge and tests are **.ts** with argv expectations consistent with **`2gp-veak`**.

## Acceptance Criteria

Listed wave-2 paths are **.ts**; **npm test** passes repo-wide (or at minimum no regressions in **tools/sprite-generation** tests); no dangling **.mjs** imports within the wave-2 tree.

