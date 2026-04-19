---
id: 2gp-9ykt
status: open
deps: [2gp-bdeg]
links: []
created: 2026-04-19T03:02:23Z
type: feature
priority: 1
assignee: user.email
parent: 2gp-czux
---
# Sprite-generation wave 3 — pipeline and pipeline-stages

Convert **pipeline.mjs**, **pipeline-stages.mjs**, **pipeline.test.mjs**, **pipeline-stages.test.mjs**, **postprocess/chroma-key.test.mjs** (imports **pipeline-stages**), and any other tests that import these modules, to **.ts**. Strictly after **`2gp-bdeg` (B5)**.

Top-level CLIs (**generate-spritesheet**, **dpad-workflow**) remain **.mjs** until **`2gp-e5lc`**; this ticket only needs a consistent **.ts** pipeline graph and passing tests under **`2gp-gwjc`** typecheck + Vitest. Update stale **`import('./pipeline.mjs')`-style** references in migrated neighbors (e.g. **preset-contract**, **info**) when those files are already **.ts** in earlier waves.

## Acceptance Criteria

Pipeline sources and listed tests are **.ts**; **npm test** passes; **npm run typecheck** (including tools program from **`2gp-gwjc`**) passes.

