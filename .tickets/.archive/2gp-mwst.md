---
id: 2gp-mwst
status: closed
deps: [2gp-98mn]
links: []
created: 2026-03-28T16:21:10Z
type: task
priority: 1
assignee: user.email
parent: 2gp-3y3y
---
# sprite-gen: dpad preset

Add **`tools/sprite-generation/presets/dpad.mjs`**: **`createPreset(opts)`** returns the full config object consumed by **`runPipeline`** — **`DPAD_FRAMES`**, **`outBase`**, **`tileSize`**, **`SHEET_CROPS`**, fal extras, QA sprite dimensions, **`spriteRef`** paths, **`promptTemplate`** (style/composition), **`generatorConfig`**, **`postprocessSteps`**, optional **`sheet`** block.

**`recipeId`:** Preset supplies or derives **`recipeId`** / recipe metadata so **2gp-y83w** can stamp **`manifest.json`** consistently (include a **version suffix** when preset output semantics change).

Contract aligns with the plan’s **Preset contract** section ( **`id`**, **`frames[]`**, **`outBase`**, **`naming`**, **`tileSize`**, **`promptTemplate`**, **`generatorConfig`**, **`qa`**, optional **`sheet`**, **`spriteRef`**).

## Acceptance criteria

- [x] Module header documents the **preset contract** and points to **`pipeline.mjs`** for orchestration.
- [x] **Preset is the single source of truth** for dpad constants (`DPAD_FRAMES`, paths, sizes, `spriteRef`, etc.). **`dpad-workflow.mjs`** may still contain duplicates until **2gp-b4lm** — **deletion of duplicated constants from the monolith** is verified under **2gp-b4lm** (and parity under **2gp-f7b6**), not as a hard gate on closing **2gp-mwst** before **2gp-b4lm** lands.
- [x] **`spriteRef`** matches **`individual-tiles`** (or documented grid variant) and **`src/art/atlasTypes.ts`** expectations per **2gp-s1lz**.
- [x] If **2gp-98mn** did not add an automated **sheet + crop** test, this ticket’s tests or notes **close that gap** (smoke run or explicit justification).

## Notes

**2026-03-28T16:37:20Z**

Implemented tools/sprite-generation/presets/dpad.mjs: createPreset(opts), exports DPAD_FRAMES/SHEET_CROPS/TILE_SIZE/fal extras/QA, recipeIdForDpad via buildRecipeId. frameKeyRect spriteRef default art/dpad + dpad.png. pipeline.test uses createPreset; presets/dpad.test covers contract + recipe slugs. dpad-workflow.mjs unchanged per ticket (2gp-b4lm rewire).
